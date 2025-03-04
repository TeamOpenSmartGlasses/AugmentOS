# @augmentos/sdk

This package defines the core TypeScript types and interfaces used in the AugmentOS ecosystem. It includes definitions for models, events, and WebSocket communication messages for both client (glasses) and third-party applications (TPAs).

To install dependencies:

```bash
bun install
```

To run (primarily for type checking, as this package is meant to be imported):

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.31. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime, used here for its speed and TypeScript support.

## Message and Event Types

This section provides a comprehensive list of all message and event types defined in this package. These types are crucial for understanding the communication protocols within AugmentOS.

### 1. Control Messages

These messages are used for controlling the behavior of the AugmentOS system and applications.

#### 1.1. App Lifecycle Control

*   **`start_app`**: *(Client to Cloud)* - Request to start a specific application on the AugmentOS glasses.
    *   Used by: Glasses to request the cloud to start an app.
    *   Defined in: `websocket/client.ts` and `websocket/common.ts`
*   **`stop_app`**: *(Client to Cloud)* - Request to stop a specific application.
    *   Used by: Glasses to request the cloud to stop an app.
    *   Defined in: `websocket/client.ts` and `websocket/common.ts`
*   **`app_state_change`**: *(Cloud to Client)* - Informs the client about a change in the application's state (e.g., running, stopped, error).
    *   Used by: Cloud to notify glasses about app state changes.
    *   Defined in: `websocket/client.ts`

#### 1.2. Dashboard Control

*   **`open_dashboard`**: *(Client to Cloud)* - Request to open the system dashboard on the glasses display.
    *   Used by: Glasses to request opening the dashboard.
    *   Defined in: `websocket/common.ts`
*   **`dashboard_state`**: *(Client to Cloud)* - Reports the current open/closed state of the dashboard on the glasses.
    *   Used by: Glasses to report dashboard state changes.
    *   Defined in: `websocket/client.ts`

#### 1.3. Subscription and Settings Control

*   **`subscription_update`**: *(TPA to Cloud)* - Used by a Third-Party Application (TPA) to update its data stream subscriptions.
    *   Used by: TPAs to modify their subscriptions to data streams.
    *   Defined in: `websocket/tpa.ts`
*   **`settings_update`**: *(Cloud to TPA)* - Sends updated application settings to a TPA.
    *   Used by: Cloud to push updated settings to TPAs.
    *   Defined in: `websocket/tpa.ts`

#### 1.4. System-wide Control

*   **`all`**: *(Subscription Type)* - A special subscription type that allows subscribing to all available data streams.
    *   Used by: TPAs or system components to subscribe to all data streams.
    *   Defined in: `websocket/common.ts`
*   **`*`**: *(Subscription Type - Wildcard)* -  Similar to `all`, acts as a wildcard subscription type.
    *   Used by: TPAs or system components as a wildcard for subscriptions.
    *   Defined in: `websocket/common.ts`

### 2. Connection Messages

These messages handle the establishment and acknowledgment of WebSocket connections.

#### 2.1. Client (Glasses) Connection

*   **`connection_init`**: *(Glasses to Cloud)* - Initial message sent by the glasses to initiate a WebSocket connection to the cloud. Includes user identification.
    *   Used by: Glasses to start the WebSocket connection and identify the user.
    *   Defined in: `websocket/client.ts` and `websocket/common.ts`
*   **`connection_ack`**: *(Cloud to Client)* - Acknowledgment from the cloud confirming a successful connection from the glasses. Includes session information.
    *   Used by: Cloud to acknowledge successful connection from glasses.
    *   Defined in: `websocket/client.ts`
*   **`connection_error`**: *(Cloud to Client)* - Error message sent by the cloud if the connection from the glasses fails.
    *   Used by: Cloud to report connection errors to glasses.
    *   Defined in: `websocket/client.ts`

#### 2.2. TPA Connection

*   **`tpa_connection_init`**: *(TPA to Cloud)* - Initial message from a TPA to establish a WebSocket connection to the cloud. Includes API key and package name for authentication and identification.
    *   Used by: TPAs to initiate WebSocket connection and authenticate.
    *   Defined in: `websocket/tpa.ts`
*   **`tpa_connection_ack`**: *(Cloud to TPA)* - Acknowledgment from the cloud confirming a successful connection from a TPA. Can include initial settings.
    *   Used by: Cloud to acknowledge successful TPA connection.
    *   Defined in: `websocket/tpa.ts`
*   **`tpa_connection_error`**: *(Cloud to TPA)* - Error message sent by the cloud if the connection from a TPA fails, including error codes and details.
    *   Used by: Cloud to report connection errors to TPAs.
    *   Defined in: `websocket/tpa.ts`

### 3. Hardware Events

These events originate from the AugmentOS glasses hardware and related phone sensors.

*   **`button_press`**: - Indicates a button press event on the glasses. Includes button ID and press type (short or long).
    *   Source: Glasses button input.
    *   Defined in: `events/hardware.ts` and `websocket/common.ts`
*   **`head_position`**: - Reports the current head position detected by the glasses (e.g., 'up' or 'down').
    *   Source: Glasses head pose sensor.
    *   Defined in: `events/hardware.ts` and `websocket/common.ts`
*   **`glasses_battery_update`**: - Provides updates on the battery status of the glasses, including level, charging state, and remaining time.
    *   Source: Glasses battery monitoring system.
    *   Defined in: `events/hardware.ts` and `websocket/common.ts`
*   **`phone_battery_update`**: - Provides updates on the battery status of the connected phone.
    *   Source: Connected phone's battery status.
    *   Defined in: `events/hardware.ts` and `websocket/common.ts`
*   **`glasses_connection_state`**: - Reports the connection state of the glasses, including model name and connection status.
    *   Source: Glasses connection manager.
    *   Defined in: `events/hardware.ts`
*   **`location_update`**: - Sends location updates (latitude and longitude) from the connected device (likely phone).
    *   Source: Phone's GPS or location services.
    *   Defined in: `events/hardware.ts` and `websocket/common.ts`

#### 3.1. Audio Processing Events

*   **`transcription`**: - Base type for transcription data. Can represent interim or final transcriptions.
    *   Source: Audio processing pipeline (speech-to-text).
    *   Defined in: `events/hardware.ts` and `websocket/common.ts`
*   **`transcription-interim`**: - Represents an interim (non-final) transcription result, providing real-time feedback.
    *   Source: Real-time speech-to-text processing.
    *   Defined in: `events/hardware.ts`
*   **`transcription-final`**: - Represents a final, stable transcription result.
    *   Source: Finalized speech-to-text processing.
    *   Defined in: `events/hardware.ts`
*   **`translation`**: - Provides translation of transcribed text into a target language.
    *   Source: Translation service, usually following transcription.
    *   Defined in: `events/hardware.ts` and `websocket/common.ts`

### 4. Phone Events

These events are related to the connected phone and its notifications.

*   **`phone_notification`**: - Represents a notification received on the connected phone, including app details, title, and content.
    *   Source: Android notification system of the connected phone.
    *   Defined in: `events/phone.ts` and `websocket/common.ts`
*   **`notification_dismissed`**: - Indicates that a notification on the phone has been dismissed.
    *   Source: Android notification system when a notification is dismissed.
    *   Defined in: `events/phone.ts`

### 5. Display Events

These events are used to control what is displayed on the AugmentOS glasses.

*   **`display_event`**: *(Cloud to Client, TPA to Cloud)* -  Request to display content on the glasses. Used both for system-level displays and application-specific displays. Carries layout information and duration.
    *   Source: Cloud system or TPAs to control the glasses display.
    *   Defined in: `events/display.ts`, `websocket/client.ts`, and `websocket/tpa.ts`

### 6. Data Stream Types

These types represent raw data streams that can be subscribed to, providing real-time data.

*   **`audio_chunk`**: *(Data Stream Type)* - Represents a chunk of raw audio data, typically for real-time audio streaming.
    *   Data Type: `ArrayBuffer`
    *   Defined in: `websocket/common.ts`
*   **`video`**: *(Data Stream Type)* - Represents a frame of raw video data, for real-time video streaming (if supported).
    *   Data Type: `ArrayBuffer`
    *   Defined in: `websocket/common.ts`
*   **`data_stream`**: *(Cloud to TPA)* - Generic message type for sending data streams from the cloud to a TPA, where the specific stream is identified by `streamType`.
    *   Used by: Cloud to push various data streams to TPAs based on their subscriptions.
    *   Defined in: `websocket/tpa.ts`

### 7. Layout Types

These types define the structure of layouts used in display events. They are specified using the `layoutType` property within layout interfaces.

*   **`text_wall`**: - Simple layout to display a single block of text.
    *   Defined in: `layout/layout.ts`
*   **`double_text_wall`**: - Layout with two text areas, typically for a title and subtitle or two lines of information.
    *   Defined in: `layout/layout.ts`
*   **`dashboard_card`**: - A card-like layout, used both in dashboards and potentially in other contexts. Can have different variations (defined in `events/display.ts` and `layout/layout.ts`; consider unifying).
    *   Defined in: `layout/layout.ts` and `events/display.ts`
*   **`reference_card`**: - Layout for displaying a title and a larger body of text, suitable for reference information.
    *   Defined in: `layout/layout.ts`

---

This README provides a detailed overview of all message and event types within the `@augmentos/sdk` package. Understanding these types is essential for developing applications and components that interact with the AugmentOS platform.
