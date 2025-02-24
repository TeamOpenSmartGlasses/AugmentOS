/**
 * 🎮 Event Manager Module
 */
import EventEmitter from 'events';
import type { 
  StreamType, 
  StreamDataTypes,
  TranscriptionData,
  HeadPositionEvent,
  ButtonPressEvent,
  PhoneNotificationEvent,
  WebSocketError,
  AppSettings
} from '@augmentos/types';

/** 🎯 Type-safe event handler function */
type Handler<T> = (data: T) => void;

/** 🔄 System events not tied to streams */
interface SystemEvents {
  'connected': AppSettings | undefined;
  'disconnected': string;
  'error': WebSocketError | Error;
  'settings_update': AppSettings;
}

/** 📡 All possible event types */
type EventType = StreamType | keyof SystemEvents;

/** 📦 Data type for an event */
type EventData<T extends EventType> = T extends StreamType 
  ? StreamDataTypes[T] 
  : T extends keyof SystemEvents 
    ? SystemEvents[T] 
    : never;

export class EventManager {
  private emitter: EventEmitter;
  private handlers: Map<EventType, Set<Handler<unknown>>>;

  constructor(private subscribe: (type: StreamType) => void) {
    this.emitter = new EventEmitter();
    this.handlers = new Map();
  }

  onTranscription(handler: Handler<TranscriptionData>) {
    return this.addHandler('transcription', handler);
  }

  onHeadPosition(handler: Handler<HeadPositionEvent>) {
    return this.addHandler('head_position', handler);
  }

  onButtonPress(handler: Handler<ButtonPressEvent>) {
    return this.addHandler('button_press', handler);
  }

  onPhoneNotifications(handler: Handler<PhoneNotificationEvent>) {
    return this.addHandler('phone_notification', handler);
  }

  onConnected(handler: Handler<SystemEvents['connected']>) {
    this.emitter.on('connected', handler);
    return () => this.emitter.off('connected', handler);
  }

  onDisconnected(handler: Handler<SystemEvents['disconnected']>) {
    this.emitter.on('disconnected', handler);
    return () => this.emitter.off('disconnected', handler);
  }

  onError(handler: Handler<SystemEvents['error']>) {
    this.emitter.on('error', handler);
    return () => this.emitter.off('error', handler);
  }

  onSettingsUpdate(handler: Handler<SystemEvents['settings_update']>) {
    this.emitter.on('settings_update', handler);
    return () => this.emitter.off('settings_update', handler);
  }

  /**
   * ➕ Add an event handler and subscribe if needed
   */
  private addHandler<T extends StreamType>(
    type: T, 
    handler: Handler<StreamDataTypes[T]>
  ): () => void {
    const handlers = this.handlers.get(type) ?? new Set();
    
    if (handlers.size === 0) {
      this.handlers.set(type, handlers);
      this.subscribe(type);
    }

    handlers.add(handler as Handler<unknown>);
    return () => this.removeHandler(type, handler);
  }

  /**
   * ➖ Remove an event handler
   */
  private removeHandler<T extends StreamType>(
    type: T, 
    handler: Handler<StreamDataTypes[T]>
  ): void {
    const handlers = this.handlers.get(type);
    if (!handlers) return;

    handlers.delete(handler as Handler<unknown>);
    if (handlers.size === 0) {
      this.handlers.delete(type);
    }
  }

  /**
   * 📡 Emit an event to all registered handlers
   */
  emit<T extends EventType>(event: T, data: EventData<T>): void {
    // Emit to EventEmitter handlers
    this.emitter.emit(event, data);

    // Emit to stream handlers if applicable
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        (handler as Handler<EventData<T>>)(data);
      });
    }
  }
}