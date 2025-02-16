// src/types/webhook.ts
export interface StopWebhookRequest {
    type: 'stop_request';
    sessionId: string;
    userId: string;
    reason: 'user_disabled' | 'system_stop' | 'error';
    timestamp: string;
}

export interface StopWebhookResponse {
    status: 'success' | 'error';
    message?: string;
}