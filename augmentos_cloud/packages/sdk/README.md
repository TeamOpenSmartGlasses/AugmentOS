# @augmentos/sdk

A TypeScript client library for building Third Party Apps (TPAs) for AugmentOS Cloud. This library provides a flexible, type-safe interface for handling WebSocket connections, managing layouts, and processing real-time data streams.

## Features

- 🔄 Multiple event handling patterns (direct methods, pub/sub, organized events)
- 📱 Type-safe layout management for AR displays
- 🔐 Automatic connection management with reconnection support
- 🎯 Strong TypeScript support with full type definitions
- 📦 Clean, modular architecture

## Installation

```bash
bun add @augmentos/sdk
```

## Quick Start

```typescript
import { TpaClient } from '@augmentos/client';

const tpa = new TpaClient({
  packageName: 'org.example.myapp',
  apiKey: 'your_api_key'
});

// Connect to AugmentOS Cloud
await tpa.connect('session_123');

// Show content in AR view
tpa.layouts.showReferenceCard('Welcome', 'Hello, World!');
```

## Usage Guide

### 1. Initialization

```typescript
const tpa = new TpaClient({
  packageName: 'org.example.myapp',
  apiKey: 'your_api_key',
  serverUrl: 'ws://localhost:7002/tpa-ws', // optional
  autoReconnect: true,                     // optional
  maxReconnectAttempts: 5,                 // optional
  reconnectDelay: 1000                     // optional
});
```

### 2. Event Handling

You can handle events in three different styles:

#### Direct Methods

```typescript
// Using direct methods
const unsubscribe = tpa.onTranscription((data) => {
  console.log('Transcription:', data.text);
});

// Cleanup when done
unsubscribe();
```

#### Pub/Sub Pattern

```typescript
// Using pub/sub pattern
const unsubscribe = tpa.subscribe('transcription', (data) => {
  console.log('Transcription:', data.text);
});

// Cleanup when done
unsubscribe();
```

#### Organized Events

```typescript
// Using organized events interface
const unsubscribe = tpa.events.onTranscription((data) => {
  console.log('Transcription:', data.text);
});

// Cleanup when done
unsubscribe();
```

### 3. Layout Management

The library provides type-safe methods for displaying content in the AR view:

```typescript
// Text Wall - Single block of text
tpa.layouts.showTextWall(
  "Hello, World!",
  3000  // Optional duration in ms
);

// Double Text Wall - Two blocks of text
tpa.layouts.showDoubleTextWall(
  "Top text",
  "Bottom text",
  3000  // Optional duration in ms
);

// Reference Card - Title and content
tpa.layouts.showReferenceCard(
  "Title",
  "Content text",
  3000  // Optional duration in ms
);
```

### 4. Connection Management

```typescript
// Connect to AugmentOS Cloud
try {
  await tpa.connect('session_123');
  console.log('Connected!');
} catch (error) {
  console.error('Connection failed:', error);
}

// Handle connection events
tpa.events.onConnected((settings) => {
  console.log('Connected with settings:', settings);
});

tpa.events.onDisconnected(() => {
  console.log('Disconnected');
});

// Cleanup on shutdown
tpa.disconnect();
```

### 5. Error Handling

```typescript
tpa.events.onError((error) => {
  console.error('Error:', error);
});
```

## Available Events

- `transcription` - Real-time speech transcription
- `head_position` - User head position updates
- `button_press` - Hardware button press events
- `phone_notifications` - Phone notification events
- `connected` - Connection established
- `disconnected` - Connection lost
- `error` - Error events

## Layout Types

### TextWall
Simple text display:
```typescript
tpa.layouts.showTextWall("Hello, World!");
```

### DoubleTextWall
Two-section text display:
```typescript
tpa.layouts.showDoubleTextWall(
  "Top section",
  "Bottom section"
);
```

### ReferenceCard
Title and content display:
```typescript
tpa.layouts.showReferenceCard(
  "Title here",
  "Content here"
);
```

## Best Practices

1. **Clean Up Subscriptions**
```typescript
const cleanup = [
  tpa.onTranscription((data) => { /* ... */ }),
  tpa.events.onHeadPosition((data) => { /* ... */ }),
  tpa.subscribe('button_press', (data) => { /* ... */ })
];

// Later
cleanup.forEach(unsubscribe => unsubscribe());
```

2. **Error Handling**
```typescript
tpa.events.onError((error) => {
  console.error('Error:', error);
  // Implement appropriate error handling
});
```

3. **Connection Management**
```typescript
process.on('SIGTERM', () => {
  tpa.disconnect();
  process.exit(0);
});
```

## API Reference

### TpaClient

#### Constructor
```typescript
new TpaClient(config: TpaClientConfig)
```

#### Configuration Options
```typescript
interface TpaClientConfig {
  packageName: string;      // Your TPA package name
  apiKey: string;          // Your API key
  serverUrl?: string;      // WebSocket server URL
  autoReconnect?: boolean; // Enable auto reconnection
  maxReconnectAttempts?: number; // Max reconnection attempts
  reconnectDelay?: number; // Initial reconnection delay
}
```

#### Methods
- `connect(sessionId: string): Promise<void>`
- `disconnect(): void`
- `onTranscription(handler: (data: any) => void): () => void`
- `onHeadPosition(handler: (data: any) => void): () => void`
- `onButtonPress(handler: (data: any) => void): () => void`
- `onPhoneNotifications(handler: (data: any) => void): () => void`
- `subscribe<T>(type: StreamType, handler: (data: T) => void): () => void`
- `on(event: string, handler: (data: any) => void): () => void`

### LayoutManager

#### Methods
- `showTextWall(text: string, durationMs?: number): void`
- `showDoubleTextWall(topText: string, bottomText: string, durationMs?: number): void`
- `showReferenceCard(title: string, text: string, durationMs?: number): void`

### EventManager

#### Methods
- `onTranscription(handler: Handler): () => void`
- `onHeadPosition(handler: Handler): () => void`
- `onButtonPress(handler: Handler): () => void`
- `onPhoneNotifications(handler: Handler): () => void`
- `onConnected(handler: Handler): () => void`
- `onDisconnected(handler: Handler): () => void`
- `onError(handler: Handler): () => void`

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License. See [LICENSE](LICENSE) for details.