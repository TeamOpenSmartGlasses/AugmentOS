package com.augmentos.smartglassesmanager.speechrecognition.augmentos;

import android.content.Context;
import android.util.Log;

import com.augmentos.augmentoslib.events.SpeechRecOutputEvent;
import com.augmentos.augmentoslib.events.TranslateOutputEvent;
import com.augmentos.smartglassesmanager.speechrecognition.AsrStreamKey;
import com.augmentos.smartglassesmanager.speechrecognition.SpeechRecFramework;
import com.augmentos.smartglassesmanager.speechrecognition.vad.VadGateSpeechPolicy;
import com.augmentos.smartglassesmanager.utils.EnvHelper;

import org.greenrobot.eventbus.EventBus;

import java.lang.reflect.Field;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class SpeechRecAugmentos extends SpeechRecFramework {
    private static final String TAG = "WearableAi_SpeechRecAugmentos";
    private static SpeechRecAugmentos instance;

    private final Context mContext;
    private WebSocketStreamManager webSocketManager;
    private final BlockingQueue<byte[]> rollingBuffer;
    private final int bufferMaxSize;

    //VAD
    private VadGateSpeechPolicy vadPolicy;
    private volatile boolean isSpeaking = false; // Track VAD state

    //don't setup web socket callbacks twice
    private boolean haveSetupCallbacks = false;

    private SpeechRecAugmentos(Context context) {
        this.mContext = context;
        webSocketManager = WebSocketStreamManager.getInstance(getServerUrl());

        // Rolling buffer stores last 3 seconds of audio
        this.bufferMaxSize = (int) ((16000 * 0.15 * 2) / 512); // ~150ms buffer (assuming 512-byte chunks)
        this.rollingBuffer = new LinkedBlockingQueue<>(bufferMaxSize);

        //VAD
        this.vadPolicy = new VadGateSpeechPolicy(mContext);
        this.vadPolicy.init(512);
        setupVadListener();
        startVadProcessingThread();

        setupWebSocketCallbacks();
    }

    private String getServerUrl() {
        String host = EnvHelper.getEnv("AUGMENTOS_ASR_HOST");
        String port = EnvHelper.getEnv("AUGMENTOS_ASR_PORT");
        if (host == null || port == null) {
            throw new IllegalStateException("AugmentOS ASR config not found. Please ensure AUGMENTOS_ASR_HOST and AUGMENTOS_ASR_PORT are set.");
        }
        // Use wss:// for secure WebSocket connection
        return String.format("wss://%s", host);
    }

    private void setupVadListener() {
        new Thread(() -> {
            while (true) {
                boolean newVadState = vadPolicy.shouldPassAudioToRecognizer();

                if (newVadState && !isSpeaking) {
                    webSocketManager.sendVadStatus(true);
                    sendBufferedAudio();
                    isSpeaking = true;
                } else if (!newVadState && isSpeaking) {
                    isSpeaking = false;
                    webSocketManager.sendVadStatus(false);
                }

                try {
                    Thread.sleep(50); // Polling interval
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }).start();
    }

    private void setupWebSocketCallbacks() {
        //make sure we don't setup the callback twice
        if (haveSetupCallbacks){
            return;
        }
        haveSetupCallbacks = true;

        webSocketManager.addCallback(new WebSocketStreamManager.WebSocketCallback() {
            @Override
            public void onInterimTranscript(String text, String language, long timestamp) {
                Log.d(TAG, "Got intermediate transcription: " + text + " (language: " + language + ")");
                if (text != null && !text.trim().isEmpty()) {
                    EventBus.getDefault().post(new SpeechRecOutputEvent(text, language, timestamp, false));
                }
            }

            @Override
            public void onFinalTranscript(String text, String language, long timestamp) {
                Log.d(TAG, "Got final transcription: " + text + " (language: " + language + ")");
                if (text != null && !text.trim().isEmpty()) {
                    EventBus.getDefault().post(new SpeechRecOutputEvent(text, language, timestamp, true));
                }
            }

            @Override
            public void onInterimTranslation(String translatedText, String fromLanguage, String toLanguage, long timestamp) {
                Log.d(TAG, "Got intermediate translation: " + translatedText +
                        " (from: " + fromLanguage + ", to: " + toLanguage + ")");
                if (translatedText != null && !translatedText.trim().isEmpty()) {
                    EventBus.getDefault().post(new TranslateOutputEvent(
                            translatedText,
                            fromLanguage,
                            toLanguage,
                            timestamp,
                            false  // not final
                    ));
                }
            }

            @Override
            public void onFinalTranslation(String translatedText, String fromLanguage, String toLanguage, long timestamp) {
                Log.d(TAG, "Got final translation: " + translatedText +
                        " (from: " + fromLanguage + ", to: " + toLanguage + ")");
                if (translatedText != null && !translatedText.trim().isEmpty()) {
                    EventBus.getDefault().post(new TranslateOutputEvent(
                            translatedText,
                            fromLanguage,
                            toLanguage,
                            timestamp,
                            true   // is final
                    ));
                }
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "WebSocket error: " + error);
                // Could add error handling/retry logic here
            }
        });
    }

    private void sendBufferedAudio() {
        Log.d(TAG, "Sending buffered audio...");

        List<byte[]> bufferDump = new ArrayList<>();
        rollingBuffer.drainTo(bufferDump);

        for (byte[] chunk : bufferDump) {
            webSocketManager.writeAudioChunk(chunk);
        }
    }

    private final BlockingQueue<Short> vadBuffer = new LinkedBlockingQueue<>(); // VAD buffer
    private final int vadFrameSize = 512;  // Silero expects 512-sample frames
    private volatile boolean vadRunning = true; // Control VAD processing thread

    @Override
    public void ingestAudioChunk(byte[] audioChunk) {
        if (vadPolicy == null) {
            Log.e(TAG, "VAD policy is not initialized yet. Skipping audio processing.");
            return;
        }

        if (!isVadInitialized()) {
            Log.e(TAG, "VAD model is not initialized properly. Skipping audio processing.");
            return;
        }

        // Convert byte[] to short[]
        short[] audioSamples = bytesToShort(audioChunk);

        // Add samples to the VAD buffer
        for (short sample : audioSamples) {
            if (vadBuffer.size() >= 16000) { // Keep max ~1 sec of audio
                vadBuffer.poll(); // Drop the oldest sample
            }
            vadBuffer.offer(sample);
        }

        if (isSpeaking) {
            webSocketManager.writeAudioChunk(audioChunk);
        }

        // Maintain rolling buffer for sending to WebSocket
        if (rollingBuffer.size() >= bufferMaxSize) {
            rollingBuffer.poll(); // Remove oldest chunk
        }
        rollingBuffer.offer(audioChunk);
    }

    private void startVadProcessingThread() {
        new Thread(() -> {
            while (vadRunning) {
                try {
                    // Wait until we have at least 512 samples
                    while (vadBuffer.size() < vadFrameSize) {
                        Thread.sleep(5); // Wait for more data to arrive
                    }

                    // Extract exactly 512 samples
                    short[] vadChunk = new short[vadFrameSize];
                    for (int i = 0; i < vadFrameSize; i++) {
                        vadChunk[i] = vadBuffer.poll();
                    }

                    // Send chunk to VAD
                    vadPolicy.processAudioBytes(shortsToBytes(vadChunk), 0, vadChunk.length * 2);

                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }).start();
    }

    // Utility method to convert short[] to byte[]
    private byte[] shortsToBytes(short[] shorts) {
        ByteBuffer byteBuffer = ByteBuffer.allocate(shorts.length * 2);
        byteBuffer.order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().put(shorts);
        return byteBuffer.array();
    }

    private short[] bytesToShort(byte[] bytes) {
        short[] shorts = new short[bytes.length / 2];
        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(shorts);
        return shorts;
    }

    private boolean isVadInitialized() {
        try {
            Field vadModelField = vadPolicy.getClass().getDeclaredField("vadModel");
            vadModelField.setAccessible(true);
            Object vadModel = vadModelField.get(vadPolicy);
            return vadModel != null;
        } catch (Exception e) {
            Log.e(TAG, "Failed to check if VAD is initialized.", e);
            return false;
        }
    }

    @Override
    public void start() {
        Log.d(TAG, "Starting Speech Recognition Service");
        webSocketManager.connect();
    }

    @Override
    public void destroy() {
        Log.d(TAG, "Destroying Speech Recognition Service");
        if (webSocketManager != null) {
            webSocketManager.disconnect();
            webSocketManager = null;
        }
    }

    public static synchronized SpeechRecAugmentos getInstance(Context context) {
        if (instance != null) {
            instance.destroy();
        }
        instance = new SpeechRecAugmentos(context);
        return instance;
    }

    public void updateConfig(List<AsrStreamKey> languages){
        webSocketManager.updateConfig(languages);
    }
}