package com.augmentos.augmentos_core.augmentos_backend;

import android.util.Log;

import org.json.JSONObject;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

/**
 * Low-level OkHttp WebSocket wrapper. This class holds the actual connection,
 * calls "onIncomingMessage" when JSON arrives, etc.
 *
 * ServerComms uses this, so we only have ONE WebSocket in the entire system.
 */
public class WebSocketManager extends WebSocketListener {
    private static final String TAG = "WearableAi_WebSocketManager";

    // Callback interface to push messages/events back to ServerComms
    public interface IncomingMessageHandler {
        void onIncomingMessage(JSONObject msg);
        void onConnectionOpen();
        void onConnectionClosed();
        void onError(String error);
    }

    private final IncomingMessageHandler handler;
    private OkHttpClient client;
    private WebSocket webSocket;
    private boolean connected = false;

    public WebSocketManager(IncomingMessageHandler handler) {
        this.handler = handler;
    }

    /**
     * Opens a connection to the given WebSocket URL.
     */
    public void connect(String url) {
        if (connected) {
            Log.d(TAG, "Already connected.");
            return;
        }
        client = new OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .pingInterval(15, TimeUnit.SECONDS)
                .build();

        Request request = new Request.Builder().url(url).build();
        webSocket = client.newWebSocket(request, this);
    }

    /**
     * Closes the connection gracefully.
     */
    public void disconnect() {
        if (webSocket != null && connected) {
            webSocket.close(1000, "Normal closure");
        }
        cleanup();
    }

    /**
     * True if currently connected/open.
     */
    public boolean isConnected() {
        return connected;
    }

    /**
     * Send text (JSON) over the WebSocket.
     */
    public void sendText(String text) {
        if (webSocket != null && connected) {
            webSocket.send(text);
        } else {
            Log.e(TAG, "Cannot send text; WebSocket not open.");
        }
    }

    /**
     * Send binary data over the WebSocket (e.g. raw PCM audio).
     */
    public void sendBinary(byte[] data) {
        if (webSocket != null && connected) {
            webSocket.send(ByteString.of(data));
        } else {
            Log.e(TAG, "Cannot send binary; WebSocket not open.");
        }
    }

    // -------------------------------------------
    // WebSocketListener callbacks
    // -------------------------------------------

    @Override
    public void onOpen(WebSocket webSocket, Response response) {
        connected = true;
        Log.d(TAG, "WebSocket opened: " + response);
        if (handler != null) {
            handler.onConnectionOpen();
        }
        // Example handshake: you might do "connection_init" here,
        // but in our design, we do it from ServerComms (or handleIncomingMessage).
    }

    @Override
    public void onMessage(WebSocket webSocket, String text) {
        // A text message (likely JSON).
        try {
            JSONObject json = new JSONObject(text);
            if (handler != null) {
                handler.onIncomingMessage(json);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing message: " + text, e);
        }
    }

    @Override
    public void onMessage(WebSocket webSocket, ByteString bytes) {
        // Binary message, if the server sends any. In many cases, you won't get these.
        Log.d(TAG, "Received binary message, size=" + bytes.size());
        // If needed, handle or convert to JSON. Otherwise ignore.
    }

    @Override
    public void onClosing(WebSocket webSocket, int code, String reason) {
        Log.d(TAG, "WebSocket closing: code=" + code + ", reason=" + reason);
        connected = false;
        if (handler != null) {
            handler.onConnectionClosed();
        }
        cleanup();
    }

    @Override
    public void onFailure(WebSocket webSocket, Throwable t, Response response) {
        Log.e(TAG, "WebSocket failure: " + t.getMessage(), t);
        connected = false;
        if (handler != null) {
            handler.onError("WebSocket failure: " + t.getMessage());
        }
        cleanup();
    }

    /**
     * Shuts down OkHttp resources, if needed.
     */
    private void cleanup() {
        connected = false;
        if (webSocket != null) {
            webSocket = null;
        }
        if (client != null) {
            client.dispatcher().executorService().shutdown();
            client.connectionPool().evictAll();
            client = null;
        }
    }
}
