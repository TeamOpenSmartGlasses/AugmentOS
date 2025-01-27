package com.teamopensmartglasses.smartglassesmanager.speechrecognition.augmentos;

import android.content.Context;
import android.util.Log;

import com.teamopensmartglasses.augmentoslib.SpeechRecUtils;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.TranslateOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.AsrStreamKey;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.SpeechRecFramework;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.vad.VadGateSpeechPolicy;
import com.teamopensmartglasses.smartglassesmanager.utils.EnvHelper;

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
    private final String currentLanguageCode;
    private final String targetLanguageCode;
    private final boolean isTranslation;
    private final WebSocketStreamManager webSocketManager;
    private final BlockingQueue<byte[]> rollingBuffer;
    private final int bufferMaxSize;

    //VAD
    private VadGateSpeechPolicy vadPolicy;
    private volatile boolean isSpeaking = false; // Track VAD state

    private SpeechRecAugmentos(Context context, String languageLocale) {
        this.mContext = context;
        this.currentLanguageCode = SpeechRecUtils.languageToLocale(languageLocale);
        this.targetLanguageCode = null;
        this.isTranslation = false;
        this.webSocketManager = WebSocketStreamManager.getInstance(getServerUrl());

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

    //translation mode
    private SpeechRecAugmentos(Context context, String currentLanguageLocale, String targetLanguageLocale) {
        this.mContext = context;
        this.currentLanguageCode = SpeechRecUtils.languageToLocale(currentLanguageLocale);
        this.targetLanguageCode = SpeechRecUtils.languageToLocale(targetLanguageLocale);
        this.isTranslation = true;
        this.webSocketManager = WebSocketStreamManager.getInstance(getServerUrl());

        // Rolling buffer stores last 3 seconds of audio
        this.bufferMaxSize = (16000 * 3 * 2) / 512; // ~3 sec buffer (assuming 512-byte chunks)
        this.rollingBuffer = new LinkedBlockingQueue<>(bufferMaxSize);

        //VAD
        this.vadPolicy = new VadGateSpeechPolicy(mContext);
        this.vadPolicy.init(512);
        setupVadListener();
        startVadProcessingThread();

        setupWebSocketCallbacks();

        if (isTranslation) {
            Log.d(TAG, "Translation requested but not yet implemented");
        }
    }

    private String getServerUrl() {
        String host = EnvHelper.getEnv("AUGMENTOS_ASR_HOST");
        String port = EnvHelper.getEnv("AUGMENTOS_ASR_PORT");
        if (host == null || port == null) {
            throw new IllegalStateException("AugmentOS ASR config not found. Please ensure AUGMENTOS_ASR_HOST and AUGMENTOS_ASR_PORT are set.");
        }
        return String.format("ws://%s:%s", host, port);
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
        webSocketManager.addCallback(new WebSocketStreamManager.WebSocketCallback() {
            @Override
            public void onInterimTranscript(String text, long timestamp) {
                Log.d(TAG, "Got intermediate transcription: " + text);
                if (text != null && !text.trim().isEmpty()) {
                    EventBus.getDefault().post(new SpeechRecOutputEvent(text, currentLanguageCode, timestamp, false));
                }
            }

            @Override
            public void onFinalTranscript(String text, long timestamp) {
                Log.d(TAG, "Got final transcription: " + text);
                if (text != null && !text.trim().isEmpty()) {
                    EventBus.getDefault().post(new SpeechRecOutputEvent(text, currentLanguageCode, timestamp, true));
                }
            }

            @Override
            public void onInterimTranslation(String translatedText, long timestamp) {
                Log.d(TAG, "Got intermediate translation: " + translatedText);
                if (translatedText != null && !translatedText.trim().isEmpty()) {
                    EventBus.getDefault().post(new TranslateOutputEvent(translatedText, currentLanguageCode, timestamp, false, true));
                }
            }

            @Override
            public void onFinalTranslation(String translatedText, long timestamp) {
                Log.d(TAG, "Got final translation: " + translatedText);
                if (translatedText != null && !translatedText.trim().isEmpty()) {
                    EventBus.getDefault().post(new TranslateOutputEvent(translatedText, currentLanguageCode, timestamp, true, true));
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
        webSocketManager.connect(currentLanguageCode);
    }

    @Override
    public void destroy() {
        Log.d(TAG, "Destroying Speech Recognition Service");
        webSocketManager.disconnect();
    }

    public static synchronized SpeechRecAugmentos getInstance(Context context, String languageLocale) {
        if (instance == null || instance.isTranslation || !instance.currentLanguageCode.equals(languageLocale)) {
            if (instance != null) {
                instance.destroy();
            }
            instance = new SpeechRecAugmentos(context, languageLocale);
        }
        return instance;
    }

    public static synchronized SpeechRecAugmentos getInstance(Context context, String currentLanguageLocale, String targetLanguageLocale) {
        if (instance == null || !instance.isTranslation ||
                !instance.currentLanguageCode.equals(currentLanguageLocale) ||
                !instance.targetLanguageCode.equals(targetLanguageLocale)) {
            if (instance != null) {
                instance.destroy();
            }
            instance = new SpeechRecAugmentos(context, currentLanguageLocale, targetLanguageLocale);
        }
        return instance;
    }

    public void updateConfig(List<AsrStreamKey> languages){
        webSocketManager.updateConfig(languages);
    }
}