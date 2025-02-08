// backend/src/services/tts.service.ts
import * as azureSpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import {
  Recognizer,
  SessionEventArgs,
  SpeechRecognitionCanceledEventArgs,
  SpeechRecognitionEventArgs,
} from 'microsoft-cognitiveservices-speech-sdk';
import { CloudDisplayEventMessage } from '../types/websocket.types';

interface TranscriptionServiceConfig {
  azureSpeechKey: string;
  azureSpeechRegion: string;
  speechRecognitionLanguage?: string;
}

export class TranscriptionService {
  private speechConfig: azureSpeechSDK.SpeechConfig;

  constructor(config: TranscriptionServiceConfig) {
    if (!config.azureSpeechKey || !config.azureSpeechRegion) {
      throw new Error('Azure Speech key and region are required for TranscriptionService.');
    }
    this.speechConfig = azureSpeechSDK.SpeechConfig.fromSubscription(
      config.azureSpeechKey,
      config.azureSpeechRegion
    );
    this.speechConfig.speechRecognitionLanguage = config.speechRecognitionLanguage || 'en-US';
  }

  /**
   * Starts transcription for a session. Internally creates a pushStream and a recognizer.
   * @param sessionId A unique session ID.
   * @param sendMessage Callback to send display messages back to the client.
   * @returns An object containing both the recognizer and the pushStream.
   */
  startTranscription(
    sessionId: string,
    sendMessage: (message: CloudDisplayEventMessage) => void
  ): { recognizer: azureSpeechSDK.SpeechRecognizer; pushStream: azureSpeechSDK.PushAudioInputStream } {
    // Create a new pushStream for this session.
    const pushStream = azureSpeechSDK.AudioInputStream.createPushStream();
    const audioConfig = azureSpeechSDK.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new azureSpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);

    console.log(`[Session ${sessionId}] TTS: Starting transcription service`);

    // Recognized event fires when a final recognition result is received.
    recognizer.recognized = (sender, event: SpeechRecognitionEventArgs) => {
      if (event.result.text) {
        const text = event.result.text;
        console.log(`[Session ${sessionId}] TTS Recognized:`, text);
        const displayMessage: CloudDisplayEventMessage = {
          type: 'display_event',
          sessionId,
          layout: { layoutType: 'text_line', text: `${text}` },
        };
        sendMessage(displayMessage);
      } else {
        console.log(`[Session ${sessionId}] TTS: No speech detected`);
      }
    };

    // Optionally, you can handle intermediate (WIP) results:
    recognizer.recognizing = (sender, event: SpeechRecognitionEventArgs) => {
      const text = event.result.text;
      console.log(`[Session ${sessionId}] TTS Recognizing (WIP):`, text);
      // Uncomment below if you wish to send intermediate results:
      const displayMessage: CloudDisplayEventMessage = {
        type: 'display_event',
        sessionId,
        layout: { layoutType: 'text_line', text: `${text}` },
      };
      sendMessage(displayMessage);
    };

    recognizer.canceled = (sender, event: SpeechRecognitionCanceledEventArgs) => {
      console.error(`[Session ${sessionId}] TTS Recognition canceled:`, event);
    };

    recognizer.sessionStarted = (sender, event: SessionEventArgs) => {
      console.log(`[Session ${sessionId}] TTS Speech recognition session started`);
    };

    recognizer.sessionStopped = (sender, event: SessionEventArgs) => {
      console.log(`[Session ${sessionId}] TTS Speech recognition session stopped`);
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
        console.log(`[Session ${sessionId}] TTS Continuous recognition started`);
      },
      (err) => {
        console.error(`[Session ${sessionId}] TTS Error starting recognition:`, err);
      }
    );

    return { recognizer, pushStream };
  }
}
