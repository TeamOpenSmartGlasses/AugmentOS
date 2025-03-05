---
sidebar_position: 2
---

# Getting Started

This guide will walk you through creating a simple "Hello, World" TPA that displays text on the AugmentOS smart glasses.  This will introduce you to the basic structure of a TPA and how to use the SDK.

## Prerequisites

Make sure you have the following installed:

*   **Node.js:** (v18.0.0 or later)
*   **Bun:**  (for installation and running scripts)
*   **A code editor:** (VS Code recommended)

## Steps

### 1. Project Setup

Create a new directory for your TPA and initialize a Node.js project:

```bash
mkdir my-first-tpa
cd my-first-tpa
bun init -y
Use code with caution.
Markdown
This will create a package.json file.
```

2. Install the SDK
Install the @augmentos/sdk package:

```bash
bun add @augmentos/sdk
```

3. Create index.ts
Create a file named index.ts in the src directory:

```
my-first-tpa/
└── src/
    └── index.ts
```
Add the following code to index.ts:

```typescript
import { TpaServer, TpaSession } from '@augmentos/sdk';

// Replace with your TPA's details.  These should match what's
// registered in the (future) AugmentOS app store.
const PACKAGE_NAME = "com.example.myfirsttpa"; //  MUST BE UNIQUE!
const PORT = 4000;  // Choose a port for your TPA server.
const API_KEY = 'your_api_key'; // Replace with your API key.

class MyTPA extends TpaServer {
    protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
        console.log(`New session: ${sessionId} for user ${userId}`);

        // Display "Hello, World!" on the glasses.
        session.layouts.showTextWall("Hello, World!");
        
        // Log when the session is disconnected.
        session.events.onDisconnected(() => {
            console.log(`Session ${sessionId} disconnected.`);
        });
    }
}

// Create and start the TPA server
const server = new MyTPA({
    packageName: PACKAGE_NAME,
    apiKey: API_KEY,
    port: PORT,
    augmentOSWebsocketUrl: `ws://cloud.augmentos.org/tpa-ws`, // Connects to AugmentOS Cloud.
    webhookPath: '/webhook', // The path your server will listen on
});

server.start().catch(err => {
    console.error("Failed to start server:", err);
});
```

4. Create tsconfig.json
Create a tsconfig.json file in the root of your TPA project:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "baseUrl": ".",
    "paths": {}
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```


5. Update package.json
Add build and start scripts to your package.json:

```json
{
  "name": "my-first-tpa",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@augmentos/sdk": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

6. Run Your TPA
First, build the TPA:

```bash
bun run build
```

Then, start the TPA:

```bash
bun run start
```

Or, to run it in development mode with automatic reloading:

```bash
bun run dev
```

Your TPA is now running and listening for connections.

7. Testing with AugmentOS Cloud
To fully test your TPA, you need to:

Run AugmentOS Cloud: Make sure the main AugmentOS Cloud server is running (as described in the main cloud package's README).

Simulate a Session: Since you don't have physical glasses yet, you'll simulate a session start by sending a POST request to your TPA's webhook endpoint. You can use a tool like curl or Postman for this. Here's an example using curl:

```bash
curl -X POST \
  http://localhost:4000/webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "session_request",
    "sessionId": "test-session-123",
    "userId": "test-user@example.com",
    "timestamp": "2024-07-24T12:00:00Z"
  }'
```

Replace 4000 with the port your TPA is running on.

You can use any sessionId and userId for testing.

When you send this request, your TPA should:

Log "New session: test-session-123 for user test-user@example.com" to the console.

Establish a WebSocket connection to AugmentOS Cloud.

The session will remain active, you won't have real events, but it shows your server is starting correctly.

Next Steps
This simple example demonstrates the basic structure of a TPA. Now, you can:

Explore the Core Concepts to learn more about sessions, events, and layouts.

Learn about handling different Events from the glasses.

Experiment with different Layouts to display more complex content.

Refer to the API Reference for detailed documentation on the SDK classes and methods.