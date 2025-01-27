package com.augmentos.smartglassesmanager.speechrecognition.azure;

import com.microsoft.cognitiveservices.speech.audio.AudioStreamFormat;
import com.microsoft.cognitiveservices.speech.audio.PullAudioInputStreamCallback;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class AzureAudioInputStream extends PullAudioInputStreamCallback {

    private static final int SAMPLE_RATE = 16000;
    private static final short BITS_PER_SAMPLE = 16;
    private static final short CHANNELS = 1;

    private final AudioStreamFormat format;
    private final BlockingQueue<byte[]> audioQueue;
    private byte[] leftoverChunk;
    private int leftoverOffset;

    private static AzureAudioInputStream instance;

    private AzureAudioInputStream() {
        this.format = AudioStreamFormat.getWaveFormatPCM(SAMPLE_RATE, BITS_PER_SAMPLE, CHANNELS);
        this.audioQueue = new LinkedBlockingQueue<>();
        this.leftoverChunk = null;
        this.leftoverOffset = 0;
    }

    public static synchronized AzureAudioInputStream getInstance() {
        if (instance == null) {
            instance = new AzureAudioInputStream();
        }
        return instance;
    }

    public void push(byte[] audioChunk) {
        audioQueue.add(audioChunk);
    }

    @Override
    public int read(byte[] dataBuffer) {
        int bytesRead = 0;

        try {
            if (leftoverChunk != null) {
                int length = Math.min(leftoverChunk.length - leftoverOffset, dataBuffer.length);
                System.arraycopy(leftoverChunk, leftoverOffset, dataBuffer, 0, length);
                leftoverOffset += length;
                bytesRead = length;

                if (leftoverOffset >= leftoverChunk.length) {
                    leftoverChunk = null;
                    leftoverOffset = 0;
                }
            }

            while (bytesRead < dataBuffer.length) {
                byte[] chunk = audioQueue.take(); // Blocks if queue is empty
                int length = Math.min(chunk.length, dataBuffer.length - bytesRead);
                System.arraycopy(chunk, 0, dataBuffer, bytesRead, length);
                bytesRead += length;

                if (length < chunk.length) {
                    leftoverChunk = chunk;
                    leftoverOffset = length;
                    break;
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return 0;
        }

        return bytesRead;
    }

    @Override
    public void close() {
        audioQueue.clear();
    }

    public AudioStreamFormat getFormat() {
        return this.format;
    }
}
