# TypeScript Integration Guide

## Table of Contents
- [Overview](#overview)
- [Type Definitions](#type-definitions)
- [Type-Safe Event Handling](#type-safe-event-handling)
- [Advanced Patterns](#advanced-patterns)
- [Examples](#examples)

## Overview

The `@augmentos/tpa-client` library is written in TypeScript and provides full type safety for your TPA development. This guide covers TypeScript-specific features and patterns.

## Type Definitions

### Core Types

```typescript
// Session Configuration
interface TpaSessionConfig {
  packageName: string;
  apiKey: string;
  serverUrl?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

// Session Server Configuration
interface TpaServerConfig {
  packageName: string;
  apiKey: string;
  port?: number;
  webhookPath?: string;
  publicDir?: string | false;
  serverUrl?: string;
  healthCheck?: boolean;
}

// Stream Events
type StreamType = 
  | 'button_press' 
  | 'head_position'
  | 'phone_notifications' 
  | 'transcription' 
  | 'translation'
  | 'glasses_battery_update'
  | 'phone_battery_update'
  | 'location_update';

// Event Data Types
interface StreamDataTypes {
  'button_press': ButtonPressEvent;
  'head_position': HeadPositionEvent;
  'phone_notifications': PhoneNotificationEvent;
  'transcription': TranscriptionData;
  'translation': TranslationData;
  'glasses_battery_update': GlassesBatteryUpdateEvent;
  'phone_battery_update': PhoneBatteryUpdateEvent;
  'location_update': LocationUpdateEvent;
}

// Layout Types
type Layout = TextWall | DoubleTextWall | ReferenceCard;
```

### Using Type Inference

The library enables TypeScript to infer types automatically:

```typescript
// Event handler types are inferred
session.events.onTranscription((data) => {
  // data is typed as TranscriptionData
  console.log(data.text);      // ✅ Allowed
  console.log(data.isFinal);   // ✅ Allowed
  console.log(data.invalid);   // ❌ Error: Property 'invalid' does not exist
});

// Layout types are inferred
session.layouts.showReferenceCard(
  "Title",    // ✅ string required
  "Content",  // ✅ string required
  1000        // ✅ optional number
);
```

## Type-Safe Event Handling

### Direct Method Pattern

```typescript
class MyTPA extends TpaSessionServer {
  protected async onSession(
    session: TpaSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    // TypeScript enforces correct event handler signatures
    session.events.onTranscription((data: TranscriptionData) => {
      if (data.isFinal) {
        session.layouts.showTextWall(data.text);
      }
    });

    // Type error if handler signature doesn't match
    session.events.onHeadPosition((data: TranscriptionData) => { // ❌ Error
      // Type mismatch
    });
  }
}
```

### Pub/Sub Pattern

```typescript
// Type-safe event subscription
session.subscribe<'transcription'>(
  'transcription',
  (data) => {  // data is inferred as TranscriptionData
    console.log(data.text);
  }
);

// Explicit typing
type Handler<T extends StreamType> = (data: StreamDataTypes[T]) => void;

const transcriptionHandler: Handler<'transcription'> = (data) => {
  console.log(data.text);
};

session.subscribe('transcription', transcriptionHandler);
```

## Advanced Patterns

### Generic Event Handler

```typescript
class EventProcessor<T extends StreamType> {
  constructor(
    private session: TpaSession,
    private eventType: T,
    private handler: (data: StreamDataTypes[T]) => void
  ) {
    this.subscribe();
  }

  private subscribe(): void {
    this.session.subscribe(this.eventType, this.handler);
  }
}

// Usage
new EventProcessor(session, 'transcription', (data) => {
  // data is typed as TranscriptionData
});
```

### Type-Safe State Management

```typescript
interface AppState<T extends StreamType> {
  lastEvent?: StreamDataTypes[T];
  eventCount: number;
  isProcessing: boolean;
}

class StateManager<T extends StreamType> {
  private state: AppState<T> = {
    eventCount: 0,
    isProcessing: false
  };

  constructor(
    private session: TpaSession,
    private eventType: T
  ) {
    this.subscribe();
  }

  private subscribe(): void {
    this.session.subscribe(this.eventType, (data) => {
      this.state.lastEvent = data;
      this.state.eventCount++;
    });
  }

  getLastEvent(): StreamDataTypes[T] | undefined {
    return this.state.lastEvent;
  }
}

// Usage
const transcriptionState = new StateManager(
  session,
  'transcription'
);
```

### Custom Type Guards

```typescript
function isTranscriptionFinal(
  data: TranscriptionData
): data is TranscriptionData & { isFinal: true } {
  return data.isFinal === true;
}

// Usage
session.events.onTranscription((data) => {
  if (isTranscriptionFinal(data)) {
    // TypeScript knows data.isFinal is true
    session.layouts.showReferenceCard(
      "Final Transcription",
      data.text
    );
  }
});
```

## Examples

### Type-Safe Layout Manager

```typescript
class LayoutManager {
  constructor(private session: TpaSession) {}

  showTranscription(data: TranscriptionData): void {
    const layout: ReferenceCard = {
      layoutType: 'reference_card',
      title: data.isFinal ? 'Final' : 'Interim',
      text: data.text
    };

    this.session.layouts.showReferenceCard(
      layout.title,
      layout.text,
      data.isFinal ? 3000 : undefined
    );
  }
}
```

### Event Composition

```typescript
interface CompositeEvent {
  transcription?: TranscriptionData;
  headPosition?: HeadPositionEvent;
  timestamp: Date;
}

class EventComposer {
  private currentState: CompositeEvent = {
    timestamp: new Date()
  };

  constructor(private session: TpaSession) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    this.session.events.onTranscription((data) => {
      this.currentState = {
        ...this.currentState,
        transcription: data,
        timestamp: new Date()
      };
      this.processState();
    });

    this.session.events.onHeadPosition((data) => {
      this.currentState = {
        ...this.currentState,
        headPosition: data,
        timestamp: new Date()
      };
      this.processState();
    });
  }

  private processState(): void {
    const { transcription, headPosition } = this.currentState;
    
    if (transcription && headPosition) {
      // Process combined state
    }
  }
}
```

## See Also
- [PROTOCOL.md](./PROTOCOL.md) - Protocol documentation
- [EVENTS.md](./EVENTS.md) - Events documentation
- [README.md](./README.md) - Main documentation