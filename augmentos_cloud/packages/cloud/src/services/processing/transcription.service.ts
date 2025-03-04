// augmentos_cloud/packages/cloud/src/services/processing/transcription.service.ts

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
import { StreamType, TranscriptionData, UserSession } from '@augmentos/sdk';
import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '@augmentos/config';
import webSocketService from '../core/websocket.service';

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
      isTranscribing: userSession.isTranscribing
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
      console.log('🚀 Starting continuous recognition...\n');
      recognizer.startTranscribingAsync(
        () => {
          console.log('✅ Recognition started successfully');
          userSession.isTranscribing = true;
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

  gracefullyStopTranscription(userSession: UserSession) {
    console.log(`\n🛑 [Session ${userSession.sessionId}] Gracefully stopping transcription...`);

    if (!userSession.recognizer || !userSession.pushStream) {
      console.log('ℹ️ No active transcription to stop');
      return;
    }

    // Keep accepting audio for a brief period to ensure we process everything
    const GRACE_PERIOD_MS = 2000; // 2 seconds grace period

    console.log(`Waiting ${GRACE_PERIOD_MS}ms for buffered audio to process...`);

    // Mark that we're in graceful shutdown
    userSession.isGracefullyClosing = true;

    setTimeout(() => {
      // Only stop if we haven't received new audio during grace period
      if (userSession.isGracefullyClosing) {
        console.log('Grace period ended, stopping transcription');
        userSession.isTranscribing = false;
        this.stopTranscription(userSession);
      } else {
        console.log('Received new audio during grace period, keeping transcription active');
      }
    }, GRACE_PERIOD_MS);
  }

  handlePushStreamError(userSession: UserSession, error: any) {
    console.log('🔄 Handling push stream error...');

    // Check if it's a fatal error or if we can recover
    const isFatalError = error.message?.includes('closed') ||
      error.message?.includes('destroyed');

    if (isFatalError) {
      console.log('❌ Fatal push stream error, stopping transcription');
      userSession.isTranscribing = false;
      this.stopTranscription(userSession);
    } else {
      console.log('⚠️ Non-fatal push stream error, attempting to recover');
      // Try to restart the push stream
      try {
        this.restartPushStream(userSession);
      } catch (restartError) {
        console.error('❌ Failed to restart push stream:', restartError);
        userSession.isTranscribing = false;
        this.stopTranscription(userSession);
      }
    }
  }

  private async restartPushStream(userSession: UserSession) {
    console.log('🔄 Restarting push stream...');

    // Clean up old push stream
    if (userSession.pushStream) {
      try {
        userSession.pushStream.close();
      } catch (error) {
        console.warn('⚠️ Error closing old push stream:', error);
      }
    }

    // Create new push stream
    const { recognizer, pushStream } = await this.startTranscription(userSession);
    userSession.recognizer = recognizer;
    userSession.pushStream = pushStream;

    console.log('✅ Push stream restarted successfully');
  }

  private setupRecognitionHandlers(userSession: UserSession, recognizer: ConversationTranscriber) {
    recognizer.transcribing = (_sender: any, event: ConversationTranscriptionEventArgs) => {
      if (!event.result.text) return;
      console.log(`🎤 [Interim][${userSession.userId}]: ${event.result.text}`);

      const transcriptionData: TranscriptionData = {
        // type: 'transcription-interim',
        type: StreamType.TRANSCRIPTION,
        text: event.result.text,
        startTime: this.calculateRelativeTime(event.result.offset),
        endTime: this.calculateRelativeTime(event.result.offset + event.result.duration),
        isFinal: false,
        speakerId: event.result.speakerId,
      };

      this.broadcastTranscriptionResult(userSession, transcriptionData);

      // TODO(isaiah): For now we're only saving final transcriptions to the transcript history.
      this.updateTranscriptHistory(userSession, event, false);
    };

    recognizer.transcribed = (_sender: any, event: ConversationTranscriptionEventArgs) => {
      if (!event.result.text) return;
      console.log(`✅ [Final][${userSession.userId}] ${event.result.text}`);

      const result: TranscriptionData = {
        // type: 'transcription-final',
        type: StreamType.TRANSCRIPTION,
        isFinal: true,
        text: event.result.text,
        startTime: this.calculateRelativeTime(event.result.offset),
        endTime: this.calculateRelativeTime(event.result.offset + event.result.duration),
        speakerId: event.result.speakerId,
        duration: event.result.duration
      };

      this.broadcastTranscriptionResult(userSession, result);
      this.updateTranscriptHistory(userSession, event, true);
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

  private updateTranscriptHistory(userSession: UserSession, event: ConversationTranscriptionEventArgs, isFinal: boolean) {    
    const segments = userSession.transcript.segments;
    
    // Check if the last segment is an interim transcript
    const hasInterimLast = segments.length > 0 && !segments[segments.length - 1].isFinal;
    
    if (isFinal) {
      // For final transcripts:
      
      // If the last segment is interim, remove it (more efficient than filtering the entire array)
      if (hasInterimLast) {
        segments.pop();
      }
      
      // Add the new final segment
      segments.push({
        resultId: event.result.resultId,
        speakerId: event.result.speakerId,
        text: event.result.text,
        timestamp: new Date(),
        isFinal: true
      });
      
    } else {
      // For interim transcripts:
      
      // If the last segment is already interim, update it
      if (hasInterimLast) {
        segments[segments.length - 1] = {
          resultId: event.result.resultId,
          speakerId: event.result.speakerId,
          text: event.result.text,
          timestamp: new Date(),
          isFinal: false
        };
      } else {
        // Add a new interim segment
        segments.push({
          resultId: event.result.resultId,
          speakerId: event.result.speakerId,
          text: event.result.text,
          timestamp: new Date(),
          isFinal: false
        });
      }
    }
  }

  // Inside TranscriptionService class
  private broadcastTranscriptionResult(userSession: UserSession, transcriptionData: TranscriptionData) {
    console.log('📢 Broadcasting transcription result');

    try {
      // Use the webSocketService's broadcast method
      webSocketService.broadcastToTpa(
        userSession.sessionId,
        StreamType.TRANSCRIPTION,
        transcriptionData
        // 'transcription',
      );
    } catch (error) {
      console.error('❌ Error broadcasting transcription:', error);
      console.log('Failed to broadcast:', {
        sessionId: userSession.sessionId,
        resultType: transcriptionData.type,
        text: transcriptionData.text?.slice(0, 50) + '...'  // Log first 50 chars
      });
    }
  }

}

export const transcriptionService = new TranscriptionService();
export default transcriptionService;