# @augmentos/sdk

Build Third Party Apps (TPAs) for AugmentOS smartglasses. This SDK provides everything you need to create real-time AR applications that respond to voice, head movements, and other inputs.

## 🚀 Quick Start

### 1. Install the SDK

```bash
# Using bun (recommended)
bun add @augmentos/sdk

# Using npm
npm install @augmentos/sdk
```

### 2. Create a Basic TPA

Here's a minimal TPA that displays captions in AR:

```typescript
import { TpaServer, TpaSession } from '@augmentos/sdk';

class CaptionsApp extends TpaServer {
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    session.layouts.showTextWall("Captions App Ready!");

    // Handle real-time transcription
    const cleanup = [
      session.events.onTranscription((data) => {
        session.layouts.showTextWall(data.text, {
          durationMs: data.isFinal ? 3000 : undefined
        });
      }),

      session.events.onError((error) => {
        console.error('Error:', error);
      })
    ];

    // Add cleanup handlers
    cleanup.forEach(handler => this.addCleanupHandler(handler));
  }
}

// Start the server
const app = new CaptionsApp({
  packageName: 'org.example.captions',
  apiKey: 'your_api_key',
  port: 3000,
  augmentOSWebsocketUrl: 'wss://staging.augmentos.org/tpa-ws'
});

app.start().catch(console.error);
```

## 📱 Core Concepts

### TPA Server & Sessions

- A `TpaServer` handles the webhook endpoint and manages TPA sessions
- Each user gets their own `TpaSession` instance with:
  - WebSocket connection to AugmentOS Cloud 
  - Event handling for transcription, head position, etc.
  - Layout management for displaying content in AR

### Available Events

```typescript
// Common events you can handle:
session.events.onTranscription((data) => {
  console.log('Speech:', data.text, 'Final:', data.isFinal);
});

session.events.onHeadPosition((data) => {
  console.log('Head position:', data);
});

session.events.onButtonPress((data) => {
  console.log('Button pressed:', data);
});

session.events.onError((error) => {
  console.error('Error:', error);
});
```

### Displaying Content

```typescript
// Simple text display
session.layouts.showTextWall("Hello AR!");

// Two sections of text
session.layouts.showDoubleTextWall(
  "Top text",
  "Bottom text"
);

// Card with title
session.layouts.showReferenceCard(
  "Title",
  "Content"
);

// With duration
session.layouts.showTextWall("Temporary message", {
  durationMs: 3000  // Show for 3 seconds
});
```

## 🎯 Example Apps

### 1. Translation App

```typescript
import { TpaServer, TpaSession } from '@augmentos/sdk';

class TranslatorTPA extends TpaServer {
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    session.layouts.showTextWall("Translator Ready!");

    const cleanup = [
      session.events.onTranscription(async (data) => {
        if (data.isFinal) {
          // In real app: Call translation API here
          const translation = `Translated: ${data.text}`;
          
          session.layouts.showDoubleTextWall(
            data.text,        // Original
            translation,      // Translation
            { durationMs: 5000 }
          );
        }
      })
    ];

    cleanup.forEach(handler => this.addCleanupHandler(handler));
  }
}
```

### 2. Head-Controlled Menu

```typescript
import { TpaServer, TpaSession } from '@augmentos/sdk';

class MenuTPA extends TpaServer {
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    const menuItems = ['Option 1', 'Option 2', 'Option 3'];
    let currentIndex = 0;

    const cleanup = [
      session.events.onHeadPosition((data) => {
        if (data.position === 'up') {
          currentIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
        } else if (data.position === 'down') {
          currentIndex = (currentIndex + 1) % menuItems.length;
        }

        session.layouts.showReferenceCard(
          "Menu",
          menuItems[currentIndex]
        );
      }),

      session.events.onButtonPress((data) => {
        if (data.type === 'single') {
          session.layouts.showTextWall(`Selected: ${menuItems[currentIndex]}`);
        }
      })
    ];

    cleanup.forEach(handler => this.addCleanupHandler(handler));
  }
}
```

## 📖 Best Practices

1. **Always Clean Up Subscriptions**
   ```typescript
   const cleanup = [
     session.events.onTranscription(() => {}),
     session.events.onHeadPosition(() => {})
   ];
   cleanup.forEach(handler => this.addCleanupHandler(handler));
   ```

2. **Handle Errors**
   ```typescript
   session.events.onError((error) => {
     console.error('Error:', error);
     session.layouts.showReferenceCard("Error", error.message);
   });
   ```

3. **Manage Display Duration**
   - Set timeouts for temporary content
   - Use `undefined` duration for persistent content
   - Clear old content when showing new content

## 🔧 Detailed Reference

### TpaServer Configuration

The `TpaServer` constructor accepts these options:

```typescript
interface TpaServerConfig {
  packageName: string;        // Your TPA package name (e.g., 'org.example.myapp')
  apiKey: string;            // Your API key for authentication
  port: number;              // Port to run the webhook server on
  serverUrl?: string;        // WebSocket server URL (optional)
  webhookPath?: string;      // Path for webhook endpoint (default: '/webhook')
  publicDir?: string;        // Directory for static files (optional)
  autoReconnect?: boolean;   // Enable automatic reconnection (default: false)
  maxReconnectAttempts?: number; // Max reconnection attempts (default: 0)
  reconnectDelay?: number;   // Reconnection delay in ms (default: 1000)
}
```

### Event Data Types

#### Transcription Events
```typescript
interface TranscriptionData {
  text: string;          // Transcribed text
  isFinal: boolean;      // Whether this is a final transcription
  language?: string;     // Detected language code
  startTime: number;     // Start time in milliseconds
  endTime: number;       // End time in milliseconds
  speakerId?: string;    // Unique speaker identifier
  duration?: number;     // Duration in milliseconds
}
```

#### Head Position Events
```typescript
interface HeadPosition {
  position: 'up' | 'down'
  timestamp: number;     // Event timestamp
}
```

#### Button Press Events
```typescript
interface ButtonPress {
  buttonId: string;      // Identifier for the pressed button
  type: 'single'
  timestamp: number;     // Event timestamp
}
```

#### Phone Notification Events
```typescript
interface PhoneNotification {
  appName: string;       // Source app name
  title: string;         // Notification title
  text: string;         // Notification content
  timestamp: number;    // Event timestamp
  priority?: 'low' | 'normal' | 'high';
  actions?: Array<{
    id: string;
    title: string;
  }>;
}
```

### Layout Types

#### TextWall
Simple text display for messages, status updates, notifications.
```typescript
// Show text with optional duration
session.layouts.showTextWall(
  "Hello World!", 
  { durationMs: 3000 }  // Optional: Show for 3 seconds
);
```

#### DoubleTextWall
Two-section text display for comparisons or two-part messages.
```typescript
session.layouts.showDoubleTextWall(
  "Top Section",
  "Bottom Section",
  { durationMs: 3000 }  // Optional: Show for 3 seconds
);
```

#### ReferenceCard
Titled card layout for structured information.
```typescript
session.layouts.showReferenceCard(
  "Title",
  "Content",
  { durationMs: 3000 }  // Optional: Show for 3 seconds
);
```

### Advanced Features

#### Custom Event Handling
You can subscribe to any event type using the generic subscribe method:
```typescript
session.subscribe<CustomEventType>('custom_event', (data) => {
  console.log('Custom event:', data);
});
```

#### Session Lifecycle
Handle session start and stop:
```typescript
class MyTPA extends TpaServer {
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Session started
    console.log(`Session ${sessionId} started for user ${userId}`);
    
    // Setup handlers...
  }

  protected async onStop(sessionId: string): Promise<void> {
    // Session stopped
    console.log(`Session ${sessionId} stopped`);
    
    // Cleanup if needed...
  }
}
```

#### Health Checks
The TPA server includes a built-in health check endpoint at `/health`:
```typescript
const app = new MyTPA({
  // ... other config
  healthCheck: true  // Enable health check endpoint
});
```

#### Static File Serving
Serve static files from a directory:
```typescript
const app = new MyTPA({
  // ... other config
  publicDir: path.join(__dirname, 'public')  // Serve static files
});
```



## 📊 Data Types and Models

### App Interface
```typescript
interface AppI {
  packageName: string;
  name: string;
  description: string;
  webhookURL: string;
  logoURL: string;
  webviewURL?: string;
  tpaType: TpaType;
  appStoreId?: string;
  developerId: string;
  version?: string;
  settings?: AppSettings;
  isPublic: boolean;
}
```

### App Settings
```typescript
interface AppSettings {
  // Custom app settings
  [key: string]: any;
}
```

### TPA Types
```typescript
enum TpaType {
  STANDARD = 'standard',
  SYSTEM = 'system',
  DASHBOARD = 'dashboard'
}
```

## 🔒 Security Best Practices

1. **API Key Management**
   - Store API keys securely
   - Use environment variables
   - Never commit keys to version control

2. **Error Handling**
   - Validate all input data
   - Handle network failures gracefully
   - Log errors appropriately

3. **Data Privacy**
   - Only store necessary user data
   - Clear sensitive data when session ends
   - Follow data protection regulations

## 📄 License

MIT License - feel free to use in your projects!