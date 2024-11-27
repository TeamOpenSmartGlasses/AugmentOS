package com.wearableintelligencesystem.androidsmartglasses;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.util.Base64;
import android.util.Log;

import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;
import com.wearableintelligencesystem.androidsmartglasses.sensors.AudioChunkCallback;
import com.wearableintelligencesystem.androidsmartglasses.sensors.BluetoothMic;
import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.utils.AES;

import org.json.JSONException;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.util.concurrent.BlockingQueue;

import io.reactivex.rxjava3.subjects.PublishSubject;

public class AudioSystem {
    private static String TAG = "WearableAi_AudioSystem";


    //data observable we can send data through
    private static PublishSubject<JSONObject> dataObservable;

    //encryption key - TEMPORARILY HARD CODED - change to local storage, user can set
    private String secretKey;

    private static boolean firstConnect = false;

    private long lastAudioUpdate = 0;
    private int audioInterval = 3000;

    // the audio recording options
    private static final int RECORDING_RATE = 16000;
    private static final int CHANNEL = AudioFormat.CHANNEL_IN_MONO;
    private static final int FORMAT = AudioFormat.ENCODING_PCM_16BIT;

    // the audio recorder
    private AudioRecord recorder;
    private AudioManager mAudioManager;
    // the minimum buffer size needed for audio recording
    private static int BUFFER_SIZE = AudioRecord.getMinBufferSize(RECORDING_RATE, CHANNEL, FORMAT);
    // are we currently sending audio data
    private boolean currentlySendingAudio = false;

    //queue of data to send through the socket
    private static BlockingQueue<byte []> data_queue;

    private static int queue_size = 1024;

    private Context context;

    public AudioSystem(Context context){
        secretKey = context.getResources().getString(R.string.key);
        this.context = context;
    }

    public void startStreaming(){
        //follow this order for speed
        //start audio from bluetooth headset
        BluetoothMic blutoothAudio = new BluetoothMic(context, new AudioChunkCallback(){
            @Override
            public void onSuccess(ByteBuffer chunk){
                receiveChunk(chunk);
            }
        });
    }

    enum BluetoothState {
        AVAILABLE, UNAVAILABLE
    }

    private final BroadcastReceiver bluetoothStateReceiver = new BroadcastReceiver() {

        private BluetoothState bluetoothState = BluetoothState.UNAVAILABLE;

        @Override
        public void onReceive(Context context, Intent intent) {
            int state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1);
            switch (state) {
                case AudioManager.SCO_AUDIO_STATE_CONNECTED:
                    Log.i(TAG, "Bluetooth HFP Headset is connected");
                    handleBluetoothStateChange(BluetoothState.AVAILABLE);
                    break;
                case AudioManager.SCO_AUDIO_STATE_CONNECTING:
                    Log.i(TAG, "Bluetooth HFP Headset is connecting");
                    handleBluetoothStateChange(BluetoothState.UNAVAILABLE);
                case AudioManager.SCO_AUDIO_STATE_DISCONNECTED:
                    Log.i(TAG, "Bluetooth HFP Headset is disconnected");
                    handleBluetoothStateChange(BluetoothState.UNAVAILABLE);
                    break;
                case AudioManager.SCO_AUDIO_STATE_ERROR:
                    Log.i(TAG, "Bluetooth HFP Headset is in error state");
                    handleBluetoothStateChange(BluetoothState.UNAVAILABLE);
                    break;
            }
        }

        private void handleBluetoothStateChange(BluetoothState state) {
            if (bluetoothState == state) {
                return;
            }

            bluetoothState = state;
        }
    };

    public byte [] encryptBytes(byte [] input){
        byte [] encryptedBytes = AES.encrypt(input, secretKey) ;
        return encryptedBytes;
    }


    public byte [] decryptBytes(byte [] input) {
        byte [] decryptedBytes = AES.decrypt(input, secretKey) ;
        return decryptedBytes;
    }

    public void sendBytes(byte [] data) {
        try {
            JSONObject audioChunkJson = new JSONObject();
            String encodedData = Base64.encodeToString(data, Base64.DEFAULT);
            audioChunkJson.put(MessageTypes.MESSAGE_TYPE_LOCAL, MessageTypes.AUDIO_CHUNK_DECRYPTED);
            audioChunkJson.put(MessageTypes.AUDIO_DATA, encodedData);
            dataObservable.onNext(audioChunkJson);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    private void receiveChunk(ByteBuffer chunk){
        byte[] audio_bytes = chunk.array();
        //byte[] encrypted_audio_bytes = encryptBytes(audio_bytes);
        sendBytes(audio_bytes);
    }

    private void activateBluetoothSco() {
        if (!mAudioManager.isBluetoothScoAvailableOffCall()) {
            Log.e(TAG, "SCO is not available, recording with bluetooth is not possible");
            return;
        }

        if (!mAudioManager.isBluetoothScoOn()) {
            mAudioManager.startBluetoothSco();
        }
    }


    public void setObservable(PublishSubject observable){
        dataObservable = observable;
    }

}