# Core Concepts

This section explains the fundamental concepts you need to understand to build TPAs for AugmentOS smart glasses.

## 1. Third-Party Applications (TPAs)

TPAs are the core of extending AugmentOS.  They are *server-side* applications that you build to provide functionality to the smart glasses.  Key characteristics of TPAs:

*   **Independent:** TPAs run in their own process, separate from the AugmentOS Cloud and the glasses.
*   **Event-Driven:** TPAs primarily interact with the system by responding to events (like transcriptions, button presses, etc.).
*   **Real-Time:** TPAs communicate with the glasses via WebSockets for low-latency interaction.
*   **Server-Side:**  All TPA logic runs on your server, not on the glasses themselves. This allows for more complex processing and integration with external services.

## 2. Sessions

A *session* represents the active connection between a user's smart glasses and your TPA.

*   **Unique ID:**  Each session has a unique `sessionId` (a UUID string) assigned by AugmentOS Cloud.
*   **User Association:** A session is associated with a specific `userId`.
*   **TPA Association:** When a user starts your TPA, a new session is created specifically for that user and your TPA.
*   **Lifecycle:** Sessions are created when a user starts your TPA and are terminated when the user stops the TPA, the glasses disconnect, or an error occurs.

The `TpaSession` class in the SDK provides methods for interacting with a session.

## 3. WebSockets

WebSockets are the primary communication mechanism between:

*   Your TPA and AugmentOS Cloud.
*   AugmentOS Cloud and the smart glasses.

The SDK handles the complexities of WebSocket connections for you. You primarily interact with the `TpaSession` object, which provides methods for sending and receiving messages.

## 4. Events and Data Streams

AugmentOS Cloud sends real-time data to your TPA as *events*.  These events represent:

*   **User Input:** Button presses, head movements.
*   **Sensor Data:** Location, battery level.
*   **System Events:** Connection status, settings changes.
*   **Processed Data:**  Speech transcription, phone notifications.

Your TPA *subscribes* to the events it needs.  The `EventManager` class (accessible through `session.events`) provides methods for subscribing to and handling events.

See the [Events](./events) section for a complete list of available events.

## 5. Layouts

Layouts control what is displayed on the smart glasses' screen.  The SDK provides several pre-defined layout types:

*   `TextWall`:  Displays a single block of text.
*   `DoubleTextWall`:  Displays two blocks of text (top and bottom).
*   `ReferenceCard`:  Displays a card with a title and content.
*   `BitmapView`: Displays an image on the Glasses.

You use the `LayoutManager` (accessible through `session.layouts`) to display layouts.

See the [Layouts](./layouts) section for more details.

## 6. The TPA Lifecycle

A typical TPA lifecycle looks like this:

1.  **Webhook Request:**  When a user starts your TPA on their glasses, AugmentOS Cloud sends an HTTP POST request (a "webhook") to your TPA's pre-defined webhook URL.  This request includes a unique `sessionId` and `userId`.
2.  **WebSocket Connection:**  Your TPA receives the webhook and uses the `sessionId` to establish a WebSocket connection to AugmentOS Cloud.
3.  **Subscription:** Your TPA subscribes to the events it needs (e.g., transcription, head position).
4.  **Event Handling:**  Your TPA receives events from AugmentOS Cloud and processes them.  This often involves updating the display using the `LayoutManager`.
5.  **Session Termination:** The session ends when the user stops the TPA, the glasses disconnect, or an error occurs.

See [TPA Lifecycle](./tpa-lifecycle) for a more detailed explanation.

## 7. The AugmentOS Cloud

The AugmentOS Cloud acts as a central hub, managing:

*   User sessions.
*   TPA connections.
*   Data stream routing.
*   Display management.
*   Communication with external services (speech-to-text, etc.).

Your TPA interacts with the cloud, but you don't need to worry about the internal details of how the cloud operates.  The SDK abstracts away these complexities.

By understanding these core concepts, you'll be well-equipped to start building powerful and engaging TPAs for AugmentOS smart glasses.