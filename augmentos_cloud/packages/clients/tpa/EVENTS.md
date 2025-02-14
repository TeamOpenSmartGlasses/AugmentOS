# AugmentOS Events Guide

## Table of Contents
- [Overview](#overview)
- [Event Types](#event-types)
- [Subscription Management](#subscription-management)
- [Event Handling Patterns](#event-handling-patterns)
- [Example Implementations](#example-implementations)
- [Best Practices](#best-practices)

## Overview

AugmentOS provides a real-time event system allowing TPAs to respond to various user and system events. Events are delivered via WebSocket and can be handled using either direct event handlers or a pub/sub pattern.

## Event Types

### Hardware Events

#### Button Press Events
Track hardware button interactions:
```typescript
interface ButtonPressEvent {
  type: 'button_press';
  buttonId: string;
  pressType: 'short' | 'long';
  timestamp: Date;
}

// Usage
session.events.onButtonPress((event) => {
  if (event.pressType === 'long') {
    session.layouts.showTextWall("Long press detected!");
  }
});
```

#### Head Position Events
Monitor user head movement:
```typescript
interface HeadPositionEvent {
  type: 'head_position';
  position: 'up' | 'down';
  timestamp: Date;
}

// Usage
session.events.onHeadPosition((event) => {
  if (event.position === 'up') {
    session.layouts.showTextWall("Looking up!");
  }
});
```

#### Battery Events
Track device battery status:
```typescript
interface GlassesBatteryUpdateEvent {
  type: 'glasses_battery_update';
  level: number;         // 0-100
  charging: boolean;
  timeRemaining?: number;  // minutes
  timestamp: Date;
}

// Usage
session.events.onBatteryUpdate((event) => {
  if (event.level < 20 && !event.charging) {
    session.layouts.showReferenceCard(
      "Low Battery",
      "Please charge your glasses"
    );
  }
});
```

### Audio Events

#### Transcription Events
Real-time speech-to-text:
```typescript
interface TranscriptionData {
  type: 'transcription';
  text: string;
  isFinal: boolean;
  language?: string;
  timestamp: Date;
  durationMs?: number;
}

// Usage
session.events.onTranscription((data) => {
  if (data.isFinal) {
    session.layouts.showReferenceCard(
      "You said:",
      data.text,
      3000
    );
  }
});
```

#### Translation Events
Real-time translation results:
```typescript
interface TranslationData {
  type: 'translation';
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  confidence: number;
  timestamp: Date;
}

// Usage
session.events.onTranslation((data) => {
  session.layouts.showDoubleTextWall(
    `${data.sourceLang}: ${data.sourceText}`,
    `${data.targetLang}: ${data.translatedText}`
  );
});
```

### Phone Events

#### Notification Events
Phone notification handling:
```typescript
interface PhoneNotificationEvent {
  type: 'phone_notification';
  notificationId: string;
  app: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  timestamp: Date;
}

// Usage
session.events.onPhoneNotifications((event) => {
  if (event.priority === 'high') {
    session.layouts.showReferenceCard(
      event.title,
      event.content,
      10000
    );
  }
});
```

## Subscription Management

### Direct Method Interface
```typescript
// Individual event handlers
const cleanup = [
  session.events.onTranscription((data) => {
    // Handle transcription
  }),
  session.events.onHeadPosition((data) => {
    // Handle head position
  })
];

// Cleanup when done
cleanup.forEach(unsubscribe => unsubscribe());
```

### Pub/Sub Interface
```typescript
// Subscribe to events
const unsub = session.subscribe('transcription', (data) => {
  // Handle transcription
});

// Unsubscribe when done
unsub();
```

## Event Handling Patterns

### Combining Events
```typescript
// Track both head position and button presses
let lookingUp = false;

session.events.onHeadPosition((event) => {
  lookingUp = event.position === 'up';
});

session.events.onButtonPress((event) => {
  if (lookingUp && event.pressType === 'short') {
    session.layouts.showTextWall("Action triggered!");
  }
});
```

### State Management
```typescript
class GameState {
  private score = 0;
  
  constructor(private session: TpaSession) {
    session.events.onButtonPress((event) => {
      if (event.buttonId === 'main') {
        this.incrementScore();
      }
    });
  }

  private incrementScore() {
    this.score++;
    this.session.layouts.showReferenceCard(
      "Score",
      `Points: ${this.score}`
    );
  }
}
```

### Error Recovery
```typescript
session.events.onError((error) => {
  console.error('Session error:', error);
  
  // Show error to user
  session.layouts.showReferenceCard(
    "Error",
    "Connection issue. Retrying..."
  );
});

session.events.onDisconnected(() => {
  session.layouts.showTextWall(
    "Disconnected - attempting to reconnect..."
  );
});
```

## Example Implementations

### Voice Command Handler
```typescript
class VoiceCommands {
  private commands = new Map<string, () => void>();

  constructor(private session: TpaSession) {
    this.setupCommands();
    this.listenForCommands();
  }

  private setupCommands() {
    this.commands.set("show weather", () => {
      this.showWeather();
    });
    
    this.commands.set("start timer", () => {
      this.startTimer();
    });
  }

  private listenForCommands() {
    this.session.events.onTranscription((data) => {
      if (!data.isFinal) return;
      
      for (const [command, handler] of this.commands) {
        if (data.text.toLowerCase().includes(command)) {
          handler();
          break;
        }
      }
    });
  }

  private showWeather() {
    // Implement weather display
  }

  private startTimer() {
    // Implement timer
  }
}
```

### Activity Monitor
```typescript
class ActivityMonitor {
  private lastActive: Date = new Date();
  private activityEvents: StreamType[] = [
    'button_press',
    'head_position'
  ];

  constructor(private session: TpaSession) {
    this.setupActivityTracking();
    this.startInactivityCheck();
  }

  private setupActivityTracking() {
    this.activityEvents.forEach(eventType => {
      this.session.subscribe(eventType, () => {
        this.lastActive = new Date();
      });
    });
  }

  private startInactivityCheck() {
    setInterval(() => {
      const inactiveTime = Date.now() - this.lastActive.getTime();
      if (inactiveTime > 5 * 60 * 1000) { // 5 minutes
        this.session.layouts.showTextWall(
          "Still there? Move your head or press a button.",
          10000
        );
      }
    }, 60 * 1000); // Check every minute
  }
}
```

## Best Practices

1. **Event Cleanup**
   - Always store cleanup functions
   - Remove handlers when not needed
   - Use cleanup arrays for multiple handlers

2. **Error Handling**
   - Handle all potential errors
   - Provide user feedback
   - Implement recovery strategies

3. **State Management**
   - Keep state organized
   - Use classes for complex state
   - Implement proper cleanup

4. **Performance**
   - Don't over-subscribe
   - Clean up unused handlers
   - Batch updates when possible

5. **User Experience**
   - Provide feedback for actions
   - Handle reconnection gracefully
   - Keep displays relevant

## See Also
- [PROTOCOL.md](./PROTOCOL.md) - Protocol documentation
- [LAYOUT_GUIDE.md](./LAYOUT_GUIDE.md) - Layout documentation
- [README.md](./README.md) - Main documentation