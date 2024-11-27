package com.wearableintelligencesystem.androidsmartglasses.sensors;

//thanks to https://github.com/aahlenst/android-audiorecord-sample/blob/master/src/main/java/com/example/audiorecord/BluetoothRecordActivity.java


import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.CountDownTimer;
import android.os.Handler;
import android.util.Log;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Sample that demonstrates how to record from a Bluetooth HFP microphone using {@link AudioRecord}.
 */
public class BluetoothMic {

    private static final String TAG = "WearableAi_" + BluetoothMic.class.getCanonicalName();

    private static final int SAMPLING_RATE_IN_HZ = 16000;

    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;

    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;

    /**
     * Factor by that the minimum buffer size is multiplied. The bigger the factor is the less
     * likely it is that samples will be dropped, but more memory will be used. The minimum buffer
     * size is determined by {@link AudioRecord#getMinBufferSize(int, int, int)} and depends on the
     * recording settings.
     */
//    private final static float BUFFER_SIZE_SECONDS = 0.2f;
    private final static float BUFFER_SIZE_SECONDS = 0.192f;
    private static final int BUFFER_SIZE_FACTOR = 2;
    private final int bufferSize;

    private boolean bluetoothAudio = false; //are we using local audio or bluetooth audio?
    private int retries = 0;
    private int retryLimit = 3;

    private Handler mHandler;

    /**
     * Size of the buffer where the audio data is stored by Android
     */
//    private static final int BUFFER_SIZE = AudioRecord.getMinBufferSize(SAMPLING_RATE_IN_HZ,
//            CHANNEL_CONFIG, AUDIO_FORMAT) * BUFFER_SIZE_FACTOR;

    /**
     * Signals whether a recording is in progress (true) or not (false).
     */
    private final AtomicBoolean recordingInProgress = new AtomicBoolean(false);

    private final BroadcastReceiver bluetoothStateReceiver = new BroadcastReceiver() {

        private BluetoothState bluetoothState = BluetoothState.UNAVAILABLE;

        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (action.equals(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)) {
                int state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1);
                switch (state) {
                    case AudioManager.SCO_AUDIO_STATE_CONNECTED:
                        Log.i(TAG, "Bluetooth HFP Headset is connected");
                        //handleBluetoothStateChange(BluetoothState.AVAILABLE);
                        if (mIsStarting)
                        {
                            // When the device is connected before the application starts,
                            // ACTION_ACL_CONNECTED will not be received, so call onHeadsetConnected here
                            mIsStarting = false;
                        }

                        if (mIsCountDownOn)
                        {
                            mIsCountDownOn = false;
                            mCountDown.cancel();
                        }
                        bluetoothAudio = true;
                        startRecording();
                        break;
                    case AudioManager.SCO_AUDIO_STATE_CONNECTING:
                        Log.i(TAG, "Bluetooth HFP Headset is connecting");
                        handleBluetoothStateChange(BluetoothState.UNAVAILABLE);
                    case AudioManager.SCO_AUDIO_STATE_DISCONNECTED:
                        Log.i(TAG, "Bluetooth HFP Headset is disconnected");
                        //handleBluetoothStateChange(BluetoothState.UNAVAILABLE);
                        // Always receive SCO_AUDIO_STATE_DISCONNECTED on call to startBluetooth()
                        // which at that stage we do not want to do anything. Thus the if condition.
                        break;
                    case AudioManager.SCO_AUDIO_STATE_ERROR:
                        Log.i(TAG, "Bluetooth HFP Headset is in error state");
                        handleBluetoothStateChange(BluetoothState.UNAVAILABLE);
                        break;
                }
            } else if (action.equals(BluetoothDevice.ACTION_ACL_CONNECTED)){
                    Log.i(TAG, "New bluetooth device is available");
                    handleNewBluetoothDevice();
            } else if (action.equals(BluetoothDevice.ACTION_ACL_DISCONNECTED)){
                Log.i(TAG, "Bluetooth device was disconnected");
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

        private void handleNewBluetoothDevice(){
            //check if the new device is a headset, if so, connect
            retries = 0; //reset retries as there is a new device
//            if (!bluetoothAudio){
//                activateBluetoothSco();
//            }

            // start bluetooth Sco audio connection.
            // Calling startBluetoothSco() always returns faIL here,
            // that why a count down timer is implemented to call
            // startBluetoothSco() in the onTick.
            audioManager.setMode(AudioManager.MODE_IN_CALL);
            mIsCountDownOn = true;
            mCountDown.start();
        }

        private void handleDisconnectBluetoothDevice() {
            if (mIsCountDownOn)
            {
                mIsCountDownOn = false;
                mCountDown.cancel();
            }
            bluetoothAudio = false;
            deactivateBluetoothSco();
            startRecording(); //if disconnected, now we should switch to recording on local mic
        }
    };

    private AudioRecord recorder = null;

    private AudioManager audioManager;
    private boolean mIsCountDownOn = false;
    private boolean mIsStarting = false;

    private Thread recordingThread = null;

    private Context mContext;

    private AudioChunkCallback mChunkCallback;

//    private Button startButton;
//
//    private Button stopButton;
//
//    private Button bluetoothButton;

    public BluetoothMic(Context context, AudioChunkCallback chunkCallback) {
        bufferSize = Math.round(SAMPLING_RATE_IN_HZ * BUFFER_SIZE_SECONDS);

        // need for audio sco, see mBroadcastReceiver
        mIsStarting = true;

        //setup context
        mContext = context;

        mChunkCallback = chunkCallback;

        //setup handler
        mHandler = new Handler();

        //listen for bluetooth HFP events
        audioManager = (AudioManager) mContext.getSystemService(Context.AUDIO_SERVICE);
        mContext.registerReceiver(bluetoothStateReceiver, new IntentFilter(
                AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED));
        mContext.registerReceiver(bluetoothStateReceiver,
                new IntentFilter(BluetoothDevice.ACTION_ACL_CONNECTED));
        mContext.registerReceiver(bluetoothStateReceiver,
                new IntentFilter(BluetoothDevice.ACTION_ACL_DISCONNECTED));

        //first, start recording on local microphone
        bluetoothAudio = false;
        startRecording();
        //the, immediately try to startup the SCO connection
        mIsCountDownOn = true;
        mCountDown.start();
    }

    private void startRecording() {

        //if alraedy recording, stop previous and start a new one
        if (recorder != null) {
            stopRecording();
        }
        if (bluetoothAudio) {
            Log.d(TAG, "Starting recording on Bluetooth Microphone");
        } else {
            Log.d(TAG, "Starting recording on local microphone");
        }

        // Depending on the device one might has to change the AudioSource, e.g. to DEFAULT
        // or VOICE_COMMUNICATION

        recorder = new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION,
                SAMPLING_RATE_IN_HZ, CHANNEL_CONFIG, AUDIO_FORMAT, bufferSize * 2);

        recorder.startRecording();

        recordingInProgress.set(true);

        recordingThread = new Thread(new RecordingRunnable(), "Recording Thread");
        recordingThread.start();
    }

    private void stopRecording() {
        Log.d(TAG, "Stopping audio recording");
        if (null == recorder) {
            return;
        }

        recordingInProgress.set(false);

        recorder.stop();

        recorder.release();

        recorder = null;

        recordingThread = null;
    }

    private void activateBluetoothSco() {
        Log.d(TAG, "Activating Bluetooth SCO");

        retries += 1;

        if (!audioManager.isBluetoothScoAvailableOffCall()) {
            Log.e(TAG, "SCO ist not available, recording is not possible");
            return;
        }

        if (audioManager.isBluetoothScoOn()) {
            audioManager.stopBluetoothSco();
        }
        audioManager.startBluetoothSco();
    }

    private void deactivateBluetoothSco(){
        Log.d(TAG, "Deactivating Bluetooth SCO");
        audioManager.stopBluetoothSco();
    }

    private void bluetoothStateChanged(BluetoothState state) {
        Log.i(TAG, "Bluetooth state changed to:" + state);

        if (BluetoothState.UNAVAILABLE == state && recordingInProgress.get()) {
            bluetoothAudio = false;
            stopRecording();
            deactivateBluetoothSco();
        } else if (BluetoothState.AVAILABLE == state && !recordingInProgress.get()){
            bluetoothAudio = true;
            startRecording();
        } else if (BluetoothState.AVAILABLE == state && !bluetoothAudio){
            bluetoothAudio = true;
            startRecording();
        }
    }

    private class RecordingRunnable implements Runnable {

        @Override
        public void run() {
//            final ByteBuffer buffer = ByteBuffer.allocateDirect(BUFFER_SIZE);
            short[] short_buffer = new short[bufferSize];
            ByteBuffer b_buffer = ByteBuffer.allocate(short_buffer.length * 2);

                while (recordingInProgress.get()) {
//                    int result = recorder.read(buffer, BUFFER_SIZE);
                    // read the data into the buffer
                    int result = recorder.read(short_buffer, 0, short_buffer.length);
                    if (result < 0) {
                        Log.d(TAG, "ERROR");
                    }
                    //convert short array to byte array
                    b_buffer.order(ByteOrder.LITTLE_ENDIAN);
                    b_buffer.asShortBuffer().put(short_buffer);
                    //send to audio system
                    mChunkCallback.onSuccess(b_buffer);
                    b_buffer.clear();
                }
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

    /**
     * Try to connect to audio headset in onTick.
     */
    private CountDownTimer mCountDown = new CountDownTimer(1000, 300)
    {

        @SuppressWarnings("synthetic-access")
        @Override
        public void onTick(long millisUntilFinished)
        {
            // When this call is successful, this count down timer will be canceled.
            audioManager.startBluetoothSco();

            Log.d(TAG, "\nonTick start bluetooth Sco"); //$NON-NLS-1$
        }

        @SuppressWarnings("synthetic-access")
        @Override
        public void onFinish()
        {
            // Calls to startBluetoothSco() in onStick are not successful.
            // Should implement something to inform user of this failure
            mIsCountDownOn = false;
            audioManager.setMode(AudioManager.MODE_NORMAL);

            //if it fails after n tries, then we should start recording with local microphone
            startRecording();

            Log.d(TAG, "\nonFinish fail to connect to headset audio"); //$NON-NLS-1$
        }
    };
}
