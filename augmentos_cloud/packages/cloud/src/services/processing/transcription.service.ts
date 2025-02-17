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
  Recognizer,
  SessionEventArgs,
  SpeechRecognitionCanceledEventArgs,
  SpeechRecognitionEventArgs,
  ProfanityOption,
  OutputFormat,
  AudioInputStream,
  AudioConfig,
  SpeechRecognizer,
  ConversationTranscriber,
  ConversationTranscriptionEventArgs
} from 'microsoft-cognitiveservices-speech-sdk';
// import { AZURE_SPEECH_REGION, AZURE_SPEECH_KEY } from '../../env';
import { TranscriptionData, UserSession } from '@augmentos/types';
import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '@augmentos/types/config/cloud.env';

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
 * Interface defining the public API of the transcription service.
 */
export interface ITranscriptionService {
  startTranscription(
    userSession: UserSession,
    onInterimResult: (result: InterimTranscriptionResult) => void,
    onFinalResult: (result: FinalTranscriptionResult) => void
  ): { 
    recognizer: ConversationTranscriber; 
    pushStream: azureSpeechSDK.PushAudioInputStream;
  };
}

/**
 * Implementation of the transcription service using Azure Speech Services.
 * Design decisions:
 * 1. Push stream model for real-time audio
 * 2. Continuous recognition with separate interim/final handlers
 * 3. Relative timestamps for easier client-side handling
 * 4. Built-in error recovery and session management
 */
export class TranscriptionService implements ITranscriptionService {
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
    
    // if (config.enableProfanityFilter) {
      this.speechConfig.setProfanity(ProfanityOption.Raw);
    // }

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
  startTranscription(
    userSession: UserSession,
    onInterimResult: (result: InterimTranscriptionResult) => void,
    onFinalResult: (result: FinalTranscriptionResult) => void
  ): { recognizer: ConversationTranscriber; pushStream: azureSpeechSDK.PushAudioInputStream } {
    this.sessionStartTime = Date.now();
    const pushStream = AudioInputStream.createPushStream();
    const audioConfig = AudioConfig.fromStreamInput(pushStream);
    // const recognizer = new SpeechRecognizer(this.speechConfig, audioConfig);
    const recognizer = new ConversationTranscriber(this.speechConfig, audioConfig);
    userSession.pushStream = pushStream;
    userSession.recognizer = recognizer;

    // Set up recognition handlers
    this.setupRecognitionHandlers(userSession, onInterimResult, onFinalResult);

    // Start continuous recognition
    recognizer.startTranscribingAsync(
      () => console.log(`[Session ${userSession.userId}] Continuous recognition started`),
      (err) => console.error(`[Session ${userSession.userId}] Error starting recognition:`, err)
    );

    return { recognizer, pushStream };
  }

  private setupRecognitionHandlers(
    userSession: UserSession,
    onInterimResult: (result: InterimTranscriptionResult) => void,
    onFinalResult: (result: FinalTranscriptionResult) => void
  ): void {
    const { recognizer, sessionId } = userSession;
    if (!recognizer) {
      console.error(`[Session ${sessionId}] No recognizer for UserSession`);
      return;
    }

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

      onInterimResult(result);
    };

    // Handle final results
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

      onFinalResult(result);
    };

    // Handle cancellation
    recognizer.canceled = (_sender: any, event: SpeechRecognitionCanceledEventArgs) => {
      console.error(`[Session ${sessionId}] Recognition canceled:`, event);
    };

    // Handle session lifecycle
    recognizer.sessionStarted = (_sender: any, _event: SessionEventArgs) => {
      console.log(`[Session ${sessionId}] Recognition session started`);
    };

    recognizer.sessionStopped = (_sender: any, _event: SessionEventArgs) => {
      console.log(`[Session ${sessionId}] Recognition session stopped`);
    };
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
}

// Create singleton instance
export const transcriptionService = new TranscriptionService();
export default transcriptionService;
