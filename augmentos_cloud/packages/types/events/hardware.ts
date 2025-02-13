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
