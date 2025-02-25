// src/webhook.ts

/**
 * Types of webhook requests that can be sent to TPAs
 */
export enum WebhookRequestType {
    /** Request to start a TPA session */
    SESSION_REQUEST = 'session_request',
    
    /** Request to stop a TPA session */
    STOP_REQUEST = 'stop_request'
  }
  
  /**
   * Base interface for all webhook requests
   */
  export interface BaseWebhookRequest {
    /** Type of webhook request */
    type: WebhookRequestType;
    
    /** Session ID for the request */
    sessionId: string;
    
    /** User ID associated with the session */
    userId: string;
    
    /** Timestamp of the request */
    timestamp: string;
  }
  
  /**
   * Session request webhook
   * 
   * Sent to a TPA when a user starts the TPA
   */
  export interface SessionWebhookRequest extends BaseWebhookRequest {
    type: WebhookRequestType.SESSION_REQUEST;
  }
  
  /**
   * Stop request webhook
   * 
   * Sent to a TPA when a user or the system stops the TPA
   */
  export interface StopWebhookRequest extends BaseWebhookRequest {
    type: WebhookRequestType.STOP_REQUEST;
    reason: 'user_disabled' | 'system_stop' | 'error';
  }
  
  /**
   * Union type for all webhook requests
   */
  export type WebhookRequest = SessionWebhookRequest | StopWebhookRequest;
  
  /**
   * Response to a webhook request
   */
  export interface WebhookResponse {
    status: 'success' | 'error';
    message?: string;
  }
  
  /**
   * Type guard to check if a webhook request is a session request
   */
  export function isSessionWebhookRequest(request: WebhookRequest): request is SessionWebhookRequest {
    return request.type === WebhookRequestType.SESSION_REQUEST;
  }
  
  /**
   * Type guard to check if a webhook request is a stop request
   */
  export function isStopWebhookRequest(request: WebhookRequest): request is StopWebhookRequest {
    return request.type === WebhookRequestType.STOP_REQUEST;
  }