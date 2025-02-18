/**
 * @fileoverview Service for real-time audio transcription using Azure Speech Services.
 * Handles continuous audio stream processing, transcription, and result distribution.
 * 
 * Primary responsibilities:
 * - Real-time audio transcription
 * - Interim and final result handling
 * - Speaker diarization
 * - Stream lifecycle management
 * - Result broadcasting to TPAs
 */

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
import { CloudDataStreamMessage, CloudToTpaMessage, StreamType, TranscriptionData, UserSession } from '@augmentos/types';
import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '@augmentos/types/config/cloud.env';
import subscriptionService from '../core/subscription.service';

/**
 * Interface for interim (in-progress) transcription results.
 */
export interface InterimTranscriptionResult extends TranscriptionData {
  type: 'transcription-interim';
  isFinal: false;
}

/**
 * Interface for final transcription results.
 */
export interface FinalTranscriptionResult extends TranscriptionData {
  type: 'transcription-final',
  isFinal: true;
  duration: number;         // Total duration of the segment
}


/**
 * Configuration options for the transcription service.
 */
export interface TranscriptionServiceConfig {
  speechRecognitionLanguage?: string;
  enableProfanityFilter?: boolean;
  enablePunctuation?: boolean;
}


/**
 * Implementation of the transcription service using Azure Speech Services.
 * Design decisions:
 * 1. Push stream model for real-time audio
 * 2. Continuous recognition with separate interim/final handlers
 * 3. Relative timestamps for easier client-side handling
 * 4. Built-in error recovery and session management
 */
export class TranscriptionService {
  private speechConfig: azureSpeechSDK.SpeechConfig;
  private sessionStartTime = 0;

  /**
   * Creates a new TranscriptionService instance.
   * @param config - Optional configuration parameters
   * @throws Error if Azure credentials are missing
   */
  constructor(config: TranscriptionServiceConfig = {}) {
    //const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
      throw new Error('Azure Speech key and region are required for TranscriptionService.');
    }

    this.speechConfig = azureSpeechSDK.SpeechConfig.fromSubscription(
      AZURE_SPEECH_KEY,
      AZURE_SPEECH_REGION
    );

    // Configure speech recognition settings
    this.speechConfig.speechRecognitionLanguage = config.speechRecognitionLanguage || 'en-US';
    this.speechConfig.setProfanity(ProfanityOption.Raw);

    // Enable detailed output for better result parsing
    this.speechConfig.outputFormat = OutputFormat.Simple;
  }

  /**
   * Starts transcription for a session.
   * @param userSession - Session identifier
   * @param onInterimResult - Callback for interim results
   * @param onFinalResult - Callback for final results
   * @returns Object containing recognizer and push stream
   */
  startTranscription(userSession: UserSession) {
    this.sessionStartTime = Date.now();

    // Clean up any existing streams first
    if (userSession.recognizer) {
      try {
        userSession?.recognizer?.close();
        userSession.recognizer = undefined;
      }
      catch (error) {
        console.error('\n\n🥲 Error closing existing recognizer:', error);
      }
    }

    if (userSession.pushStream) {
      try {
        userSession?.pushStream?.close();
        userSession.pushStream = undefined;
      }
      catch (error) {
        console.error('\n\n🥲 Error closing existing pushStream:', error);
      }
    }

    // Create new streams.
    const pushStream = AudioInputStream.createPushStream();
    const audioConfig = AudioConfig.fromStreamInput(pushStream);
    const recognizer = new ConversationTranscriber(this.speechConfig, audioConfig);

    userSession.pushStream = pushStream;
    userSession.recognizer = recognizer;

    // Set up recognition handlers
    // Handle interim results
    recognizer.transcribing = (_sender: any, event: ConversationTranscriptionEventArgs) => {
      if (!event.result.text) return;
      const result: InterimTranscriptionResult = {
        type: 'transcription-interim',
        text: event.result.text,
        startTime: this.calculateRelativeTime(event.result.offset),
        endTime: this.calculateRelativeTime(event.result.offset + event.result.duration),
        isFinal: false,
        speakerId: event.result.speakerId,
      };
      // onInterimResult(result);
      // Broadcast interim results to TPAs.
      this.broadcastTranscriptionResult(userSession, result);

      // check if the last message is the same resultId, if so, update the text and timestamp.
      let addSegment = false;
      if (userSession.transcript.segments.length > 0) {
        // Update the last segment if it's the same resultId.
        const lastSegment = userSession.transcript.segments[userSession.transcript.segments.length - 1];
        if (lastSegment.resultId === event.result.resultId) {
          lastSegment.text = event.result.text;
          lastSegment.timestamp = new Date();
        } else {
          addSegment = true;
        }
      } else {
        addSegment = true;
      }

      // Add new segment to userSession transcript history.
      if (addSegment) {
        userSession.transcript.segments.push(
          {
            resultId: event.result.resultId,
            speakerId: event.result.speakerId,
            text: event.result.text,
            timestamp: new Date(),
          }
        );
      }
    };

    // Handle final results.
    recognizer.transcribed = (_sender: any, event: ConversationTranscriptionEventArgs) => {
      if (!event.result.text) return;

      const result: FinalTranscriptionResult = {
        type: 'transcription-final',
        text: event.result.text,
        startTime: this.calculateRelativeTime(event.result.offset),
        endTime: this.calculateRelativeTime(event.result.offset + event.result.duration),
        isFinal: true,
        speakerId: event.result.speakerId,
        duration: event.result.duration
      };

      // onFinalResult(result);
      // Broadcast final results to TPAs.
      this.broadcastTranscriptionResult(userSession, result);

      // Add to userSession transcript history.
      userSession.transcript.segments.push(
        {
          resultId: event.result.resultId,
          speakerId: event.result.speakerId,
          text: event.result.text,
          timestamp: new Date(),
        }
      );
    };

    // Handle cancellation
    recognizer.canceled = (_sender: any, event: SpeechRecognitionCanceledEventArgs) => {
      console.error(`[Session ${userSession.sessionId}] Recognition canceled:`, event);
    };

    // Handle session lifecycle
    recognizer.sessionStarted = (_sender: any, _event: SessionEventArgs) => {
      console.log(`[Session ${userSession.sessionId}] Recognition session started`);
    };

    recognizer.sessionStopped = (_sender: any, _event: SessionEventArgs) => {
      console.log(`[Session ${userSession.sessionId}] Recognition session stopped`);
    };

    // Start continuous recognition with error handling
    recognizer.startTranscribingAsync(
      () => {
        console.log(`[Session ${userSession.sessionId}] Continuous recognition started`);
        userSession.pushStream = pushStream;
        userSession.recognizer = recognizer;

        // Process any buffered audio after stream is ready
        if (userSession.bufferedAudio.length > 0) {
          console.log(`Processing ${userSession.bufferedAudio.length} buffered audio chunks`);
          userSession.bufferedAudio.forEach(chunk => {
            try {
              pushStream.write(chunk);
            } catch (error) {
              console.error('Error processing buffered audio:', error);
            }
          });
          userSession.bufferedAudio = [];
        }
      },
      (err) => {
        console.error(`[Session ${userSession.sessionId}] Error starting recognition:`, err);
        // Cleanup on error
        recognizer.close();
        pushStream.close();
        userSession.recognizer = undefined;
        userSession.pushStream = undefined;
      }
    );

    return { recognizer, pushStream };
  }

  /**
   * Stops transcription for a session.
   * @param userSession - Session identifier
   */
  stopTranscription(userSession: UserSession): void {
    if (!userSession.recognizer) {
      console.error(`[Session ${userSession.sessionId}] No recognizer to stop`);
      return;
    }

    userSession.recognizer.stopTranscribingAsync(
      () => {
        userSession.recognizer?.close();
        userSession.pushStream?.close();
        console.log(`[Session ${userSession.sessionId}] Recognition stopped and closed pushStream`);
      },
      (err) => {
        console.error(`[Session ${userSession.sessionId}] Error stopping recognition:`, err);
      }
    );
  }

  /**
   * Calculates time relative to session start.
   * @param absoluteTime - Absolute timestamp
   * @returns Time relative to session start in milliseconds
   * @private
   */
  private calculateRelativeTime(absoluteTime: number): number {
    return absoluteTime - this.sessionStartTime;
  }


  /**
   * Broadcasts transcription results to TPAs.
   * @param userSession - Session identifier
   * @param result - Transcription result
   */
  // private broadcastTranscriptionResult(userSession: UserSession, result: TranscriptionData): void {
  /**
   * 🗣️📣 Broadcasts data to all TPAs subscribed to a specific stream type.
   * @param userSessionId - ID of the user's glasses session
   * @param streamType - Type of data stream
   * @param data - Data to broadcast
   */
  broadcastTranscriptionResult(userSession: UserSession, results: TranscriptionData): void {
    const subscribedApps = subscriptionService.getSubscribedApps(userSession.sessionId, 'transcription');

    for (const packageName of subscribedApps) {
      const appSessionId = `${userSession.sessionId}-${packageName}`;
      const websocket = userSession.appConnections.get(packageName);

      if (websocket && websocket.readyState === WebSocket.OPEN) {
        const streamMessage: CloudDataStreamMessage = {
          type: 'data_stream',
          sessionId: appSessionId,
          streamType: 'transcription',
          data: results,
          timestamp: new Date()
        };

        websocket.send(JSON.stringify(streamMessage));
      }
    }
  }


}

// Create singleton instance
export const transcriptionService = new TranscriptionService();
export default transcriptionService;
