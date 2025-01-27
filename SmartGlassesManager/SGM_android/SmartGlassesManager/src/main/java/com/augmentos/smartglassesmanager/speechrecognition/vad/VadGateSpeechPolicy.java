package com.augmentos.smartglassesmanager.speechrecognition.vad;

import android.content.Context;
import android.util.Log;

import com.konovalov.vad.Vad;
import com.konovalov.vad.VadListener;
import com.konovalov.vad.config.FrameSize;
import com.konovalov.vad.config.Mode;
import com.konovalov.vad.config.Model;
import com.konovalov.vad.config.SampleRate;
import com.konovalov.vad.models.VadModel;
import com.augmentos.smartglassesmanager.speechrecognition.google.asr.SpeechDetectionPolicy;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

/** A speech detector that always reports hearing speech. */
public class VadGateSpeechPolicy implements SpeechDetectionPolicy {
    public final String TAG = "WearLLM_VadGateService";
    private Context mContext;
    private Vad vad;
    private VadModel vadModel;
    private boolean isCurrentlySpeech;

    public VadGateSpeechPolicy(Context context){
       mContext = context;
       isCurrentlySpeech = false;
    }

    //custom - divide by 3, gives us best of both worlds - vosk runs best at ~0.2 second buffer, this runs best at 512-1024 size frame, so we run at 0.192second buffer and divide by 3
    public void startVad(int blockSizeSamples){
        vad = Vad.builder();

        blockSizeSamples = blockSizeSamples / 3;

        Log.d(TAG, "VAD looking for block size samples: " + blockSizeSamples);
        //find the proper frame size
        FrameSize fsToUse = null;
        for (FrameSize fs : FrameSize.values()){
            if (fs.getValue() == blockSizeSamples){
                fsToUse = fs;
                break;
            }
        }

        if (fsToUse == null){
            Log.e(TAG, "Frame size not supported by VAD, exiting.");
            return;
        }

        vadModel = vad.setModel(Model.SILERO_DNN)
                .setSampleRate(SampleRate.SAMPLE_RATE_16K)
                .setFrameSize(fsToUse)
//                .setMode(Mode.VERY_AGGRESSIVE)
                .setMode(Mode.AGGRESSIVE)
                .setSilenceDurationMs(1350)
                .setSpeechDurationMs(50)
                .setContext(mContext)
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
        short [] audioBytesFull = bytesToShort(bytes);
        int windowLen = audioBytesFull.length / 3;
        for (int i = 0; i < 3; i++) {
            int moffset = i * windowLen;
            short [] audioBytesPartial = Arrays.copyOfRange(audioBytesFull, moffset, moffset + windowLen);
            vadModel.setContinuousSpeechListener(audioBytesPartial, new VadListener() {
                @Override
                public void onSpeechDetected() {
                    //speech detected!
//                    Log.d(TAG, "Speech detected.");
                    isCurrentlySpeech = true;
                }

                @Override
                public void onNoiseDetected() {
                    //noise detected!
//                    Log.d(TAG, "Noise detected!");
                    isCurrentlySpeech = false;
                }
            });
        }
    }

    @Override
    public void stop() {
        vadModel.close();
    }
}