// src/client.ts
import WebSocket from 'ws';
import { EventManager } from './events';
import { LayoutManager } from './layouts';
import type {
  StreamType,
  TpaToCloudMessage,
  CloudToTpaMessage,
  TpaConnectionInitMessage, TpaSubscriptionUpdateMessage
} from '@augmentos/types';

export interface TpaSessionConfig {
  packageName: string;
  apiKey: string;
  serverUrl?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export class TpaSession {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private subscriptions = new Set<StreamType>();

  public readonly events: EventManager;
  public readonly layouts: LayoutManager;

  constructor(private config: TpaSessionConfig) {
    this.config = {
      serverUrl: 'ws://localhost:7002/tpa-ws',
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      ...config
    };

    this.events = new EventManager(this.subscribe.bind(this));
    this.layouts = new LayoutManager(
      config.packageName,
      this.send.bind(this)
    );
  }

  // Direct method interface
  onTranscription(handler: (data: any) => void) {
    return this.events.onTranscription(handler);
  }

  onHeadPosition(handler: (data: any) => void) {
    return this.events.onHeadPosition(handler);
  }

  onButtonPress(handler: (data: any) => void) {
    return this.events.onButtonPress(handler);
  }

  onPhoneNotifications(handler: (data: any) => void) {
    return this.events.onPhoneNotifications(handler);
  }

  // Pub/Sub interface
  subscribe(type: StreamType): void {
    this.subscriptions.add(type);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.updateSubscriptions();
    }
  }

  on(event: string, handler: (data: any) => void) {
    return this.events.onConnected(handler);
  }

  // Connection management
  async connect(sessionId: string): Promise<void> {
    this.sessionId = sessionId;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl as string);

        this.ws.on('open', () => {
          this.sendConnectionInit();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as CloudToTpaMessage;
            this.handleMessage(message);
          } catch (error) {
            this.events.emit('error', new Error('Failed to parse message'));
          }
        });

        this.ws.on('close', () => {
          this.events.emit('disconnected', 'Connection closed');
          this.handleReconnection();
        });

        this.ws.on('error', (error) => {
          this.events.emit('error', error);
        });

        this.events.onConnected(() => resolve());

        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.subscriptions.clear();
  }

  private handleMessage(message: CloudToTpaMessage): void {
    switch (message.type) {
      case 'tpa_connection_ack':
        this.events.emit('connected', message.settings);
        this.updateSubscriptions();
        break;

      case 'tpa_connection_error':
        this.events.emit('error', new Error(message.message));
        break;

      case 'data_stream':
        this.events.emit(message.streamType, message.data);
        break;

      case 'settings_update':
        this.events.emit('settings_update', message.settings);
        break;
    }
  }

  private sendConnectionInit(): void {
    const message: TpaConnectionInitMessage = {
      type: 'tpa_connection_init',
      sessionId: this.sessionId!,
      packageName: this.config.packageName,
      apiKey: this.config.apiKey
    };
    this.send(message);
  }

  private updateSubscriptions(): void {
    const message: TpaSubscriptionUpdateMessage = {
      type: 'subscription_update',
      packageName: this.config.packageName,
      subscriptions: Array.from(this.subscriptions)
    };
    this.send(message);
  }

  private async handleReconnection(): Promise<void> {
    if (!this.config.autoReconnect ||
      !this.sessionId ||
      this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      return;
    }

    const delay = (this.config.reconnectDelay || 1000) * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect(this.sessionId);
      this.reconnectAttempts = 0;
    } catch (error) {
      this.events.emit('error', new Error('Reconnection failed'));
    }
  }

  private send(message: TpaToCloudMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify(message));
  }
}