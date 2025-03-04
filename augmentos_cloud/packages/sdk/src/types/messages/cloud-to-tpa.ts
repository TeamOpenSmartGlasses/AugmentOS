// src/messages/cloud-to-tpa.ts

import { BaseMessage } from './base';
import { CloudToTpaMessageType } from '../message-types';
import { StreamType } from '../streams';
import { AppSettings } from '../models';
import { LocationUpdate } from './glasses-to-cloud';

//===========================================================
// Responses
//===========================================================

/**
 * Connection acknowledgment to TPA
 */
export interface TpaConnectionAck extends BaseMessage {
  type: CloudToTpaMessageType.CONNECTION_ACK;
  settings?: AppSettings;
}

/**
 * Connection error to TPA
 */
export interface TpaConnectionError extends BaseMessage {
  type: CloudToTpaMessageType.CONNECTION_ERROR;
  message: string;
  code?: string;
}

//===========================================================
// Updates
//===========================================================

/**
 * App stopped notification to TPA
 */
export interface AppStopped extends BaseMessage {
  type: CloudToTpaMessageType.APP_STOPPED;
  reason: "user_disabled" | "system_stop" | "error";
  message?: string;
}

/**
 * Settings update to TPA
 */
export interface SettingsUpdate extends BaseMessage {
  type: CloudToTpaMessageType.SETTINGS_UPDATE;
  packageName: string;
  settings: AppSettings;
}

//===========================================================
// Audio-related data types
//===========================================================
/**
 * Transcription data
 */
export interface TranscriptionData extends BaseMessage {
  type: StreamType.TRANSCRIPTION;
  text: string;  // The transcribed text
  isFinal: boolean;  // Whether this is a final transcription
  language?: string;  // Detected language code
  startTime: number;  // Start time in milliseconds
  endTime: number;  // End time in milliseconds
  speakerId?: string;  // ID of the speaker if available
  duration?: number;  // Audio duration in milliseconds
}

/**
 * Translation data
 */
export interface TranslationData {
  type: StreamType.TRANSLATION;
  sourceText: string;  // Original text
  translatedText: string;  // Translated text
  sourceLang: string;  // Source language code
  targetLang: string;  // Target language code
  confidence: number;  // Translation confidence (0-1)
}

/**
 * Audio chunk data
 */
export interface AudioChunk extends BaseMessage {
  type: StreamType.AUDIO_CHUNK;
  arrayBuffer: ArrayBufferLike;  // The audio data
  sampleRate?: number;  // Audio sample rate (e.g., 16000 Hz)
}

//===========================================================
// Stream data
//===========================================================

/**
 * Stream data to TPA
 */
export interface DataStream extends BaseMessage {
  type: CloudToTpaMessageType.DATA_STREAM;
  streamType: StreamType;
  data: unknown; // Type depends on the streamType
}

/**
 * Union type for all messages from cloud to TPAs
 */
export type CloudToTpaMessage =
  | TpaConnectionAck
  | TpaConnectionError
  | AppStopped
  | SettingsUpdate
  | TranscriptionData
  | TranslationData
  | AudioChunk
  | LocationUpdate
  | DataStream;

//===========================================================
// Type guards
//===========================================================

export function isTpaConnectionAck(message: CloudToTpaMessage): message is TpaConnectionAck {
  return message.type === CloudToTpaMessageType.CONNECTION_ACK;
}

export function isTpaConnectionError(message: CloudToTpaMessage): message is TpaConnectionError {
  return message.type === CloudToTpaMessageType.CONNECTION_ERROR;
}

export function isAppStopped(message: CloudToTpaMessage): message is AppStopped {
  return message.type === CloudToTpaMessageType.APP_STOPPED;
}

export function isSettingsUpdate(message: CloudToTpaMessage): message is SettingsUpdate {
  return message.type === CloudToTpaMessageType.SETTINGS_UPDATE;
}

export function isDataStream(message: CloudToTpaMessage): message is DataStream {
  return message.type === CloudToTpaMessageType.DATA_STREAM || message.type === StreamType.AUDIO_CHUNK;
}

export function isAudioChunk(message: CloudToTpaMessage): message is AudioChunk {
  return message.type === StreamType.AUDIO_CHUNK;
}