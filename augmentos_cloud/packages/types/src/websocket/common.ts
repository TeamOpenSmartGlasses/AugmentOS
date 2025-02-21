/**
 * 🔌 Core WebSocket Types
 * Base types and interfaces for WebSocket communication in AugmentOS
 */
import type { 
  GlassesConnectionInitMessage, 
  VADStateMessage, 
  PhoneNotificationEvent 
} from "..";
import type { 
  ButtonPressEvent, 
  GlassesBatteryUpdateEvent, 
  GlassesConnectionStateEvent, 
  HeadPositionEvent, 
  LocationUpdateEvent, 
  PhoneBatteryUpdateEvent, 
  TranscriptionData, 
  TranslationData 
} from "../events/hardware";

/** 📨 Base message interface */
export interface WebSocketMessage {
  type: string;
  timestamp?: Date;
  sessionId?: string;
}

// /** 🔄 Map of all supported stream data types */
export interface StreamDataTypes {
  'stop_app': never;  // Control event, no data
  'start_app': never;  // Control event, no data

  "VAD": VADStateMessage;
  
  'button_press': ButtonPressEvent;
  'head_position': HeadPositionEvent;
  'phone_notification': PhoneNotificationEvent;
  'transcription': TranscriptionData;
  'translation': TranslationData;
  'glasses_battery_update': GlassesBatteryUpdateEvent;
  'glasses_connection_state': GlassesConnectionStateEvent;
  'phone_battery_update': PhoneBatteryUpdateEvent;
  'connection_init': GlassesConnectionInitMessage;
  'location_update': LocationUpdateEvent;
  'open_dashboard': never;  // Control event, no data
  'audio_chunk': ArrayBuffer;  // Raw audio data
  'video': ArrayBuffer;  // Raw video data
  'all': never;  // Control type, no data
  '*': never;  // Wildcard type, no data
}

// /** 🎯 Valid stream types that can be subscribed to */
export enum Stream {
  ""
}
export type StreamType = keyof StreamDataTypes;


/** ❌ WebSocket error information */
export interface WebSocketError {
  code: string;
  message: string;
  details?: unknown;
}