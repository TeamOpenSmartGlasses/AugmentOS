# TPA Lifecycle

This document describes the lifecycle of a Third Party Application (TPA) within the AugmentOS ecosystem.  Understanding this lifecycle is crucial for building robust and responsive TPAs.

## Stages of the TPA Lifecycle

A TPA goes through the following stages:

1.  **Registration (One-time):**  This happens *outside* of the normal runtime flow.  You register your TPA with AugmentOS Cloud, providing:
    *   `packageName`: A unique identifier (e.g., `com.example.myapp`).
    *   `name`: A human-readable name.
    *   `description`: A description of your TPA.
    *   `webhookURL`: The URL where AugmentOS Cloud will send session start requests.
    *   `logoURL`: (Optional) URL to your TPA's logo.
    *   `apiKey`: A secret key for authenticating your TPA with the cloud.
    *   `tpaType`:  The type of TPA (e.g., `standard`, `background`, `system`).

    This registration process is currently handled manually, but will eventually be managed through a developer portal.

2.  **Session Request (Webhook):** When a user starts your TPA on their smart glasses, AugmentOS Cloud sends an HTTP POST request to your TPA's `webhookURL`.  This request includes:

    *   `type`: `"session_request"`
    *   `sessionId`: A unique identifier for this session.
    *   `userId`:  The ID of the user who started the TPA.
    *   `timestamp`: When the request was sent.

    Your TPA server should listen for these POST requests on the configured `webhookPath` (default: `/webhook`).

3.  **WebSocket Connection:**  Upon receiving the `session_request`, your TPA establishes a WebSocket connection to AugmentOS Cloud.  The `TpaServer` class in the SDK handles this for you automatically.  You provide the cloud's WebSocket URL in the `TpaServerConfig`:

    ```typescript
    const server = new TpaServer({
      packageName: PACKAGE_NAME,
      apiKey: API_KEY,
      port: PORT,
      augmentOSWebsocketUrl: `ws://localhost:${CLOUD_PORT}/tpa-ws`, // Or your cloud URL
      webhookPath: '/webhook',
    });
    ```

4.  **Connection Initialization:**  After connecting, your TPA sends a `tpa_connection_init` message to the cloud.  This message includes:

    *   `type`: `"tpa_connection_init"`
    *   `sessionId`:  The session ID from the webhook request.
    *   `packageName`:  Your TPA's package name.
    *   `apiKey`:  Your TPA's API key.

    The `TpaSession` class handles sending this message automatically.

5.  **Subscription:**  Your TPA subscribes to the data streams it needs (e.g., transcription, head position) using the `subscribe()` method or the `events` object (see [Events](./events) for details). This informs AugmentOS Cloud which data to send to your TPA.

6.  **Event Handling:**  Your TPA receives real-time events from AugmentOS Cloud via the WebSocket connection.  You handle these events using event listeners (e.g., `session.events.onTranscription()`).

7.  **Display Updates:**  Your TPA sends display requests to AugmentOS Cloud to control what is shown on the glasses' display.  You use the `LayoutManager` (accessible through `session.layouts`) to create and send these requests.

8.  **Session Termination:**  The session ends when:

    *   The user stops the TPA on their glasses.
    *   The glasses disconnect from the cloud.
    *   Your TPA explicitly disconnects.
    *   An error occurs that terminates the session.

    AugmentOS Cloud will send a `stop_request` webhook to your TPA when a session ends. You can override the `onStop` method in your `TpaServer` to handle any necessary cleanup. The `TpaSession` also emits a `disconnected` event.

## Example Lifecycle Flow

```mermaid
sequenceDiagram
    participant User
    participant Glasses
    participant Cloud
    participant TPA

    User->>Glasses: Starts TPA
    Glasses->>Cloud: Request to start TPA
    Cloud->>TPA: Webhook: session_request
    activate TPA
    TPA->>Cloud: WebSocket Connection
    TPA->>Cloud: tpa_connection_init
    Cloud->>TPA: tpa_connection_ack
    TPA->>Cloud: subscription_update
    loop Real-time Interaction
        Glasses->>Cloud: Sensor data, voice, etc.
        Cloud->>TPA: Data streams (transcription, etc.)
        TPA->>Cloud: Display requests
        Cloud->>Glasses: Display updates
    end
    User->>Glasses: Stops TPA
    Glasses->>Cloud: Stop TPA request
    Cloud->>TPA: Webhook: stop_request
    TPA->>Cloud: Close WebSocket connection
    deactivate TPA
    Cloud->>Glasses: Clear display