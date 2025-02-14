// src/types/events/hardware.ts
import type { WebSocketMessage } from '../websocket/common';

export interface ButtonPressEvent extends WebSocketMessage {
  type: 'button_press';
  buttonId: string;
  pressType: 'short' | 'long';
  timestamp: Date;
}

export interface HeadPositionEvent extends WebSocketMessage {
  type: 'head_position';
  position: 'up' | 'down';
  timestamp: Date;
}

export interface GlassesBatteryUpdateEvent extends WebSocketMessage {
  type: 'glasses_battery_update';
  level: number;  // 0-100
  charging: boolean;
  timeRemaining?: number;  // minutes
  timestamp: Date;
}

export interface PhoneBatteryUpdateEvent extends WebSocketMessage {
  type: 'phone_battery_update';
  level: number;  // 0-100
  charging: boolean;
  timeRemaining?: number;  // minutes
  timestamp: Date;
}

export interface GlassesConnectionStateEvent extends WebSocketMessage {
  type: 'glasses_connection_state';
  modelName: string;
  status: string;
  timestamp: Date;
}

export interface LocationUpdateEvent extends WebSocketMessage {
  type: 'location_update';
  lat: number;
  lng: number;
  timestamp: Date;
}

export type HardwareEvent =
  | ButtonPressEvent
  | HeadPositionEvent
  | GlassesBatteryUpdateEvent
  | PhoneBatteryUpdateEvent
  | GlassesConnectionStateEvent
  | LocationUpdateEvent;


// Processed hardware events.
export interface TranscriptionData {
  type: 'transcription-interim' | 'transcription-final' | 'transcription';
  /** 📝 The transcribed text */
  text: string;
  /** ✅ Whether this is a final transcription */
  isFinal: boolean;
  /** 🌐 Detected language code */
  language?: string;
  
  /** 🕒 Start time of the transcription in milliseconds */
  startTime: number;

  /** 🕒 End time of the transcription in milliseconds */
  endTime: number;

  /** 🎙️ Speaker ID */
  speakerId?: string;

  /** 🔊 Audio duration in milliseconds */
  duration?: number;
}

export interface TranslationData {
  type: 'translation';
  /** 📝 Original text */
  sourceText: string;
  /** 🔄 Translated text */
  translatedText: string;
  /** 🌐 Source language code */
  sourceLang: string;
  /** 🌐 Target language code */
  targetLang: string;
  /** 💯 Translation confidence (0-1) */
  confidence: number;
  timestamp: Date;
}

export type AudioEvent =
  | TranscriptionData
  | TranslationData;