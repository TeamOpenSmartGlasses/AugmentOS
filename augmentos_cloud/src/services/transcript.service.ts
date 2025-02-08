import * as azureSpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import {
  Recognizer,
  SessionEventArgs,
  SpeechRecognitionCanceledEventArgs,
  SpeechRecognitionEventArgs,
} from 'microsoft-cognitiveservices-speech-sdk';
import { broadcastToTpa } from '../tpa-websocket';

const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
if (!AZURE_SPEECH_REGION || !AZURE_SPEECH_KEY) {
  throw new Error('Please provide Azure Speech subscription key and region');
}

// TranscriptionResult interface for both interim and final results
// interface TranscriptionResult {
//   text: string;
//   startTime: number;          // Milliseconds from session start
//   endTime: number;           
//   confidence?: number;        // Optional as not all results have confidence
//   speakerId?: string;        // If speaker diarization is enabled
//   wordTimings?: Array<{      // Optional as not all results have word timings
//     word: string;
//     startTime: number;
//     endTime: number;
//   }>;
//   sessionId: string;
//   languageDetected?: string;
// }

// // Interim-specific data
// export interface InterimTranscriptionResult extends TranscriptionResult {
//   isFinal: false;
//   revisionCount: number;     // How many times this segment was revised
//   previousVersions: Array<{
//     text: string;
//     timestamp: number;
//   }>;
// }

// // Final-specific data
// export interface FinalTranscriptionResult extends TranscriptionResult {
//   isFinal: true;
//   duration: number;          // Total segment duration
//   punctuated: boolean;       // Whether automatic punctuation was applied
//   translations?: Record<string, string>; // Key is language code
// }

export interface TranscriptionBase {
  text: string;
  startTime: number;        // Relative to session start
  endTime: number;
  speakerId?: string;       // For speaker diarization
  confidence?: number;
}

export interface InterimTranscriptionResult extends TranscriptionBase {
  isFinal: false;
}

export interface FinalTranscriptionResult extends TranscriptionBase {
  isFinal: true;
  duration: number;         // Total duration of the segment
}

// The format that gets sent to TPAs
export interface TranscriptionStreamData {
  type: 'interim' | 'final';
  text: string;
  startTime: number;
  endTime: number;
  speakerId?: string;
  confidence?: number;
  duration?: number;        // Only present for final results
  isFinal: boolean;
}

interface TranscriptionServiceConfig {
  speechRecognitionLanguage?: string;
  enableProfanityFilter?: boolean;
  enablePunctuation?: boolean;
}

export class TranscriptionService {
  private speechConfig: azureSpeechSDK.SpeechConfig;
  private sessionStartTime = 0;
  private interimVersions: Map<string, Array<{ text: string; timestamp: number }>> = new Map();

  constructor(config: TranscriptionServiceConfig = {}) {
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
      throw new Error('Azure Speech key and region are required for TranscriptionService.');
    }
    
    this.speechConfig = azureSpeechSDK.SpeechConfig.fromSubscription(
      AZURE_SPEECH_KEY,
      AZURE_SPEECH_REGION
    );
    
    this.speechConfig.speechRecognitionLanguage = config.speechRecognitionLanguage || 'en-US';
    
    if (config.enableProfanityFilter) {
      this.speechConfig.setProfanity(azureSpeechSDK.ProfanityOption.Removed);
    }

    // Set output format for detailed results
    this.speechConfig.outputFormat = azureSpeechSDK.OutputFormat.Detailed;
  }

  private calculateRelativeTime(absoluteTime: number): number {
    return absoluteTime - this.sessionStartTime;
  }

  private getInterimVersions(resultId: string): Array<{ text: string; timestamp: number }> {
    return this.interimVersions.get(resultId) || [];
  }

  startTranscription(
    sessionId: string,
    onInterimResult: (result: InterimTranscriptionResult) => void,
    onFinalResult: (result: FinalTranscriptionResult) => void
  ): { recognizer: azureSpeechSDK.SpeechRecognizer; pushStream: azureSpeechSDK.PushAudioInputStream } {
    this.sessionStartTime = Date.now();
    const pushStream = azureSpeechSDK.AudioInputStream.createPushStream();
    const audioConfig = azureSpeechSDK.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new azureSpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);

    recognizer.recognizing = (_sender: any, event: any) => {
      const result: InterimTranscriptionResult = {
        text: event.result.text,
        startTime: this.calculateRelativeTime(event.result.offset),
        endTime: this.calculateRelativeTime(event.result.offset + event.result.duration),
        isFinal: false,
        speakerId: event.result.speakerId,
        confidence: event.result.confidence
      };

      // Send to user display
      onInterimResult(result);

      // Broadcast to subscribed TPAs
      broadcastToTpa(sessionId, 'transcription', {
        type: 'interim',
        ...result
      });
    };

    recognizer.recognized = (_sender: any, event: any) => {
      if (event.result.text) {
        const result: FinalTranscriptionResult = {
          text: event.result.text,
          startTime: this.calculateRelativeTime(event.result.offset),
          endTime: this.calculateRelativeTime(event.result.offset + event.result.duration),
          isFinal: true,
          speakerId: event.result.speakerId,
          confidence: event.result.confidence,
          duration: event.result.duration
        };

        // Send to user display
        onFinalResult(result);

        // Broadcast to subscribed TPAs
        broadcastToTpa(sessionId, 'transcription', {
          type: 'final',
          ...result
        });
      }
    };

    recognizer.canceled = (_sender: any, event: SpeechRecognitionCanceledEventArgs) => {
      console.error(`\n[Session ${sessionId}]\nRecognition canceled\n`);
    };

    recognizer.sessionStarted = (_sender: any, _event: SessionEventArgs) => {
      console.log(`\n[Session ${sessionId}]\nRecognition session started`);
    };

    recognizer.sessionStopped = (_sender: any, _event: SessionEventArgs) => {
      console.log(`\n[Session ${sessionId}]\nRecognition session stopped\n`);
      // Clean up any remaining interim versions
      this.interimVersions.clear();
    };

    recognizer.startContinuousRecognitionAsync(
      () => console.log(`\n[Session ${sessionId}]\nContinuous recognition started\n`),
      (err) => console.error(`[Session ${sessionId}] Error starting recognition:`, err)
    );

    return { recognizer, pushStream };
  }
}