package com.augmentos.augmentos_core.smarterglassesmanager.hci;

//thanks to https://github.com/aahlenst/android-audiorecord-sample/blob/master/src/main/java/com/example/audiorecord/BluetoothRecordActivity.java

import android.Manifest;
import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.CountDownTimer;
import android.os.Handler;
import android.util.Log;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;

import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.ScoStartEvent;

import org.greenrobot.eventbus.EventBus;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.atomic.AtomicBoolean;

public class MicrophoneLocalAndBluetooth {
    private static final String TAG = "WearableAi_MicrophoneLocalAndBluetooth";

    private static final int SAMPLING_RATE_IN_HZ = 16000;
    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;
    private final static float BUFFER_SIZE_SECONDS = 0.128f; // gives us 2048
    private static final int BUFFER_SIZE_FACTOR = 2;
    private final int bufferSize;
    private boolean bluetoothAudio = false; // are we using local audio or bluetooth audio?
    private int retries = 0;
    private int retryLimit = 3;

    private Handler mHandler;

    private final AtomicBoolean recordingInProgress = new AtomicBoolean(false);
    private final AtomicBoolean isDestroyed = new AtomicBoolean(false); // Add this flag to indicate destruction

    // Flag to track receiver registration status
    private boolean isReceiverRegistered = false;

    private final BroadcastReceiver bluetoothStateReceiver = new BroadcastReceiver() {
        private BluetoothState bluetoothState = BluetoothState.UNAVAILABLE;

        @Override
        public void onReceive(Context context, Intent intent) {
            if (isDestroyed.get()) {
                // Don't process events if we're in destroyed state
                return;
            }

            String action = intent.getAction();
            if (action.equals(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)) {
                int state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1);
                switch (state) {
                    case AudioManager.SCO_AUDIO_STATE_CONNECTED:
                        if (mIsStarting) {
                            mIsStarting = false;
                        }
                        if (mIsCountDownOn) {
                            mIsCountDownOn = false;
                            mCountDown.cancel();
                        }
                        bluetoothAudio = true;
                        startRecording();
                        break;
                    case AudioManager.SCO_AUDIO_STATE_CONNECTING:
                        handleBluetoothStateChange(BluetoothState.UNAVAILABLE);
                        break;
                    case AudioManager.SCO_AUDIO_STATE_DISCONNECTED:
                        handleBluetoothStateChange(BluetoothState.UNAVAILABLE);
                        break;
                    case AudioManager.SCO_AUDIO_STATE_ERROR:
                        handleBluetoothStateChange(BluetoothState.UNAVAILABLE);
                        break;
                }
            } else if (action.equals(BluetoothDevice.ACTION_ACL_CONNECTED)) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                Log.d(TAG, "Bluetooth device connected: " + (device != null ? device.getName() : "Unknown"));
                handleNewBluetoothDevice();
            } else if (action.equals(BluetoothDevice.ACTION_ACL_DISCONNECTED)) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                Log.d(TAG, "Bluetooth device disconnected: " + (device != null ? device.getName() : "Unknown"));
                handleDisconnectBluetoothDevice();
            }
        }

        private void handleBluetoothStateChange(BluetoothState state) {
            if (bluetoothState == state) {
                return;
            }
            bluetoothState = state;
            bluetoothStateChanged(state);
        }

        private void handleNewBluetoothDevice() {
            Log.d(TAG, "New Bluetooth device connected, attempting SCO connection");
            retries = 0;
            // Try to use Bluetooth audio when a new device connects
            bluetoothAudio = true;
            // Reset and start the countdown timer for SCO connection
            mIsCountDownOn = true;
            if (mCountDown != null) {
                mCountDown.cancel();
            }
            mCountDown.start();
            // Try to activate Bluetooth SCO immediately
            activateBluetoothSco();
        }

        private void handleDisconnectBluetoothDevice() {
            if (mIsCountDownOn) {
                mIsCountDownOn = false;
                mCountDown.cancel();
            }
            bluetoothAudio = false;
            deactivateBluetoothSco();
            startRecording();
        }
    };

    private AudioRecord recorder = null;

    private AudioManager audioManager;
    private boolean mIsCountDownOn = false;
    private boolean mIsStarting = false;

    private Thread recordingThread = null;

    private Context mContext;

    private AudioChunkCallback mChunkCallback;
    private CountDownTimer mCountDown;

    public MicrophoneLocalAndBluetooth(Context context, boolean useBluetoothSco, AudioChunkCallback chunkCallback) {
        this(context, chunkCallback);
        useBluetoothMic(useBluetoothSco);
    }

    public MicrophoneLocalAndBluetooth(Context context, AudioChunkCallback chunkCallback) {
        bufferSize = Math.round(SAMPLING_RATE_IN_HZ * BUFFER_SIZE_SECONDS);

        mIsStarting = true;

        mContext = context;

        audioManager = (AudioManager) mContext.getSystemService(Context.AUDIO_SERVICE);

        mChunkCallback = chunkCallback;

        mHandler = new Handler();

        // Initialize the countdown timer
        initCountDownTimer();

        startRecording();
    }

    private void initCountDownTimer() {
        if (mCountDown != null) {
            mCountDown.cancel();
        }

        mCountDown = new CountDownTimer(1201, 400) {
            @Override
            public void onTick(long millisUntilFinished) {
                if (!isDestroyed.get()) {
                    audioManager.startBluetoothSco();
                }
            }

            @Override
            public void onFinish() {
                if (isDestroyed.get()) {
                    return;
                }
                mIsCountDownOn = false;
                bluetoothAudio = false;
                startRecording();
            }
        };
    }

    private void useBluetoothMic(boolean shouldUseBluetoothSco) {
        if (isDestroyed.get()) {
            return;
        }

        bluetoothAudio = shouldUseBluetoothSco;

        if (shouldUseBluetoothSco) {
            startBluetoothSco();
        } else {
            stopBluetoothSco();
        }

        if (recordingInProgress.get()) {
            startRecording();
        }
    }

    private void startBluetoothSco() {
        if (isDestroyed.get()) {
            return;
        }

        IntentFilter filter = new IntentFilter();
        filter.addAction(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED);
        filter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED);
        filter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED);

        try {
            if (isReceiverRegistered) {
                mContext.unregisterReceiver(bluetoothStateReceiver);
            }
            mContext.registerReceiver(bluetoothStateReceiver, filter);
            isReceiverRegistered = true;
        } catch (Exception e) {
            Log.e(TAG, "Error registering bluetooth receiver", e);
        }

        mIsCountDownOn = true;
        mCountDown.start();
    }

    private void stopBluetoothSco() {
        mIsCountDownOn = false;
        if (mCountDown != null) {
            mCountDown.cancel();
        }

        if (isReceiverRegistered) {
            try {
                mContext.unregisterReceiver(bluetoothStateReceiver);
                isReceiverRegistered = false;
                Log.d(TAG, "Bluetooth state receiver unregistered in stopBluetoothSco()");
            } catch (IllegalArgumentException e) {
                e.printStackTrace();
            }
        }
    }

    private synchronized void startRecording() {
        Log.d(TAG, "Starting recording...");

        if (isDestroyed.get()) {
            Log.d(TAG, "Not starting recording because the class is destroyed");
            return;
        }

        if (recorder != null) {
            stopRecording();
        }

        if (bluetoothAudio) {
            audioManager.setMode(AudioManager.MODE_IN_CALL);
            EventBus.getDefault().post(new ScoStartEvent(true));
        } else {
            audioManager.setMode(AudioManager.MODE_NORMAL);
            EventBus.getDefault().post(new ScoStartEvent(false));
        }

        if (ActivityCompat.checkSelfPermission(mContext, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(this.mContext, "Need permissions to start audio", Toast.LENGTH_LONG).show();
            stopRecording();
            return;
        }

        try {
            recorder = new AudioRecord(MediaRecorder.AudioSource.UNPROCESSED,
                    SAMPLING_RATE_IN_HZ, CHANNEL_CONFIG, AUDIO_FORMAT, bufferSize * 2);

            if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "Failed to initialize AudioRecord");
                Toast.makeText(this.mContext, "Error starting onboard microphone", Toast.LENGTH_LONG).show();
                stopRecording();
                return;
            }

            recorder.startRecording();

            recordingInProgress.set(true);

            recordingThread = new Thread(new RecordingRunnable(), "Recording Thread");
            recordingThread.setDaemon(true); // Make it a daemon thread so it doesn't prevent JVM shutdown
            recordingThread.start();
        } catch (Exception e) {
            Log.e(TAG, "Error in startRecording", e);
            stopRecording();
        }
    }

    private void stopAndroidMics(){
        mIsCountDownOn = false;
        if (mCountDown != null) {
            mCountDown.cancel();
        }
        deactivateBluetoothSco();
        audioManager.setMode(AudioManager.MODE_NORMAL);

        stopRecording();
    }

    private synchronized void stopRecording() {
        Log.d(TAG, "Running stopRecording...");

        if (recorder == null) {
            Log.d(TAG, "--- Recorder null, exiting.");
            return;
        }

        recordingInProgress.set(false);

        try {
            // Only call stop if the recorder is actually recording.
            if (recorder.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                recorder.stop();
            } else {
                Log.d(TAG, "AudioRecord is not recording; skipping stop.");
            }
        } catch (IllegalStateException e) {
            Log.e(TAG, "Error stopping AudioRecord", e);
        } finally {
            try {
                recorder.release();
            } catch (Exception e) {
                Log.e(TAG, "Error releasing AudioRecord", e);
            }
            recorder = null;
        }

        // Interrupt the recording thread to ensure it stops
        if (recordingThread != null) {
            try {
                recordingThread.interrupt();
                // Wait for thread to finish, but not indefinitely
                recordingThread.join(1000);
            } catch (InterruptedException e) {
                Log.e(TAG, "Interrupted while waiting for recording thread to finish", e);
            }
            recordingThread = null;
        }
    }

    private void activateBluetoothSco() {
        if (isDestroyed.get() || audioManager == null) {
            return;
        }

        retries += 1;
        Log.d(TAG, "Activating Bluetooth SCO (attempt " + retries + ")");

        if (!audioManager.isBluetoothScoAvailableOffCall()) {
            Log.e(TAG, "SCO is not available, recording is not possible");
            return;
        }

        try {
            // First check if SCO is already on
            if (audioManager.isBluetoothScoOn()) {
                Log.d(TAG, "Bluetooth SCO is already on");
            } else {
                // If not, try to start it
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                audioManager.startBluetoothSco();
                Log.d(TAG, "Started Bluetooth SCO");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error activating Bluetooth SCO", e);
        }
    }

    private void deactivateBluetoothSco() {
        try {
            audioManager.stopBluetoothSco();
        } catch (Exception e) {
            Log.e(TAG, "Error deactivating Bluetooth SCO", e);
        }
    }

    private void bluetoothStateChanged(BluetoothState state) {
        if (isDestroyed.get()) {
            return;
        }

        Log.d(TAG, "Bluetooth state changed to: " + state);

        if (BluetoothState.UNAVAILABLE == state) {
            Log.d(TAG, "Bluetooth is unavailable, switching to device microphone");
            bluetoothAudio = false;
            if (recordingInProgress.get()) {
                stopRecording();
            }
            deactivateBluetoothSco();
            startRecording();
        } else if (BluetoothState.AVAILABLE == state) {
            Log.d(TAG, "Bluetooth is available, switching to Bluetooth microphone");
            bluetoothAudio = true;
            if (recordingInProgress.get()) {
                stopRecording();
            }
            activateBluetoothSco();
            startRecording();
        }
    }

    private class RecordingRunnable implements Runnable {
        @Override
        public void run() {
            short[] short_buffer = new short[bufferSize];
            ByteBuffer b_buffer = ByteBuffer.allocate(short_buffer.length * 2);

            AudioRecord localRecorder;
            while (recordingInProgress.get() && !isDestroyed.get() && !Thread.currentThread().isInterrupted()) {
                // Store a local reference to the recorder to prevent null pointer issues
                localRecorder = recorder;
                try {
                    // Check if the local recorder is still valid
                    if (localRecorder == null) {
                        // Exit the loop if recorder has been released
                        break;
                    }

                    int result = localRecorder.read(short_buffer, 0, short_buffer.length);
                    if (result < 0) {
                        Log.d(TAG, "Error reading from AudioRecord: " + getBufferReadFailureReason(result));
                        break;
                    }

                    b_buffer.order(ByteOrder.LITTLE_ENDIAN);
                    b_buffer.asShortBuffer().put(short_buffer);
                    if (!isDestroyed.get() && mChunkCallback != null) {
                        mChunkCallback.onSuccess(b_buffer);
                    }
                    b_buffer.clear();

                    // Update the local recorder reference for the next iteration
                    localRecorder = recorder;

                    // Add a small sleep to prevent thread from hogging CPU
                    Thread.sleep(5);
                } catch (InterruptedException e) {
                    // Thread was interrupted, exit gracefully
                    Thread.currentThread().interrupt();
                    Log.d(TAG, "Recording thread interrupted");
                    break;
                } catch (Exception e) {
                    Log.e(TAG, "Error in recording thread", e);
                    break;
                }
            }

            Log.d(TAG, "Recording thread exiting");
        }

        private String getBufferReadFailureReason(int errorCode) {
            switch (errorCode) {
                case AudioRecord.ERROR_INVALID_OPERATION:
                    return "ERROR_INVALID_OPERATION";
                case AudioRecord.ERROR_BAD_VALUE:
                    return "ERROR_BAD_VALUE";
                case AudioRecord.ERROR_DEAD_OBJECT:
                    return "ERROR_DEAD_OBJECT";
                case AudioRecord.ERROR:
                    return "ERROR";
                default:
                    return "Unknown (" + errorCode + ")";
            }
        }
    }

    enum BluetoothState {
        AVAILABLE, UNAVAILABLE
    }

    public synchronized void destroy() {
        Log.d(TAG, "Destroying local microphone...");

        // If already destroyed, exit early
        if (isDestroyed.get()) {
            Log.d(TAG, "Already destroyed, skipping");
            return;
        }

        // Set the destroyed flag first to prevent any new operations
        isDestroyed.set(true);

        // Cancel the countdown timer
        if (mCountDown != null) {
            mIsCountDownOn = false;
            mCountDown.cancel();
            mCountDown = null;
        }

        // Stop recording
        stopRecording();

        // Clean up Bluetooth SCO
        try {
            deactivateBluetoothSco();
            if (audioManager != null) {
                audioManager.setMode(AudioManager.MODE_NORMAL);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cleaning up Bluetooth SCO", e);
        }

        // Unregister the receiver
        if (mContext != null && isReceiverRegistered) {
            try {
                mContext.unregisterReceiver(bluetoothStateReceiver);
                isReceiverRegistered = false;
                Log.d(TAG, "Bluetooth state receiver unregistered in destroy()");
            } catch (IllegalArgumentException e) {
                Log.e(TAG, "Error unregistering receiver", e);
            }
        }

        // Clear references
        mContext = null;
        mChunkCallback = null;
        mHandler = null;
        audioManager = null;

        Log.d(TAG, "MicrophoneLocalAndBluetooth fully destroyed");
    }
}