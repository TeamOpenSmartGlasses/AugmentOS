package com.augmentos.smartglassesmanager.speechrecognition.augmentos;

import android.util.Log;

import com.augmentos.augmentoslib.enums.AsrStreamType;
import com.augmentos.smartglassesmanager.speechrecognition.AsrStreamKey;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

public class WebSocketStreamManager {
    private static final String TAG = "WearableAi_WebSocketStreamManager";
    private static WebSocketStreamManager instance;
    private WebSocket webSocket;
    private boolean isConnected = false;
    private final String serverUrl;
    private OkHttpClient client;
    private final BlockingQueue<byte[]> audioQueue;
    private Thread audioSenderThread;
    private boolean isRunning = false;
    private final List<WebSocketCallback> callbacks = new ArrayList<>();
    private boolean lastVadState = false;
    private List<AsrStreamKey> lastConfig = new ArrayList<>(); // Store last config
    private boolean isReconnecting = false;
    private static final int RECONNECT_DELAY_MS = 500;
    private final Object reconnectLock = new Object();
    private boolean isKilled = false;

    public interface WebSocketCallback {
        void onInterimTranscript(String text, String language, long timestamp);
        void onInterimTranslation(String translatedText, String fromLanguage, String toLanguage, long timestamp);
        void onFinalTranscript(String text, String language, long timestamp);
        void onFinalTranslation(String translatedText, String fromLanguage, String toLanguage, long timestamp);
        void onError(String error);
    }

    private WebSocketStreamManager(String url) {
        this.serverUrl = url;
        this.client = new OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build();
        this.audioQueue = new LinkedBlockingQueue<>();
    }

    public static synchronized WebSocketStreamManager getInstance(String url) {
        if (instance == null || instance.isKilled) {
            instance = new WebSocketStreamManager(url);
            instance.isKilled = false; // Reset
        }
        return instance;
    }

    public void addCallback(WebSocketCallback callback) {
        callbacks.add(callback);
    }

    public void removeCallback(WebSocketCallback callback) {
        callbacks.remove(callback);
    }

    public void removeAllCallbacks() {
        callbacks.clear();
    }

    public void disconnect() {
        Log.d(TAG, "Web socket disconnect called");
        isKilled = true;
        removeAllCallbacks();

        synchronized (reconnectLock) {
            isReconnecting = false;
        }
        isConnected = false;
        stopAudioSender();

        if (webSocket != null) {
            audioQueue.clear();
            webSocket.close(1000, "Normal closure");
            webSocket = null;
        }

        if (client != null) {
            client.dispatcher().executorService().shutdown();
            client.connectionPool().evictAll();
            client = null;
        }

        Log.d(TAG, "WebSocket disconnected and resources cleaned up");
    }

    private void attemptReconnect() {
        synchronized (reconnectLock) {
            if (isReconnecting) {
                Log.d(TAG, "Reconnect attempt skipped - already reconnecting");
                return;
            }
            isReconnecting = true;
            Log.d(TAG, "Setting isReconnecting=true");
        }

        new Thread(() -> {
            while (isReconnecting && !isConnected) {
                Log.d(TAG, "attemptReconnect() loop. isReconnecting=" + isReconnecting + ", isConnected=" + isConnected + ", isKiled=" + isKilled);

                try {
                    Thread.sleep(RECONNECT_DELAY_MS);
                    if (isKilled) {
                        Log.d(TAG, "Reconnection aborted. isKiled=true");
                        return;
                    }
                    connect();
                } catch (InterruptedException e) {
                    Log.d(TAG, "Reconnect thread interrupted, exiting loop");
                    Thread.currentThread().interrupt();
                    return;
                }
            }
            Log.d(TAG, "Exited reconnect loop. isReconnecting=" + isReconnecting + ", isConnected=" + isConnected + ", isKiled=" + isKilled);
        }).start();
    }

    public void connect() {
        if (client == null) {
            client = new OkHttpClient.Builder()
                    .readTimeout(5, TimeUnit.SECONDS)
                    .pingInterval(4, TimeUnit.SECONDS)
                    .build();
        }

        Request request = new Request.Builder()
                .url(serverUrl)
                .build();

        webSocket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                Log.d(TAG, "WebSocket Connected");
                isConnected = true;
                synchronized (reconnectLock) {
                    isReconnecting = false;
                }

                JSONObject config = new JSONObject();
                try {
                    config.put("type", "config");
                    config.put("streams", new JSONArray());
                    webSocket.send(config.toString());
                    Log.d(TAG, "Sent initial ASR config: " + config);

                    // If we have a saved config, send it after connection
                    if (!lastConfig.isEmpty()) {
                        updateConfig(lastConfig);
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Error creating config message", e);
                }

                startAudioSender();
            }

            @Override
            public void onMessage(WebSocket webSocket, String text) {
                try {
                    JSONObject message = new JSONObject(text);
                    String type = message.getString("type");
                    long timestamp = (long)(message.getDouble("timestamp") * 1000);
                    String transcribeLanguage = message.getString("language");
                    String translateLanguage = message.optString("translateLanguage", null);
                    boolean isTranslation = translateLanguage != null;

                    for (WebSocketCallback callback : callbacks) {
                        if ("interim".equals(type)) {
                            if (isTranslation) {
                                callback.onInterimTranslation(
                                        message.getString("text"),
                                        transcribeLanguage,
                                        translateLanguage,
                                        timestamp
                                );
                            } else {
                                callback.onInterimTranscript(
                                        message.getString("text"),
                                        transcribeLanguage,
                                        timestamp
                                );
                            }
                        } else if ("final".equals(type)) {
                            if (isTranslation) {
                                callback.onFinalTranslation(
                                        message.getString("text"),
                                        transcribeLanguage,
                                        translateLanguage,
                                        timestamp
                                );
                            } else {
                                callback.onFinalTranscript(
                                        message.getString("text"),
                                        transcribeLanguage,
                                        timestamp
                                );
                            }
                        }
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Error parsing message", e);
                }
            }

            @Override
            public void onClosing(WebSocket webSocket, int code, String reason) {
                Log.d(TAG, "WebSocket Closing, code=" + code + " reason=" + reason);
                isConnected = false;
                stopAudioSender();
                if (!isKilled){
                    attemptReconnect();
                }
            }

            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                Log.e(TAG, "WebSocket Failure: " + t.getMessage());
                isConnected = false;
                stopAudioSender();

                for (WebSocketCallback callback : callbacks) {
                    callback.onError("WebSocket failure: " + t.getMessage());
                }
                attemptReconnect();
            }
        });
    }

    private void startAudioSender() {
        isRunning = true;
        audioSenderThread = new Thread(() -> {
            while (isRunning && isConnected) {
                try {
                    byte[] audioChunk = audioQueue.take();
                    if (webSocket != null) {
                        ByteString audioData = ByteString.of(audioChunk);
                        webSocket.send(audioData);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        });
        audioSenderThread.start();
    }

    private void stopAudioSender() {
        isRunning = false;
        if (audioSenderThread != null) {
            audioSenderThread.interrupt();
            audioSenderThread = null;
        }
    }

    public void writeAudioChunk(byte[] audioData) {
        if (isConnected) {
            audioQueue.offer(audioData);
        }
    }

    public boolean isConnected() {
        return isConnected;
    }

    public void sendVadStatus(boolean isSpeaking) {
//        Log.d(TAG, "Sending VAD status");
        if (!isConnected || webSocket == null) return;

        // Avoid redundant messages
        if (lastVadState == isSpeaking) return;
        lastVadState = isSpeaking;

        JSONObject vadMessage = new JSONObject();
        try {
            vadMessage.put("type", "VAD");
            vadMessage.put("status", isSpeaking ? "true" : "false");
            webSocket.send(vadMessage.toString());
            Log.d(TAG, "Sent VAD status: " + vadMessage);
        } catch (JSONException e) {
            Log.e(TAG, "Error creating VAD message", e);
        }
    }

    public void updateConfig(List<AsrStreamKey> languages) {
        Log.d(TAG, "Updating ASR config");

        // Save the config for reconnection
        lastConfig = new ArrayList<>(languages);

        if (!isConnected || webSocket == null) {
            Log.e(TAG, "WebSocket not connected. Cannot send config update.");
            return;
        }

        JSONObject configMessage = new JSONObject();
        JSONArray streamsArray = new JSONArray();

        try {
            configMessage.put("type", "config");

            for (AsrStreamKey key : languages) {
                JSONObject streamObject = new JSONObject();
                if (key.streamType == AsrStreamType.TRANSCRIPTION){
                    streamObject.put("streamType", "transcription");
                } else {
                    streamObject.put("streamType", "translation");
                }
                streamObject.put("transcribeLanguage", key.transcribeLanguage);
                if (key.streamType == AsrStreamType.TRANSLATION) {
                    streamObject.put("translateLanguage", key.translateLanguage);
                }
                streamsArray.put(streamObject);
            }

            configMessage.put("streams", streamsArray);
            webSocket.send(configMessage.toString());
            Log.d(TAG, "Sent ASR config: " + configMessage);

        } catch (JSONException e) {
            Log.e(TAG, "Error creating ASR config message", e);
        }
    }
}