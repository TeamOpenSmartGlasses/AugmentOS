package com.teambandwidth.wearllm;

import static com.google.audio.asr.SpeechRecognitionModelOptions.SpecificModel.DICTATION_DEFAULT;
import static com.google.audio.asr.SpeechRecognitionModelOptions.SpecificModel.VIDEO;
import static com.google.audio.asr.TranscriptionResultFormatterOptions.TranscriptColoringStyle.NO_COLORING;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Binder;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.lifecycle.LifecycleService;

import com.google.audio.CodecAndBitrate;
import com.google.audio.asr.CloudSpeechSessionParams;
import com.google.audio.asr.CloudSpeechStreamObserverParams;
import com.google.audio.asr.SpeechRecognitionModelOptions;
import com.google.audio.asr.TranscriptionResultFormatterOptions;
import com.teambandwidth.wearllm.R;

import com.teambandwidth.wearllm.asr.RepeatingRecognitionSession;
import com.teambandwidth.wearllm.asr.SafeTranscriptionResultFormatter;
import com.teambandwidth.wearllm.asr.TextToSpeechSystem;
import com.teambandwidth.wearllm.asr.TranscriptionResultUpdatePublisher;
import com.teambandwidth.wearllm.asr.gcloudspeech.CloudSpeechSessionFactory;
import com.teambandwidth.wearllm.asr.wearllmbackend.BackendServerComms;
import com.teambandwidth.wearllm.asr.wearllmbackend.VolleyJsonCallback;

import org.json.JSONException;
import org.json.JSONObject;

public class WearLLMService extends LifecycleService {
    public final String TAG = "WearLLM_WearLLMService";

    private final IBinder binder = new LocalBinder();
    public static final String ACTION_START_FOREGROUND_SERVICE = "WEARLLM_ACTION_START_FOREGROUND_SERVICE";
    public static final String ACTION_STOP_FOREGROUND_SERVICE = "WEARLLM_ACTION_STOP_FOREGROUND_SERVICE";
    private int myNotificationId;
    private Class mainActivityClass;
    private String myChannelId;
    private String notificationAppName;
    private String notificationDescription;
    private int notificationDrawable;
    private String apiKey;

    //WearLLM stuff
    private BackendServerComms backendServerComms;
    TextToSpeechSystem tts;

    public WearLLMService() {
        this.mainActivityClass = MainActivity.class;
        this.myChannelId = "wear_llm_app";
        this.myNotificationId = 3288;
        this.notificationAppName = "WearLLM";
        this.notificationDescription = "Wearable intelligence upgrades. By Team Bandwidth.";
        this.notificationDrawable = R.drawable.ic_launcher_background;
    }

    private Notification updateNotification() {
        Context context = getApplicationContext();

        PendingIntent action = PendingIntent.getActivity(context,
                0, new Intent(context, mainActivityClass),
                PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_MUTABLE); // Flag indicating that if the described PendingIntent already exists, the current one should be canceled before generating a new one.

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationCompat.Builder builder;

        String CHANNEL_ID = myChannelId;

        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, notificationAppName,
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(notificationDescription);
        manager.createNotificationChannel(channel);

        builder = new NotificationCompat.Builder(this, CHANNEL_ID);

        return builder.setContentIntent(action)
                .setContentTitle(notificationAppName)
                .setContentText(notificationDescription)
                .setSmallIcon(notificationDrawable)
                .setTicker("...")
                .setContentIntent(action)
                .setOngoing(true).build();
    }

    public class LocalBinder extends Binder {
        public WearLLMService getService() {
            // Return this instance of LocalService so clients can call public methods
            return WearLLMService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        super.onBind(intent);
        return binder;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        Log.d(TAG, "onStartCommand called!");
        if (intent != null) {
            String action = intent.getAction();
            Bundle extras = intent.getExtras();

            switch (action) {
                case ACTION_START_FOREGROUND_SERVICE:
                    // start the service in the foreground
                    startForeground(myNotificationId, updateNotification());
                    break;
                case ACTION_STOP_FOREGROUND_SERVICE:
                    stopForeground(true);
                    stopSelf();
                    break;
            }
        }
        return Service.START_STICKY;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        //get api key
        this.apiKey = MainActivity.getApiKey(getApplicationContext());

        //set language code
        currentLanguageCode = "en-US"; //this is hacky, use the resources langauges.xml and array.xml once adding in back more langauges

        //setup backend comms
        backendServerComms = new BackendServerComms(this);

        //start text to speech
        constructRepeatingRecognitionSession();
        startRecording();

        //start text to speech
        tts = new TextToSpeechSystem(this);

        Log.d(TAG, "WearLLM SERVICE STARTED");
    }

    @Override
    public void onDestroy(){
        super.onDestroy();

        if(audioRecord !=null){
            audioRecord.stop();
        }

        if (recognizer != null) {
            recognizer.unregisterCallback(transcriptUpdater);
            networkChecker.unregisterNetworkCallback();
        }
    }

    //WearLLM code --------------------------------------------------------------------
    private static final int MIC_CHANNELS = AudioFormat.CHANNEL_IN_MONO;
    private static final int MIC_CHANNEL_ENCODING = AudioFormat.ENCODING_PCM_16BIT;
    private static final int MIC_SOURCE = MediaRecorder.AudioSource.VOICE_RECOGNITION;
    private static final int SAMPLE_RATE = 16000;
    private static final int CHUNK_SIZE_SAMPLES = 1280;
    private static final int BYTES_PER_SAMPLE = 2;

    private int currentLanguageCodePosition;
    private String currentLanguageCode;

    private AudioRecord audioRecord;
    private final byte[] buffer = new byte[BYTES_PER_SAMPLE * CHUNK_SIZE_SAMPLES];

    // This class was intended to be used from a thread where timing is not critical (i.e. do not
    // call this in a system audio callback). Network calls will be made during all of the functions
    // that RepeatingRecognitionSession inherits from SampleProcessorInterface.
    private RepeatingRecognitionSession recognizer;
    private NetworkConnectionChecker networkChecker;

    private final TranscriptionResultUpdatePublisher transcriptUpdater =
            (formattedTranscript, updateType) -> {
                Log.d(TAG, formattedTranscript.toString());
                if (updateType == TranscriptionResultUpdatePublisher.UpdateType.TRANSCRIPT_FINALIZED){
                    sendLLMQueryRequest(formattedTranscript.toString());
                }
//                runOnUiThread(
//                        () -> {
//                            transcript.setText(formattedTranscript.toString());
//                        });
            };

    private Runnable readMicData =
        () -> {
            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                return;
            }
            recognizer.init(CHUNK_SIZE_SAMPLES);
            while (audioRecord.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                audioRecord.read(buffer, 0, CHUNK_SIZE_SAMPLES * BYTES_PER_SAMPLE);
                recognizer.processAudioBytes(buffer);
            }
            Log.d(TAG, "WearLLM stopping transcription.");
            recognizer.stop();
    };


    private void initLanguageLocale() {
        // The default locale is en-US.
        currentLanguageCode = "en-US";
        currentLanguageCodePosition = 22;
    }

    private void constructRepeatingRecognitionSession() {
        SpeechRecognitionModelOptions options =
                SpeechRecognitionModelOptions.newBuilder()
                        .setLocale(currentLanguageCode)
                        // As of 7/18/19, Cloud Speech's video model supports en-US only.
                        .setModel(currentLanguageCode.equals("en-US") ? VIDEO : DICTATION_DEFAULT) //this is overwritten to use 'latest_long' in cloud/CloudSpeechSession.java
                        .build();
        CloudSpeechSessionParams cloudParams =
                CloudSpeechSessionParams.newBuilder()
                        .setObserverParams(
                                CloudSpeechStreamObserverParams.newBuilder().setRejectUnstableHypotheses(false))
                        .setFilterProfanity(false)
                        .setEncoderParams(
                                CloudSpeechSessionParams.EncoderParams.newBuilder()
                                        .setEnableEncoder(true)
                                        .setAllowVbr(true)
                                        .setCodec(CodecAndBitrate.OGG_OPUS_BITRATE_32KBPS))
                        .build();
        networkChecker = new NetworkConnectionChecker(this);
        networkChecker.registerNetworkCallback();

        // There are lots of options for formatting the text. These can be useful for debugging
        // and visualization, but it increases the effort of reading the transcripts.
        TranscriptionResultFormatterOptions formatterOptions =
                TranscriptionResultFormatterOptions.newBuilder()
                        .setTranscriptColoringStyle(NO_COLORING)
                        .build();
        RepeatingRecognitionSession.Builder recognizerBuilder =
                RepeatingRecognitionSession.newBuilder()
//                        .setSpeechSessionFactory(new CloudSpeechSessionFactory(cloudParams, getApiKey(this)))
                        .setSpeechSessionFactory(new CloudSpeechSessionFactory(cloudParams, apiKey))
                        .setSampleRateHz(SAMPLE_RATE)
                        .setTranscriptionResultFormatter(new SafeTranscriptionResultFormatter(formatterOptions))
                        .setSpeechRecognitionModelOptions(options)
                        .setNetworkConnectionChecker(networkChecker);
        recognizer = recognizerBuilder.build();
        recognizer.registerCallback(transcriptUpdater, TranscriptionResultUpdatePublisher.ResultSource.MOST_RECENT_SEGMENT);
    }

    private void startRecording() {
        if (audioRecord == null) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                // TODO: Consider calling
                //    ActivityCompat#requestPermissions
                // here to request the missing permissions, and then overriding
                //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
                //                                          int[] grantResults)
                // to handle the case where the user grants the permission. See the documentation
                // for ActivityCompat#requestPermissions for more details.
                return;
            }
            audioRecord = new AudioRecord(
                    MIC_SOURCE,
                    SAMPLE_RATE,
                    MIC_CHANNELS,
                    MIC_CHANNEL_ENCODING,
                    CHUNK_SIZE_SAMPLES * BYTES_PER_SAMPLE
            );
        }

        audioRecord.startRecording();
        new Thread(readMicData).start();
    }

    public void sendLLMQueryRequest(String query){
        Log.d(TAG, "Running sendLLMQueryRequest with query: " + query);
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("text", query);
            jsonQuery.put("userId", "jeremy");
            jsonQuery.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(BackendServerComms.LLM_QUERY_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    Log.d(TAG, "GOT LLM Query REST RESULT:");
                    Log.d(TAG, result.toString());
                    try {
                        parseLLMQueryResult(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(){
                    Log.d(TAG, "SOME FAILURE HAPPENED");
                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void parseLLMQueryResult(JSONObject response) throws JSONException {
        Log.d(TAG, "Got result from server: " + response.toString());
        String message = response.getString("message");
        if (!message.equals(""))
            speakTTS(message);
    }

    public void speakTTS(String toSpeak){
        Log.d(TAG, "Speaking: " + toSpeak);
        tts.speak(toSpeak);
    }

}
