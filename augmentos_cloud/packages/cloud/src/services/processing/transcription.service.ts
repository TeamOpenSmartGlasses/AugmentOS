import * as azureSpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import {
  SessionEventArgs,
  SpeechRecognitionCanceledEventArgs,
  ProfanityOption,
  OutputFormat,
  AudioInputStream,
  AudioConfig,
  ConversationTranscriber,
  ConversationTranscriptionEventArgs
} from 'microsoft-cognitiveservices-speech-sdk';
import { CloudDataStreamMessage, TranscriptionData, UserSession } from '@augmentos/types';
import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '@augmentos/types/config/cloud.env';
import subscriptionService from '../core/subscription.service';

export interface InterimTranscriptionResult extends TranscriptionData {
  type: 'transcription-interim';
  isFinal: false;
}

export interface FinalTranscriptionResult extends TranscriptionData {
  type: 'transcription-final',
  isFinal: true;
  duration: number;
}

export class TranscriptionService {
  private speechConfig: azureSpeechSDK.SpeechConfig;
  private sessionStartTime = 0;

  constructor(config: {
    speechRecognitionLanguage?: string;
    enableProfanityFilter?: boolean;
  } = {}) {
    console.log('🎤 Initializing TranscriptionService...');
    
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
      console.error('❌ Missing Azure credentials!');
      throw new Error('Azure Speech key and region are required');
    }

    this.speechConfig = azureSpeechSDK.SpeechConfig.fromSubscription(
      AZURE_SPEECH_KEY,
      AZURE_SPEECH_REGION
    );

    this.speechConfig.speechRecognitionLanguage = config.speechRecognitionLanguage || 'en-US';
    this.speechConfig.setProfanity(ProfanityOption.Raw);
    this.speechConfig.outputFormat = OutputFormat.Simple;
    
    console.log('✅ TranscriptionService initialized with config:', {
      language: this.speechConfig.speechRecognitionLanguage,
      region: AZURE_SPEECH_REGION,
      format: 'Simple'
    });
  }

  startTranscription(userSession: UserSession) {
    console.log(`\n🎙️ [Session ${userSession.sessionId}] Starting transcription...`);
    console.log('Current session state:', {
      hasRecognizer: !!userSession.recognizer,
      hasPushStream: !!userSession.pushStream,
      isTranscribing: userSession.isTranscribing,
      bufferedAudioChunks: userSession.bufferedAudio.length
    });

    if (userSession.recognizer && userSession.pushStream) {
      console.log('⚠️ Transcription already active, reusing existing resources');
      return { recognizer: userSession.recognizer, pushStream: userSession.pushStream };
    }

    this.sessionStartTime = Date.now();

    try {
      console.log('🔄 Creating new transcription resources...');
      const pushStream = AudioInputStream.createPushStream();
      const audioConfig = AudioConfig.fromStreamInput(pushStream);
      const recognizer = new ConversationTranscriber(this.speechConfig, audioConfig);

      userSession.pushStream = pushStream;
      userSession.recognizer = recognizer;
      
      console.log('✅ Created new recognizer and push stream');

      // Set up recognition handlers
      this.setupRecognitionHandlers(userSession, recognizer);

      // Start recognition
      console.log('🚀 Starting continuous recognition...');
      recognizer.startTranscribingAsync(
        () => {
          console.log('✅ Recognition started successfully');
          userSession.isTranscribing = true;
          
          // Process buffered audio
          if (userSession.bufferedAudio.length > 0) {
            console.log(`📦 Processing ${userSession.bufferedAudio.length} buffered audio chunks`);
            userSession.bufferedAudio.forEach((chunk, index) => {
              try {
                pushStream.write(chunk);
                console.log(`✅ Processed buffered chunk ${index + 1}/${userSession.bufferedAudio.length}`);
              } catch (error) {
                console.error(`❌ Error processing buffered chunk ${index + 1}:`, error);
              }
            });
            userSession.bufferedAudio = [];
          }
        },
        (error) => {
          console.error('❌ Failed to start recognition:', error);
          this.cleanupTranscriptionResources(userSession);
        }
      );

      return { recognizer, pushStream };
    } catch (error) {
      console.error('❌ Error creating transcription:', error);
      this.cleanupTranscriptionResources(userSession);
      throw error;
    }
  }

  private setupRecognitionHandlers(userSession: UserSession, recognizer: ConversationTranscriber) {
    recognizer.transcribing = (_sender: any, event: ConversationTranscriptionEventArgs) => {
      if (!event.result.text) return;
      console.log(`🎤 [Interim] ${event.result.text}`);
      
      const result: InterimTranscriptionResult = {
        type: 'transcription-interim',
        text: event.result.text,
        startTime: this.calculateRelativeTime(event.result.offset),
        endTime: this.calculateRelativeTime(event.result.offset + event.result.duration),
        isFinal: false,
        speakerId: event.result.speakerId,
      };

      this.broadcastTranscriptionResult(userSession, result);
      this.updateTranscriptHistory(userSession, event);
    };

    recognizer.transcribed = (_sender: any, event: ConversationTranscriptionEventArgs) => {
      if (!event.result.text) return;
      console.log(`✅ [Final] ${event.result.text}`);

      const result: FinalTranscriptionResult = {
        type: 'transcription-final',
        text: event.result.text,
        startTime: this.calculateRelativeTime(event.result.offset),
        endTime: this.calculateRelativeTime(event.result.offset + event.result.duration),
        isFinal: true,
        speakerId: event.result.speakerId,
        duration: event.result.duration
      };

      this.broadcastTranscriptionResult(userSession, result);
      this.updateTranscriptHistory(userSession, event);
    };

    recognizer.canceled = (_sender: any, event: SpeechRecognitionCanceledEventArgs) => {
      console.error('❌ Recognition canceled:', {
        reason: event.reason,
        errorCode: event.errorCode,
        errorDetails: event.errorDetails
      });
      this.cleanupTranscriptionResources(userSession);
    };

    recognizer.sessionStarted = (_sender: any, _event: SessionEventArgs) => {
      console.log('📢 Recognition session started');
    };

    recognizer.sessionStopped = (_sender: any, _event: SessionEventArgs) => {
      console.log('🛑 Recognition session stopped');
    };
  }

  stopTranscription(userSession: UserSession) {
    console.log(`\n🛑 [Session ${userSession.sessionId}] Stopping transcription...`);
    console.log('Current session state:', {
      hasRecognizer: !!userSession.recognizer,
      hasPushStream: !!userSession.pushStream,
      isTranscribing: userSession.isTranscribing
    });

    if (!userSession.recognizer) {
      console.log('ℹ️ No recognizer to stop');
      return;
    }

    try {
      userSession.recognizer.stopTranscribingAsync(
        () => {
          console.log('✅ Recognition stopped successfully');
          this.cleanupTranscriptionResources(userSession);
        },
        (error) => {
          console.error('❌ Error stopping recognition:', error);
          this.cleanupTranscriptionResources(userSession);
        }
      );
    } catch (error) {
      console.error('❌ Error in stopTranscription:', error);
      this.cleanupTranscriptionResources(userSession);
    }
  }

  private cleanupTranscriptionResources(userSession: UserSession) {
    console.log('🧹 Cleaning up transcription resources...');

    if (userSession.pushStream) {
      try {
        userSession.pushStream.close();
        console.log('✅ Closed push stream');
      } catch (error) {
        console.warn('⚠️ Error closing pushStream:', error);
      }
      userSession.pushStream = undefined;
    }

    if (userSession.recognizer) {
      try {
        userSession.recognizer.close();
        console.log('✅ Closed recognizer');
      } catch (error) {
        console.warn('⚠️ Error closing recognizer:', error);
      }
      userSession.recognizer = undefined;
    }

    userSession.isTranscribing = false;
    console.log('✅ Cleanup complete');
  }

  private calculateRelativeTime(absoluteTime: number): number {
    return absoluteTime - this.sessionStartTime;
  }

  private updateTranscriptHistory(userSession: UserSession, event: ConversationTranscriptionEventArgs) {
    console.log('📝 Updating transcript history...');
    let addSegment = false;
    
    if (userSession.transcript.segments.length > 0) {
      const lastSegment = userSession.transcript.segments[userSession.transcript.segments.length - 1];
      if (lastSegment.resultId === event.result.resultId) {
        console.log('🔄 Updating existing segment');
        lastSegment.text = event.result.text;
        lastSegment.timestamp = new Date();
      } else {
        console.log('➕ Adding new segment');
        addSegment = true;
      }
    } else {
      console.log('➕ Adding first segment');
      addSegment = true;
    }

    if (addSegment) {
      userSession.transcript.segments.push({
        resultId: event.result.resultId,
        speakerId: event.result.speakerId,
        text: event.result.text,
        timestamp: new Date(),
      });
    }
  }

  private broadcastTranscriptionResult(userSession: UserSession, results: TranscriptionData) {
    const subscribedApps = subscriptionService.getSubscribedApps(userSession.sessionId, 'transcription');
    console.log(`📢 Broadcasting to ${subscribedApps.length} subscribed apps`);

    for (const packageName of subscribedApps) {
      const appSessionId = `${userSession.sessionId}-${packageName}`;
      const websocket = userSession.appConnections.get(packageName);

      if (websocket?.readyState === WebSocket.OPEN) {
        console.log(`📤 Sending to ${packageName}`);
        const streamMessage: CloudDataStreamMessage = {
          type: 'data_stream',
          sessionId: appSessionId,
          streamType: 'transcription',
          data: results,
          timestamp: new Date()
        };

        websocket.send(JSON.stringify(streamMessage));
      } else {
        console.warn(`⚠️ WebSocket not ready for ${packageName}`);
      }
    }
  }
}

export const transcriptionService = new TranscriptionService();
export default transcriptionService;