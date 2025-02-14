# AugmentOS WebSocket Protocol

This document details the WebSocket protocol used for communication between TPAs and AugmentOS Cloud.

## Table of Contents
- [Overview](#overview)
- [Connection Flow](#connection-flow)
- [Message Format](#message-format)
- [Event Types](#event-types)
- [Display Commands](#display-commands)
- [Error Handling](#error-handling)
- [Implementation Examples](#implementation-examples)

## Overview

AugmentOS uses a WebSocket-based protocol for real-time communication between TPAs and the cloud service. The protocol follows these principles:

- JSON-based message format
- Bidirectional communication
- Session-based connections
- Type-safe message structure
- Automatic reconnection support

## Connection Flow

1. **Session Initialization**
   ```mermaid
   sequenceDiagram
       User->>Cloud: Enable TPA
       Cloud->>TPA: HTTP POST /webhook
       Note right of Cloud: {sessionId, userId}
       TPA->>Cloud: WS Connect
       TPA->>Cloud: Connection Init
       Cloud->>TPA: Connection Ack
   ```

2. **Initial HTTP Webhook**
   ```json
   POST /webhook
   {
     "sessionId": "user123-org.example.myapp",
     "userId": "user123",
     "timestamp": "2024-02-14T12:00:00Z"
   }
   ```

3. **WebSocket Connection**
   ```typescript
   const ws = new WebSocket('ws://localhost:7002/tpa-ws');
   ```

4. **Connection Initialization**
   ```json
   // TPA -> Cloud
   {
     "type": "tpa_connection_init",
     "sessionId": "user123-org.example.myapp",
     "packageName": "org.example.myapp",
     "apiKey": "your_api_key"
   }

   // Cloud -> TPA
   {
     "type": "tpa_connection_ack",
     "settings": {
       // App settings if any
     }
   }
   ```

## Message Format

All messages follow this base structure:
```typescript
interface WebSocketMessage {
  type: string;           // Message type identifier
  timestamp?: Date;       // Optional timestamp
  sessionId?: string;     // Session identifier
  [key: string]: any;     // Additional fields based on type
}
```

### Common Message Types

1. **Stream Data**
   ```json
   {
     "type": "data_stream",
     "streamType": "transcription",
     "data": {
       "text": "Hello world",
       "isFinal": true,
       "timestamp": "2024-02-14T12:00:00Z"
     }
   }
   ```

2. **Display Event**
   ```json
   {
     "type": "display_event",
     "packageName": "org.example.myapp",
     "layout": {
       "layoutType": "reference_card",
       "title": "Hello",
       "text": "World"
     },
     "durationMs": 3000
   }
   ```

3. **Subscription Update**
   ```json
   {
     "type": "subscription_update",
     "packageName": "org.example.myapp",
     "subscriptions": ["transcription", "head_position"]
   }
   ```

## Event Types

### Hardware Events

1. **Button Press**
   ```json
   {
     "type": "button_press",
     "buttonId": "main",
     "pressType": "short",
     "timestamp": "2024-02-14T12:00:00Z"
   }
   ```

2. **Head Position**
   ```json
   {
     "type": "head_position",
     "position": "up",
     "timestamp": "2024-02-14T12:00:00Z"
   }
   ```

3. **Battery Updates**
   ```json
   {
     "type": "glasses_battery_update",
     "level": 75,
     "charging": false,
     "timeRemaining": 120,
     "timestamp": "2024-02-14T12:00:00Z"
   }
   ```

### Audio Events

1. **Transcription**
   ```json
   {
     "type": "transcription",
     "text": "Hello world",
     "isFinal": true,
     "language": "en",
     "timestamp": "2024-02-14T12:00:00Z"
   }
   ```

2. **Translation**
   ```json
   {
     "type": "translation",
     "sourceText": "Hello world",
     "translatedText": "Bonjour le monde",
     "sourceLang": "en",
     "targetLang": "fr",
     "timestamp": "2024-02-14T12:00:00Z"
   }
   ```

## Display Commands

### Layout Types

1. **Text Wall**
   ```json
   {
     "type": "display_event",
     "layout": {
       "layoutType": "text_wall",
       "text": "Hello World"
     }
   }
   ```

2. **Double Text Wall**
   ```json
   {
     "type": "display_event",
     "layout": {
       "layoutType": "double_text_wall",
       "topText": "Original",
       "bottomText": "Translated"
     }
   }
   ```

3. **Reference Card**
   ```json
   {
     "type": "display_event",
     "layout": {
       "layoutType": "reference_card",
       "title": "Weather",
       "text": "Sunny and 75°F"
     }
   }
   ```

## Error Handling

### Error Types
```typescript
interface WebSocketError {
  code: string;      // Error code
  message: string;   // Human-readable message
  details?: unknown; // Additional error details
}
```

### Common Error Messages
```json
// Connection Error
{
  "type": "tpa_connection_error",
  "code": "AUTH_FAILED",
  "message": "Invalid API key"
}

// Subscription Error
{
  "type": "subscription_error",
  "code": "INVALID_STREAM",
  "message": "Invalid stream type requested"
}
```

## Implementation Examples

### Plain WebSocket Implementation
```javascript
const ws = new WebSocket('ws://localhost:7002/tpa-ws');

ws.onopen = () => {
  // Send connection init
  ws.send(JSON.stringify({
    type: 'tpa_connection_init',
    sessionId: 'user123-org.example.myapp',
    packageName: 'org.example.myapp',
    apiKey: 'your_api_key'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'tpa_connection_ack':
      // Subscribe to events
      ws.send(JSON.stringify({
        type: 'subscription_update',
        packageName: 'org.example.myapp',
        subscriptions: ['transcription']
      }));
      break;

    case 'data_stream':
      if (message.streamType === 'transcription') {
        // Handle transcription data
        showTranscription(message.data);
      }
      break;
  }
};

function showTranscription(data) {
  ws.send(JSON.stringify({
    type: 'display_event',
    packageName: 'org.example.myapp',
    layout: {
      layoutType: 'reference_card',
      title: 'Transcription',
      text: data.text
    },
    durationMs: data.isFinal ? 3000 : undefined
  }));
}
```

### Reconnection Handling
```javascript
class TpaConnection {
  constructor(config) {
    this.config = config;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  async connect() {
    try {
      this.ws = new WebSocket(this.config.serverUrl);
      this.setupHandlers();
    } catch (error) {
      await this.handleReconnection();
    }
  }

  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached');
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    await new Promise(resolve => setTimeout(resolve, delay));
    await this.connect();
  }
}
```

## See Also
- [README.md](./README.md) - Main documentation
- [LAYOUT_GUIDE.md](./LAYOUT_GUIDE.md) - Layout documentation
- [EVENTS.md](./EVENTS.md) - Events documentation