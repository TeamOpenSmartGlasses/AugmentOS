// src/events/index.ts
import EventEmitter from 'events';
import type { StreamType } from '@augmentos/types';

type Handler<T = any> = (data: T) => void;

export class EventManager {
  private emitter: EventEmitter;
  private handlers: Map<string, Set<Handler>>;

  constructor(private subscribe: (type: StreamType) => void) {
    this.emitter = new EventEmitter();
    this.handlers = new Map();
  }

  onTranscription(handler: Handler) {
    this.addHandler('transcription', handler);
    return () => this.removeHandler('transcription', handler);
  }

  onHeadPosition(handler: Handler) {
    this.addHandler('head_position', handler);
    return () => this.removeHandler('head_position', handler);
  }

  onButtonPress(handler: Handler) {
    this.addHandler('button_press', handler);
    return () => this.removeHandler('button_press', handler);
  }

  onPhoneNotifications(handler: Handler) {
    this.addHandler('phone_notifications', handler);
    return () => this.removeHandler('phone_notifications', handler);
  }

  onConnected(handler: Handler) {
    this.emitter.on('connected', handler);
    return () => this.emitter.off('connected', handler);
  }

  onDisconnected(handler: Handler) {
    this.emitter.on('disconnected', handler);
    return () => this.emitter.off('disconnected', handler);
  }

  onError(handler: Handler) {
    this.emitter.on('error', handler);
    return () => this.emitter.off('error', handler);
  }

  private addHandler(type: StreamType, handler: Handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
      this.subscribe(type);
    }
    this.handlers.get(type)!.add(handler);
  }

  private removeHandler(type: StreamType, handler: Handler) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  emit(event: string, data: any) {
    this.emitter.emit(event, data);
    if (this.handlers.has(event)) {
      this.handlers.get(event)!.forEach(handler => handler(data));
    }
  }
}
