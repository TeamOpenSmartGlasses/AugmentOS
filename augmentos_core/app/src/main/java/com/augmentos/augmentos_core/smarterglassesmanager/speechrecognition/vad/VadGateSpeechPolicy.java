package com.augmentos.augmentos_core.smarterglassesmanager.speechrecognition.vad;

import android.content.Context;
import android.util.Log;

import com.augmentos.augmentos_core.smarterglassesmanager.speechrecognition.google.asr.SpeechDetectionPolicy;
import com.konovalov.vad.webrtc.Vad;
import com.konovalov.vad.webrtc.VadWebRTC;
import com.konovalov.vad.webrtc.config.FrameSize;
import com.konovalov.vad.webrtc.config.Mode;
import com.konovalov.vad.webrtc.config.SampleRate;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

/** A speech detector that always reports hearing speech. */
public class VadGateSpeechPolicy implements SpeechDetectionPolicy {
    public final String TAG = "WearLLM_VadGateService";
    private Context mContext;
    private VadWebRTC vad;
    private boolean isCurrentlySpeech;

    public VadGateSpeechPolicy(Context context){
       mContext = context;
       isCurrentlySpeech = false;
    }

    public void startVad(int blockSizeSamples){
        vad  = Vad.builder()
                .setSampleRate(SampleRate.SAMPLE_RATE_16K)
                .setFrameSize(FrameSize.FRAME_SIZE_320)
                .setMode(Mode.VERY_AGGRESSIVE)
                .setSilenceDurationMs(12000)
                .setSpeechDurationMs(50)
                .build();

        Log.d(TAG, "VAD init'ed.");
    }

    @Override
    public boolean shouldPassAudioToRecognizer() {
        return isCurrentlySpeech;
    }

    @Override
    public void init(int blockSizeSamples) {
        startVad(blockSizeSamples);
    }

    @Override
    public void reset() {}

    public short [] bytesToShort(byte[] bytes) {
        short[] shorts = new short[bytes.length/2];
        // to turn bytes to shorts as either big endian or little endian.
        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(shorts);
        return shorts;
    }

    @Override
    public void processAudioBytes(byte[] bytes, int offset, int length) {
        short[] audioBytesFull = bytesToShort(bytes);

        // Keep track of previous state
        boolean previousSpeechState = isCurrentlySpeech;

        // Ensure we process only full 320-sample frames
        int totalSamples = audioBytesFull.length;
        int frameSize = 320;

        if (totalSamples % frameSize != 0) {
            Log.e(TAG, "Invalid audio frame size: " + totalSamples + " samples. Needs to be multiple of 512.");
            return; // Skip processing if we have an invalid size
        }

        for (int i = 0; i < totalSamples / frameSize; i++) {
            int startIdx = i * frameSize;
            short[] audioBytesPartial = Arrays.copyOfRange(audioBytesFull, startIdx, startIdx + frameSize);

            isCurrentlySpeech = vad.isSpeech(audioBytesPartial);

            // Log only when the state changes
            if (isCurrentlySpeech != previousSpeechState) {
                Log.d(TAG, "Speech detection changed to: " + (isCurrentlySpeech ? "SPEECH" : "SILENCE"));
                previousSpeechState = isCurrentlySpeech;
            }
        }
    }

    @Override
    public void stop() {
        vad.close();
    }
}