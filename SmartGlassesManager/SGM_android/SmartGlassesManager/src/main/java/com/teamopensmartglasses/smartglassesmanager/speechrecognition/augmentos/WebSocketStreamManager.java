package com.teamopensmartglasses.smartglassesmanager.speechrecognition.augmentos;

import android.util.Log;

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
    private boolean lastVadState = false; // Track last sent VAD state to avoid redundant messages

    public interface WebSocketCallback {
        void onInterimTranscript(String text, long timestamp);
        void onFinalTranscript(String text, long timestamp);
        void onError(String error);
    }

    private WebSocketStreamManager(String url) {
        this.serverUrl = url;
        this.client = new OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS) // No timeout for reading
                .build();
        this.audioQueue = new LinkedBlockingQueue<>();
    }

    public static synchronized WebSocketStreamManager getInstance(String url) {
        if (instance == null) {
            instance = new WebSocketStreamManager(url);
        }
        return instance;
    }

    public void addCallback(WebSocketCallback callback) {
        callbacks.add(callback);
    }

    public void removeCallback(WebSocketCallback callback) {
        callbacks.remove(callback);
    }

    public void disconnect() {
        isConnected = false;
        stopAudioSender();

        if (webSocket != null) {
            audioQueue.clear();
            callbacks.clear();
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

    public void connect(String languageCode) {
        if (client == null) {
            client = new OkHttpClient.Builder()
                    .readTimeout(0, TimeUnit.MILLISECONDS)
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

                JSONObject config = new JSONObject();
                try {
                    config.put("language", languageCode);
                    webSocket.send(config.toString());
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
                    String transcriptText = message.getString("text");
                    long timestamp = (long)(message.getDouble("timestamp") * 1000);

                    for (WebSocketCallback callback : callbacks) {
                        if ("interim".equals(type)) {
                            callback.onInterimTranscript(transcriptText, timestamp);
                        } else if ("final".equals(type)) {
                            callback.onFinalTranscript(transcriptText, timestamp);
                        }
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Error parsing message", e);
                }
            }

            @Override
            public void onClosing(WebSocket webSocket, int code, String reason) {
                Log.d(TAG, "WebSocket Closing: " + reason);
                isConnected = false;
                stopAudioSender();
            }

            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                Log.e(TAG, "WebSocket Failure", t);
                isConnected = false;
                stopAudioSender();

                for (WebSocketCallback callback : callbacks) {
                    callback.onError("WebSocket failure: " + t.getMessage());
                }
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
        Log.d(TAG, "Sending VAD status");
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
}
