package com.teamopensmartglasses.convoscope;

import static com.teamopensmartglasses.convoscope.Constants.BUTTON_EVENT_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.DIARIZE_QUERY_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.LLM_QUERY_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.UI_POLL_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.GEOLOCATION_STREAM_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.SET_USER_SETTINGS_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.GET_USER_SETTINGS_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.adhdStmbAgentKey;
import static com.teamopensmartglasses.convoscope.Constants.entityDefinitionsKey;
import static com.teamopensmartglasses.convoscope.Constants.explicitAgentQueriesKey;
import static com.teamopensmartglasses.convoscope.Constants.explicitAgentResultsKey;
import static com.teamopensmartglasses.convoscope.Constants.glassesCardTitle;
import static com.teamopensmartglasses.convoscope.Constants.languageLearningKey;
import static com.teamopensmartglasses.convoscope.Constants.llContextConvoKey;
import static com.teamopensmartglasses.convoscope.Constants.llWordSuggestUpgradeKey;
import static com.teamopensmartglasses.convoscope.Constants.proactiveAgentResultsKey;
import static com.teamopensmartglasses.convoscope.Constants.shouldUpdateSettingsKey;
import static com.teamopensmartglasses.convoscope.Constants.displayRequestsKey;
import static com.teamopensmartglasses.convoscope.Constants.wakeWordTimeKey;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.hardware.display.VirtualDisplay;
import android.media.projection.MediaProjection;
import android.os.Binder;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.preference.PreferenceManager;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GetTokenResult;
import com.teamopensmartglasses.convoscope.comms.AugmentOsActionsCallback;
import com.teamopensmartglasses.convoscope.comms.AugmentosBlePeripheral;
import com.teamopensmartglasses.convoscope.events.GoogleAuthFailedEvent;
import com.teamopensmartglasses.convoscope.convoscopebackend.BackendServerComms;
import com.teamopensmartglasses.convoscope.convoscopebackend.VolleyJsonCallback;
import com.teamopensmartglasses.convoscope.events.NewScreenImageEvent;
import com.teamopensmartglasses.convoscope.events.NewScreenTextEvent;
import com.teamopensmartglasses.convoscope.events.SignOutEvent;
import com.teamopensmartglasses.convoscope.tpa.TPASystem;
import com.teamopensmartglasses.convoscope.ui.ConvoscopeUi;

import com.teamopensmartglasses.smartglassesmanager.SmartGlassesAndroidService;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.AudioWearable;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.SmartGlassesOperatingSystem;

import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.DiarizationOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.GlassesTapOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SmartGlassesConnectedEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SpeechRecOutputEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Objects;
import java.util.LinkedList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
//SpeechRecIntermediateOutputEvent
import net.sourceforge.pinyin4j.PinyinHelper;
import net.sourceforge.pinyin4j.format.HanyuPinyinOutputFormat;
import net.sourceforge.pinyin4j.format.HanyuPinyinCaseType;
import net.sourceforge.pinyin4j.format.HanyuPinyinToneType;
import net.sourceforge.pinyin4j.format.HanyuPinyinVCharType;
import net.sourceforge.pinyin4j.format.exception.BadHanyuPinyinOutputFormatCombination;
import com.huaban.analysis.jieba.JiebaSegmenter;
import com.huaban.analysis.jieba.SegToken;

public class AugmentosService extends Service implements AugmentOsActionsCallback {
    public final String TAG = "AugmentOS_AugmentOSService";

    private final IBinder binder = new LocalBinder();

    private FirebaseAuth firebaseAuth;
    private FirebaseAuth.AuthStateListener authStateListener;
    private FirebaseAuth.IdTokenListener idTokenListener;

    private final String notificationAppName = "AugmentOS_Main";
    private final String notificationDescription = "AugmentOS_Main Description";
    private final int myNotificationId = 3588;
    private final String myChannelId = "augmentos_main";

    public static final String ACTION_START_FOREGROUND_SERVICE = "MY_ACTION_START_FOREGROUND_SERVICE";
    public static final String ACTION_STOP_FOREGROUND_SERVICE = "MY_ACTION_STOP_FOREGROUND_SERVICE";

    //Convoscope stuff
    String authToken = "";
    private BackendServerComms backendServerComms;
    ArrayList<String> responsesBuffer;
    ArrayList<String> transcriptsBuffer;
    ArrayList<String> responsesToShare;
    private final Handler csePollLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable cseRunnableCode;
    private final Handler displayPollLoopHandler = new Handler(Looper.getMainLooper());
    private final Handler locationSendingLoopHandler = new Handler(Looper.getMainLooper());
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private Handler screenCaptureHandler = new Handler();
    private Runnable screenCaptureRunnable;
    private Runnable uiPollRunnableCode;
    private Runnable displayRunnableCode;
    private Runnable locationSendingRunnableCode;
    private long lastDataSentTime = 0;
    private final long POLL_INTERVAL_ACTIVE = 200; // 200ms when actively sending data
    private final long POLL_INTERVAL_INACTIVE = 5000; // 5000ms (5s) when inactive
    private final long DATA_SENT_THRESHOLD = 90000; // 90 seconds
    private LocationSystem locationSystem;
    static final String deviceId = "android";
    public String proactiveAgents = "proactive_agent_insights";
    public String explicitAgent = "explicit_agent_insights";
    public String definerAgent = "intelligent_entity_definitions";
    public String languageLearningAgent = "language_learning";
    public String llWordSuggestUpgradeAgent = "ll_word_suggest_upgrade";
    public String llContextConvoAgent = "ll_context_convo";
    public String adhdStmbAgent = "adhd_stmb_agent_summaries";
    public double previousLat = 0;
    public double previousLng = 0;

    //language learning buffer stuff
    private LinkedList<DefinedWord> definedWords = new LinkedList<>();
    private LinkedList<STMBSummary> adhdStmbSummaries = new LinkedList<>();
    private LinkedList<LLUpgradeResponse> llUpgradeResponses = new LinkedList<>();
    private LinkedList<LLCombineResponse> llCombineResponses = new LinkedList<>();
    private LinkedList<ContextConvoResponse> contextConvoResponses = new LinkedList<>();
    private final long llDefinedWordsShowTime = 40 * 1000; // define in milliseconds
    private final long llContextConvoResponsesShowTime = 3 * 60 * 1000; // define in milliseconds
    private final long locationSendTime = 1000 * 10; // define in milliseconds
    private final long adhdSummaryShowTime = 10 * 60 * 1000; // define in milliseconds
    private final long llUpgradeShowTime = 5 * 60 * 1000; // define in milliseconds
    private final long llCombineShowTime = 5 * 60 * 1000; // define in milliseconds
    private final int maxDefinedWordsShow = 4;
    private final int maxLLCombineShow = 5;
    private final int maxAdhdStmbShowNum = 3;
    private final int maxContextConvoResponsesShow = 2;
    private final int maxLLUpgradeResponsesShow = 2;
    private final int charsPerTranscript = 90;
    private final int charsPerHanziTranscript = 36;

    long previousWakeWordTime = -1; // Initialize this at -1
    int numConsecutiveAuthFailures = 0;
    private long currTime = 0;
    private long lastPressed = 0;
    private long lastTapped = 0;

    //clear screen to start
    public boolean clearedScreenYet = false;

    String currentLiveCaption = "";
    String finalLiveCaption = "";
    String llCurrentString = "";

    private String translationText = "";
    private String liveCaptionText = "";

    private String finalLiveCaptionText = "";
    private String finalTranslationText = "";

    // Double clicking constants
    private final long doublePressTimeConst = 420;
    private final long doubleTapTimeConst = 600;
    private boolean segmenterLoaded = false;
    private boolean segmenterLoading = false;
    private boolean hasUserBeenNotified = false;

    public TPASystem tpaSystem;

    private AugmentosBlePeripheral blePeripheral;

    public AugmentosSmartGlassesService smartGlassesService;
    private boolean isSmartGlassesServiceBound = false;


    public AugmentosService() {
    }

    private ServiceConnection connection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            AugmentosSmartGlassesService.LocalBinder binder = (AugmentosSmartGlassesService.LocalBinder) service;
            smartGlassesService = (AugmentosSmartGlassesService) binder.getService();
            isSmartGlassesServiceBound = true;
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            isSmartGlassesServiceBound = false;
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();

        createNotificationChannel(); // New method to ensure one-time channel creation
        startForeground(myNotificationId, updateNotification());

        //setup event bus subscribers
        EventBus.getDefault().register(this);

        //make responses holder
        responsesBuffer = new ArrayList<>();
        responsesToShare = new ArrayList<>();
        responsesBuffer.add("Welcome to AugmentOS.");

        //make responses holder
        transcriptsBuffer = new ArrayList<>();

        //setup backend comms
        backendServerComms = new BackendServerComms(this);

        //startNotificationService();

        // load pinyin converter in the background
        new Thread(this::loadSegmenter).start();
//        if (
//            (super.getSelectedLiveCaptionsTranslation(this) == 1 && getChosenTranscribeLanguage(this).equals("Chinese (Pinyin)")) ||
//            (super.getSelectedLiveCaptionsTranslation(this) == 2 && (getChosenSourceLanguage(this).equals("Chinese (Pinyin)") ||
//                getChosenTargetLanguage(this).equals("Chinese (Pinyin)") && getChosenTranscribeLanguage(this).equals(getChosenSourceLanguage(this)))
//            )
//        ) {
//            new Thread(this::loadSegmenter).start();
//        }

        // Init TPA broadcast receivers
        tpaSystem = new TPASystem(this);

        // Initialize BLE Peripheral
        blePeripheral = new AugmentosBlePeripheral(this, this);
        blePeripheral.start();

        completeInitialization();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    myChannelId,
                    notificationAppName,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(notificationDescription);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    public void completeInitialization(){
        Log.d(TAG, "COMPLETE CONVOSCOPE INITIALIZATION");
        setUpUiPolling();
        setUpLocationSending();

        getCurrentMode(this);

        //update settings on backend on launch
        updateTargetLanguageOnBackend(this);
        updateSourceLanguageOnBackend(this);
        updateVocabularyUpgradeOnBackend(this);
        saveCurrentMode(this, getCurrentMode(this));

        // startSmartGlassesService();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        if (intent != null) {
            String action = intent.getAction();
            Bundle extras = intent.getExtras();

            switch (action) {
                case ACTION_START_FOREGROUND_SERVICE:
                    // start the service in the foreground
                    Log.d("TEST", "starting foreground");
                    // startForeground(myNotificationId, updateNotification());
                    break;
                case ACTION_STOP_FOREGROUND_SERVICE:
                    stopForeground(true);
                    stopSelf();
                    break;
            }
        }
        return Service.START_STICKY;
    }


    private Notification updateNotification() {
        Context context = getApplicationContext();

        PendingIntent action = PendingIntent.getActivity(context,
                0, new Intent(context, MainActivity.class),
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
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setTicker("...")
                .setContentIntent(action)
                .setOngoing(true).build();
    }

    // Method to start the Smart Glasses Service and bind to it
    public void startSmartGlassesService() {
        Intent intent = new Intent(this, AugmentosSmartGlassesService.class);
        // startService(intent);  // Start the service if it's not already running
        bindService(intent, connection, Context.BIND_AUTO_CREATE);  // Bind to the service
    }


    public void stopSmartGlassesService() {
        if (isSmartGlassesServiceBound) {
            unbindService(connection);  // Unbind from the service
            isSmartGlassesServiceBound = false;
        }
        Intent intent = new Intent(this, AugmentosSmartGlassesService.class);
        stopService(intent);  // Stop the service
    }

    public void restartSmartGlassesService() {
        stopSmartGlassesService();
        startSmartGlassesService();
    }

    @Subscribe
    public void onGlassesConnnected(SmartGlassesConnectedEvent event) {

    }

    public void handleSignOut(){
        EventBus.getDefault().post(new SignOutEvent());
    }

    public void sendSettings(JSONObject settingsObj){
        try{
            settingsObj.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(SET_USER_SETTINGS_ENDPOINT, settingsObj, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        Log.d(TAG, "GOT Settings update result: " + result.toString());
                        String query_answer = result.getString("message");
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (sendSettings)");

                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void getSettings(){
        try{
            Log.d(TAG, "Runnign get settings");
            Context mContext = this.getApplicationContext();
            JSONObject getSettingsObj = new JSONObject();
            backendServerComms.restRequest(GET_USER_SETTINGS_ENDPOINT, getSettingsObj, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        Log.d(TAG, "GOT GET Settings update result: " + result.toString());
                        JSONObject settings = result.getJSONObject("settings");
                        Boolean useDynamicTranscribeLanguage = settings.getBoolean("use_dynamic_transcribe_language");
                        String dynamicTranscribeLanguage = settings.getString("dynamic_transcribe_language");
                        Log.d(TAG, "Should use dynamic? " + useDynamicTranscribeLanguage);
                        if (useDynamicTranscribeLanguage){
                            Log.d(TAG, "Switching running transcribe language to: " + dynamicTranscribeLanguage);
                            if (isSmartGlassesServiceBound)
                                smartGlassesService.switchRunningTranscribeLanguage(dynamicTranscribeLanguage);
                        } else {
                            if (isSmartGlassesServiceBound)
                                smartGlassesService.switchRunningTranscribeLanguage(smartGlassesService.getChosenTranscribeLanguage(mContext));
                        }
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (getSettings)");
                }
            });
        } catch (Exception e){
            e.printStackTrace();
            Log.d(TAG, "SOME FAILURE HAPPENED (getSettings)");
        }
    }

    public void setUpUiPolling(){
        uiPollRunnableCode = new Runnable() {
            @Override
            public void run() {
                if (isSmartGlassesServiceBound) {
                    requestUiPoll();
                }
                long currentTime = System.currentTimeMillis();
                long interval = (currentTime - lastDataSentTime < DATA_SENT_THRESHOLD) ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_INACTIVE;
                csePollLoopHandler.postDelayed(this, interval);
            }
        };
        csePollLoopHandler.post(uiPollRunnableCode);
    }

    public void setUpLocationSending(){
        locationSystem = new LocationSystem(getApplicationContext());

        if (locationSendingLoopHandler != null){
            locationSendingLoopHandler.removeCallbacksAndMessages(this);
        }

        locationSendingRunnableCode = new Runnable() {
            @Override
            public void run() {
                if (isSmartGlassesServiceBound)
                    requestLocation();
                locationSendingLoopHandler.postDelayed(this, locationSendTime);
            }
        };
        locationSendingLoopHandler.post(locationSendingRunnableCode);
    }

    @Override
    public void onDestroy(){
        csePollLoopHandler.removeCallbacks(uiPollRunnableCode);
        displayPollLoopHandler.removeCallbacks(displayRunnableCode);
        locationSystem.stopLocationUpdates();
        locationSendingLoopHandler.removeCallbacks(locationSendingRunnableCode);
        locationSendingLoopHandler.removeCallbacksAndMessages(null);
        screenCaptureHandler.removeCallbacks(screenCaptureRunnable);
        if (virtualDisplay != null) virtualDisplay.release();
        if (mediaProjection != null) mediaProjection.stop();
        EventBus.getDefault().unregister(this);

        if (authStateListener != null) {
            firebaseAuth.removeAuthStateListener(authStateListener);
        }
        if (idTokenListener != null) {
            firebaseAuth.removeIdTokenListener(idTokenListener);
        }

//        stopNotificationService();

        if (blePeripheral != null) {
            blePeripheral.stop();
        }

        if (isSmartGlassesServiceBound) {
            unbindService(connection);
            isSmartGlassesServiceBound = false;
        }

        super.onDestroy();
    }

    @Subscribe
    public void onGlassesTapSideEvent(GlassesTapOutputEvent event) {
        int numTaps = event.numTaps;
        boolean sideOfGlasses = event.sideOfGlasses;
        long time = event.timestamp;

        Log.d(TAG, "GLASSES TAPPED X TIMES: " + numTaps + " SIDEOFGLASSES: " + sideOfGlasses);
        if (numTaps == 3) {
//            sendLatestCSEResultViaSms();
            Log.d(TAG, "GOT A TRIPLE TAP");
        }
    }

    @Subscribe
    public void onSmartRingButtonEvent(SmartRingButtonOutputEvent event) {
        int buttonId = event.buttonId;
        long time = event.timestamp;
        boolean isDown = event.isDown;

        if(!isDown || buttonId != 1) return;
        Log.d(TAG,"DETECTED BUTTON PRESS W BUTTON ID: " + buttonId);
        currTime = System.currentTimeMillis();

        //Detect double presses
        if(isDown && currTime - lastPressed < doublePressTimeConst) {
            Log.d(TAG, "Double tap - CurrTime-lastPressed: "+ (currTime-lastPressed));
//            sendLatestCSEResultViaSms();
        }

        if(isDown) {
            lastPressed = System.currentTimeMillis();
        }
    }

//    public void sendLatestCSEResultViaSms(){
//        if (phoneNum == "") return;
//
//        if (responses.size() > 1) {
//            //Send latest CSE result via sms;
//            String messageToSend = responsesToShare.get(responsesToShare.size() - 1);
//
//            smsComms.sendSms(phoneNum, messageToSend);
//
//            sendReferenceCard("Convoscope", "Sending result(s) via SMS to " + phoneNumName);
//        }
//    }

    private Handler debounceHandler = new Handler(Looper.getMainLooper());
    private Runnable debounceRunnable;

    @Subscribe
    public void onDiarizeData(DiarizationOutputEvent event) {
        Log.d(TAG, "SENDING DIARIZATION STUFF");
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("transcript_meta_data", event.diarizationData);
            jsonQuery.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(DIARIZE_QUERY_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        parseSendTranscriptResult(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (send Diarize Data)");
                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    @Subscribe
    public void onTranscript(SpeechRecOutputEvent event) {
        String text = event.text;
//        long time = event.timestamp;
        boolean isFinal = event.isFinal;
        boolean isTranslated = event.isTranslated;
//        Log.d(TAG, "PROCESS TRANSCRIPTION CALLBACK. IS IT FINAL? " + isFinal + " " + text);

        if (isFinal && !isTranslated) {
            transcriptsBuffer.add(text);
            sendFinalTranscriptToActivity(text);
        }

        if(!isSmartGlassesServiceBound) return;

        //debounce and then send to backend
        if (!isTranslated && smartGlassesService.getSelectedLiveCaptionsTranslation(this) != 2) debounceAndSendTranscript(text, isFinal);
//        getSettings();
        // Send transcript to user if live captions are enabled
        if (Objects.equals(getCurrentMode(this), "Language Learning") && smartGlassesService.getSelectedLiveCaptionsTranslation(this) != 0) { // 0 is language learning mode
//            showTranscriptsToUser(text, isFinal);
            debounceAndShowTranscriptOnGlasses(text, isFinal, isTranslated);
        }
    }

    private Handler glassesTranscriptDebounceHandler = new Handler(Looper.getMainLooper());
    private Runnable glassesTranscriptDebounceRunnable;
    private long glassesTranscriptLastSentTime = 0;
    private long glassesTranslatedTranscriptLastSentTime = 0;
    private final long GLASSES_TRANSCRIPTS_DEBOUNCE_DELAY = 400; // in milliseconds

    private void debounceAndShowTranscriptOnGlasses(String transcript, boolean isFinal, boolean isTranslated) {
        glassesTranscriptDebounceHandler.removeCallbacks(glassesTranscriptDebounceRunnable);
        long currentTime = System.currentTimeMillis();

        if (isFinal) {
            showTranscriptsToUser(transcript, isTranslated, true);
            return;
        }

        // if intermediate
        if (isSmartGlassesServiceBound && smartGlassesService.getSelectedLiveCaptionsTranslation(this) == 2) {
            if (isTranslated) {
                if (currentTime - glassesTranslatedTranscriptLastSentTime >= GLASSES_TRANSCRIPTS_DEBOUNCE_DELAY) {
                    showTranscriptsToUser(transcript, true, false);
                    glassesTranslatedTranscriptLastSentTime = currentTime;
                } else {
                    glassesTranscriptDebounceRunnable = () -> {
                        showTranscriptsToUser(transcript, true, false);
                        glassesTranslatedTranscriptLastSentTime = System.currentTimeMillis();
                    };
                    glassesTranscriptDebounceHandler.postDelayed(glassesTranscriptDebounceRunnable, GLASSES_TRANSCRIPTS_DEBOUNCE_DELAY);
                }
            } else {
                if (currentTime - glassesTranscriptLastSentTime >= GLASSES_TRANSCRIPTS_DEBOUNCE_DELAY) {
                    showTranscriptsToUser(transcript, false, false);
                    glassesTranscriptLastSentTime = currentTime;
                } else {
                    glassesTranscriptDebounceRunnable = () -> {
                        showTranscriptsToUser(transcript, false, false);
                        glassesTranscriptLastSentTime = System.currentTimeMillis();
                    };
                    glassesTranscriptDebounceHandler.postDelayed(glassesTranscriptDebounceRunnable, GLASSES_TRANSCRIPTS_DEBOUNCE_DELAY);
                }
            }
        } else {
            if (currentTime - glassesTranscriptLastSentTime >= GLASSES_TRANSCRIPTS_DEBOUNCE_DELAY) {
                showTranscriptsToUser(transcript, false, false);
                glassesTranscriptLastSentTime = currentTime;
            } else {
                glassesTranscriptDebounceRunnable = () -> {
                    showTranscriptsToUser(transcript, false, false);
                    glassesTranscriptLastSentTime = System.currentTimeMillis();
                };
                glassesTranscriptDebounceHandler.postDelayed(glassesTranscriptDebounceRunnable, GLASSES_TRANSCRIPTS_DEBOUNCE_DELAY);
            }
        }
    }

    private void showTranscriptsToUser(final String transcript, final boolean isTranslated, final boolean isFinal) {
        String processed_transcript = transcript;

        if (!isTranslated && AugmentosSmartGlassesService.getChosenTranscribeLanguage(this).equals("Chinese (Pinyin)") ||
            isTranslated && (
                getChosenSourceLanguage(this).equals("Chinese (Pinyin)") ||
                getChosenTargetLanguage(this).equals("Chinese (Pinyin)") && AugmentosSmartGlassesService.getChosenTranscribeLanguage(this).equals(getChosenSourceLanguage(this)))
        ) {
            if(segmenterLoaded) {
                processed_transcript = convertToPinyin(transcript);
            } else if (!segmenterLoading) {
                new Thread(this::loadSegmenter).start();
                hasUserBeenNotified = true;
                if (isSmartGlassesServiceBound)
                    smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendTextWall("Loading Pinyin Converter, Please Wait..."), true, false, false));
            } else if (!hasUserBeenNotified) {  //tell user we are loading the pinyin converter
                hasUserBeenNotified = true;
                if (isSmartGlassesServiceBound)
                    smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendTextWall("Loading Pinyin Converter, Please Wait..."), true, false, false));
            }
        }

        if (AugmentosSmartGlassesService.getSelectedLiveCaptionsTranslation(this) == 2) sendTextWallLiveTranslationLiveCaption(processed_transcript, isTranslated, isFinal);
        else sendTextWallLiveCaptionLL(processed_transcript, "", isFinal);
    }

    private void loadSegmenter() {
        segmenterLoading = true;
        final JiebaSegmenter segmenter = new JiebaSegmenter();
        segmenterLoaded = true;
        segmenterLoading = false;
//        displayQueue.addTask(new DisplayQueue.Task(() -> sendTextWall("Pinyin Converter Loaded!"), true, false));
    }

    private String convertToPinyin(final String chineseText) {
        final JiebaSegmenter segmenter = new JiebaSegmenter();

        final List<SegToken> tokens = segmenter.process(chineseText, JiebaSegmenter.SegMode.SEARCH);

        final HanyuPinyinOutputFormat format = new HanyuPinyinOutputFormat();
        format.setCaseType(HanyuPinyinCaseType.LOWERCASE);
        format.setToneType(HanyuPinyinToneType.WITH_TONE_MARK);
        format.setVCharType(HanyuPinyinVCharType.WITH_U_UNICODE);

        StringBuilder pinyinText = new StringBuilder();

        for (SegToken token : tokens) {
            StringBuilder tokenPinyin = new StringBuilder();
            for (char character : token.word.toCharArray()) {
                try {
                    String[] pinyinArray = PinyinHelper.toHanyuPinyinStringArray(character, format);
                    if (pinyinArray != null) {
                        // Use the first Pinyin representation if there are multiple
                        tokenPinyin.append(pinyinArray[0]);
                    } else {
                        // If character is not a Chinese character, append it as is
                        tokenPinyin.append(character);
                    }
                } catch (BadHanyuPinyinOutputFormatCombination e) {
                    e.printStackTrace();
                }
            }
            // Ensure the token is concatenated with a space only if it's not empty
            if (tokenPinyin.length() > 0) {
                pinyinText.append(tokenPinyin.toString()).append(" ");
            }
        }

        // Replace multiple spaces with a single space, but preserve newlines
        String cleanText = pinyinText.toString().trim().replaceAll("[ \\t]+", " ");  // Replace spaces and tabs only

        return cleanText;
    }

    private long lastSentTime = 0;
    private final long DEBOUNCE_DELAY = 250; // in milliseconds
    private void debounceAndSendTranscript(String transcript, boolean isFinal) {
        debounceHandler.removeCallbacks(debounceRunnable);
        long currentTime = System.currentTimeMillis();
        if (isFinal) {
            sendTranscriptRequest(transcript, isFinal);
        } else { //if intermediate
            if (currentTime - lastSentTime >= DEBOUNCE_DELAY) {
                sendTranscriptRequest(transcript, isFinal);
                lastSentTime = currentTime;
            } else {
                debounceRunnable = () -> {
                    sendTranscriptRequest(transcript, isFinal);
                    lastSentTime = System.currentTimeMillis();
                };
                debounceHandler.postDelayed(debounceRunnable, DEBOUNCE_DELAY);
            }
        }
    }

    public void sendTranscriptRequest(String query, boolean isFinal){
        updateLastDataSentTime();
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("text", query);
            jsonQuery.put("transcribe_language", AugmentosSmartGlassesService.getChosenTranscribeLanguage(this));
            jsonQuery.put("isFinal", isFinal);
            jsonQuery.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(LLM_QUERY_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        parseSendTranscriptResult(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (sendChatRequest)");
                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void requestUiPoll(){
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("deviceId", deviceId);
            backendServerComms.restRequest(UI_POLL_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        parseConvoscopeResults(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (requestUiPoll)");
                    if (code == 401){
                        EventBus.getDefault().post(new GoogleAuthFailedEvent("401 AUTH ERROR (requestUiPoll)"));
                    }
                }
            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void requestLocation(){
//        Log.d(TAG, "running request locatoin");
        try{
            // Get location data as JSONObject
            double latitude = locationSystem.lat;
            double longitude = locationSystem.lng;

            // TODO: Filter here... is it meaningfully different?
            if(latitude == 0 && longitude == 0) return;

//            Log.d(TAG, "Got a GOOD location!");

            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("deviceId", deviceId);
            jsonQuery.put("lat", latitude);
            jsonQuery.put("lng", longitude);

            backendServerComms.restRequest(GEOLOCATION_STREAM_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    Log.d(TAG, "Request sent Successfully: " + result.toString());
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (requestLocation)");
                    if (code == 401){
                        EventBus.getDefault().post(new GoogleAuthFailedEvent("401 AUTH ERROR (requestLocation)"));
                    }
                }
            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void parseSendTranscriptResult(JSONObject response) throws JSONException {
//        Log.d(TAG, "Got result from server: " + response.toString());
        String message = response.getString("message");
        //DEV
        return;
//        if (!message.equals("")) {
//            responses.add(message);
//            sendUiUpdateSingle(message);
//            speakTTS(message);
//        }
    }

//    public String[] calculateLLStringFormatted(JSONArray jsonArray){
//        //clear canvas if needed
//        if (!clearedScreenYet){
//            sendHomeScreen();
//            clearedScreenYet = true;
//        }
//
//        // Assuming jsonArray is your existing JSONArray object
//        int max_rows_allowed = 4;
//
//        String[] inWords = new String[jsonArray.length()];
//        String[] inWordsTranslations = new String[jsonArray.length()];
//        String[] llResults = new String[max_rows_allowed];
//        String enSpace = "\u2002"; // Using en space for padding
//
//        int minSpaces = 2;
//        for (int i = 0; i < jsonArray.length() && i < max_rows_allowed; i++) {
//            try {
//                JSONObject obj = jsonArray.getJSONObject(i);
//                inWords[i] = obj.getString("in_word");
//                inWordsTranslations[i] = obj.getString("in_word_translation");
//                int max_len = Math.max(inWords[i].length(), inWordsTranslations[i].length());
////                llResults[i] = inWords[i] + enSpace.repeat(Math.max(0, max_len - inWords[i].length()) + minSpaces) + "⟶" + enSpace.repeat(Math.max(0, max_len - inWordsTranslations[i].length()) + minSpaces) + inWordsTranslations[i];
//                llResults[i] = inWords[i] + enSpace.repeat(minSpaces) + "⟶" + enSpace.repeat(minSpaces) + inWordsTranslations[i];
//            } catch (JSONException e){
//                e.printStackTrace();
//            }
//        }
//
//        return llResults;
//
////        String enSpace = "\u2002"; // Using en space for padding
////        String llResult = "";
////        for (int i = 0; i < inWords.length; i++) {
////            String inWord = inWords[i];
////            String translation = inWordsTranslations[i];
////            llResult += inWord + enSpace.repeat(3) + "->"+ enSpace.repeat(3) + translation + "\n\n";
////        }
//
////        StringBuilder topLine = new StringBuilder();
////        StringBuilder bottomLine = new StringBuilder();
////
////        // Calculate initial padding for the first word based on the bottom line's first word
////        int initialPaddingLength = (inWordsTranslations[0].length() - inWords[0].length()) / 2;
////        if (initialPaddingLength > 0) {
////            topLine.append(String.valueOf(enSpace).repeat(initialPaddingLength));
////        } else {
////            initialPaddingLength = 0; // Ensure it's not negative for subsequent calculations
////        }
////
////        for (int i = 0; i < inWords.length; i++) {
////            String inWord = inWords[i];
////            String translation = inWordsTranslations[i];
////
////            topLine.append(inWord);
////            bottomLine.append(translation);
////
////            if (i < inWords.length - 1) {
////                // Calculate the minimum necessary space to add based on the length of the next words in both lines
////                int nextTopWordLength = inWords[i + 1].length();
////                int nextBottomWordLength = inWordsTranslations[i + 1].length();
////                int currentTopWordLength = inWord.length();
////                int currentBottomWordLength = translation.length();
////
////                // Calculate additional space needed for alignment
////                int additionalSpaceTop = nextTopWordLength - currentTopWordLength;
////                int additionalSpaceBottom = nextBottomWordLength - currentBottomWordLength;
////
////                // Ensure there's a minimum spacing for readability, reduce this as needed
////                int minSpace = 2; // Reduced minimum space for closer alignment
////                int spacesToAddTop = Math.max(additionalSpaceTop, minSpace);
////                int spacesToAddBottom = Math.max(additionalSpaceBottom, minSpace);
////
////                // Append the calculated spaces to each line
////                topLine.append(String.valueOf(enSpace).repeat(spacesToAddTop));
////                bottomLine.append(String.valueOf(enSpace).repeat(spacesToAddBottom));
////            }
////        }
////
////
////        // Adjust for the initial padding by ensuring the bottom line starts directly under the top line's first word
////        if (initialPaddingLength > 0) {
////            String initialPaddingForBottom = String.valueOf(enSpace).repeat(initialPaddingLength);
////            bottomLine = new StringBuilder(initialPaddingForBottom).append(bottomLine.toString());
////        }
//
////        String llResult = topLine.toString() + "\n" + bottomLine.toString();
//    }

//    public String[] calculateLLStringFormatted(LinkedList<DefinedWord> definedWords) {
//        int max_rows_allowed = 4;
//        String[] llResults = new String[Math.min(max_rows_allowed, definedWords.size())];
//        String enSpace = "\u2002"; // Using en space for padding
//
//        int minSpaces = 2;
//        int index = 0;
//        for (DefinedWord word : definedWords) {
//            if (index >= max_rows_allowed) break;
//            llResults[index] = word.inWord + enSpace.repeat(minSpaces) + "⟶" + enSpace.repeat(minSpaces) + word.inWordTranslation;
//            index++;
//        }
//
//        return llResults;
//    }

    public String[] calculateLLCombineResponseFormatted(LinkedList<LLCombineResponse> llCombineResponses) {
        int max_rows_allowed = 4;

        String[] llCombineResults = new String[Math.min(max_rows_allowed, llCombineResponses.size())];

        int minSpaces = 2;
        int index = 0;
        String enSpace = "\u2002";

        for (LLCombineResponse llCombineResponse : llCombineResponses) {
            if (index >= max_rows_allowed) break;
//            Log.d(TAG, llCombineResponse.toString());
            if(llCombineResponse.inWord!=null && llCombineResponse.inWordTranslation!=null){
                llCombineResults[index] = llCombineResponse.inWord + enSpace.repeat(minSpaces) + "⟶" + enSpace.repeat(minSpaces) + llCombineResponse.inWordTranslation;
            } else if (llCombineResponse.inUpgrade != null && llCombineResponse.inUpgradeMeaning!= null) {
                llCombineResults[index] = "⬆ " + llCombineResponse.inUpgrade + enSpace.repeat(minSpaces) + "-" + enSpace.repeat(minSpaces) + llCombineResponse.inUpgradeMeaning;
            }
            index++;
        }

        return llCombineResults;
    }

    public String[] calculateAdhdStmbStringFormatted(LinkedList<STMBSummary> summaries) {
        int max_rows_allowed = 4;
        String[] stmbResults = new String[Math.min(max_rows_allowed, summaries.size())];

        int minSpaces = 2;
        int index = 0;
        for (STMBSummary summary : summaries) {
            if (index >= max_rows_allowed) break;
            stmbResults[index] = summary.summary;
            index++;
        }

        return stmbResults;
    }

//    public String[] calculateLLUpgradeResponseFormatted(LinkedList<LLUpgradeResponse> llUpgradeResponses) {
//        int max_rows_allowed = 1;
//        String[] llUpgradeResults = new String[Math.min(max_rows_allowed, llUpgradeResponses.size())];
//
//        int minSpaces = 0;
//        int index = 0;
//        for (LLUpgradeResponse llUpgradeResponse : llUpgradeResponses) {
//            if (index >= max_rows_allowed) break;
//            llUpgradeResults[index] = "Upgrade: " + llUpgradeResponse.inUpgrade + " ( " + llUpgradeResponse.inUpgradeMeaning + " ) ";
//            index++;
//        }
//
//        return llUpgradeResults;
//    }

    public String[] calculateLLContextConvoResponseFormatted(LinkedList<ContextConvoResponse> contextConvoResponses) {
        int max_rows_allowed = 4;

        if (!clearedScreenYet) {
            if (isSmartGlassesServiceBound)
                smartGlassesService.sendHomeScreen();
            clearedScreenYet = true;
        }

        String[] llResults = new String[Math.min(max_rows_allowed, contextConvoResponses.size())];

        int index = 0;
        for (ContextConvoResponse contextConvoResponse: contextConvoResponses) {
            if (index >= max_rows_allowed) break;
            llResults[index] = contextConvoResponse.response;
            index++;
        }

        return llResults;
    }

    private String processString(String str) {
        if (str.length() > charsPerTranscript) {
            int startIndex = str.length() - charsPerTranscript;

            // Move startIndex forward to the next space to avoid splitting a word
            while (startIndex < str.length() && str.charAt(startIndex) != ' ') {
                startIndex++;
            }

            // If a space is found, start from the next character after the space
            if (startIndex < str.length()) {
                str = str.substring(startIndex + 1);
            } else {
                // If no space is found, it means the substring is a single long word
                // In this case, start from the original startIndex
                str = str.substring(str.length() - charsPerTranscript);
            }
        }

        int len = str.length();
        if (len > 2 * charsPerTranscript / 3) {
            // Insert newlines to split into three lines
            int index1 = len / 3;
            int index2 = 2 * len / 3;

            // Find the last space before index1
            while (index1 > 0 && str.charAt(index1) != ' ') {
                index1--;
            }
            // Insert first newline
            if (index1 > 0) {
                str = str.substring(0, index1) + "\n" + str.substring(index1 + 1);
                index2 += 1; // Adjust index2 after insertion
            }

            // Find the last space before index2
            while (index2 > index1 && str.charAt(index2) != ' ') {
                index2--;
            }
            // Insert second newline
            if (index2 > index1) {
                str = str.substring(0, index2) + "\n" + str.substring(index2 + 1);
            }
        } else if (len > charsPerTranscript / 3) {
            // Insert newline to split into two lines
            int index = len / 2;
            while (index > 0 && str.charAt(index) != ' ') {
                index--;
            }
            if (index > 0) {
                str = str.substring(0, index) + "\n" + str.substring(index + 1) + "\n";
            }
        } else {
            str = str + "\n\n";
        }

        return str;
    }

    private String processHanziString(String str) {
        if (str.length() > charsPerHanziTranscript) {
            str = str.substring(str.length() - charsPerHanziTranscript);
        }

        int len = str.length();
        if (len > 2 * charsPerHanziTranscript / 3) {
            // Split into three lines without searching for spaces
            int index1 = len / 3;
            int index2 = 2 * len / 3;

            // Insert first newline after index1
            str = str.substring(0, index1) + "\n" + str.substring(index1);

            // Adjust index2 after the first insertion
            index2 += 1;

            // Insert second newline after index2
            str = str.substring(0, index2) + "\n" + str.substring(index2);

        } else if (len > charsPerHanziTranscript / 3) {
            // Split into two lines
            int index = len / 2;

            // Insert newline at the middle
            str = str.substring(0, index) + "\n" + str.substring(index) + "\n";
        } else {
            // If string is shorter, add two newlines at the end
            str = str + "\n\n";
        }

        return str;
    }

    public void sendTextWallLiveCaptionLL(final String newLiveCaption, final String llString, final boolean isFinal) {
        String textBubble = "\uD83D\uDDE8";
        if (!llString.isEmpty()) {
            llCurrentString = llString;
        } else if (!newLiveCaption.isEmpty()) {
            if (AugmentosSmartGlassesService.getChosenTranscribeLanguage(this).equals("Chinese (Hanzi)") ||
                    AugmentosSmartGlassesService.getChosenTranscribeLanguage(this).equals("Chinese (Hanzi)") && !segmenterLoaded) {
                currentLiveCaption = processHanziString(finalLiveCaption + " " + newLiveCaption);
            } else {
                currentLiveCaption = processString(finalLiveCaption + " " + newLiveCaption);
            }
            if (isFinal) {
                finalLiveCaption += " " + newLiveCaption;
            }

            // Limit the length of the final live caption, in case it gets too long
            if (finalLiveCaption.length() > 5000) {
                finalLiveCaption = finalLiveCaption.substring(finalLiveCaption.length() - 5000);
            }
        }

        final String finalLiveCaption = textBubble + currentLiveCaption;
        if (isSmartGlassesServiceBound)
            smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendDoubleTextWall(llCurrentString, finalLiveCaption), true, false, true));
    }

    public void sendTextWallLiveTranslationLiveCaption(final String newText, final boolean isTranslated, final boolean isFinal) {
        if (!newText.isEmpty()) {
            if (isTranslated) {
                if (getChosenSourceLanguage(this).equals("Chinese (Hanzi)") ||
                        getChosenSourceLanguage(this).equals("Chinese (Pinyin)") && !segmenterLoaded) {
                    translationText = processHanziString(finalTranslationText + " " + newText);
                } else {
                    translationText = processString(finalTranslationText + " " + newText);
                }

                if (isFinal) {
                    finalTranslationText += " " + newText;
                }

                // Limit the length of the final translation text
                if (finalTranslationText.length() > 5000) {
                    finalTranslationText = finalTranslationText.substring(finalTranslationText.length() - 5000);
                }
            } else {
                if (AugmentosSmartGlassesService.getChosenTranscribeLanguage(this).equals("Chinese (Hanzi)") ||
                        AugmentosSmartGlassesService.getChosenTranscribeLanguage(this).equals("Chinese (Pinyin)") && !segmenterLoaded) {
                    liveCaptionText = processHanziString(finalLiveCaptionText + " " + newText);
                } else {
                    liveCaptionText = processString(finalLiveCaptionText + " " + newText);
                }

                if (isFinal) {
                    finalLiveCaptionText += " " + newText;
                }

                // Limit the length of the final live caption text
                if (finalLiveCaptionText.length() > 5000) {
                    finalLiveCaptionText = finalLiveCaptionText.substring(finalLiveCaptionText.length() - 5000);
                }
            }
        }

        String textBubble = "\uD83D\uDDE8";

        final String finalLiveTranslationDisplayText;
        if (!translationText.isEmpty()) {
            finalLiveTranslationDisplayText = textBubble + translationText + "\n";
        } else {
            finalLiveTranslationDisplayText = "\n\n\n";
        }

        final String finalLiveCaptionDisplayText;
        if (!liveCaptionText.isEmpty()) {
            finalLiveCaptionDisplayText = textBubble + liveCaptionText;
        } else {
            finalLiveCaptionDisplayText = "\n\n\n";
        }

        if (isSmartGlassesServiceBound)
            smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendDoubleTextWall(finalLiveTranslationDisplayText, finalLiveCaptionDisplayText), true, false, true));
    }

    public void parseConvoscopeResults(JSONObject response) throws JSONException {
        if (Objects.equals(getCurrentMode(this), "Language Learning") && AugmentosSmartGlassesService.getSelectedLiveCaptionsTranslation(this) == 2) return;
//        Log.d(TAG, "GOT CSE RESULT: " + response.toString());
        String imgKey = "image_url";
        String mapImgKey = "map_image_path";

        boolean isLiveCaptionsChecked = SmartGlassesAndroidService.getSelectedLiveCaptionsTranslation(this) != 0;

        //explicit queries
        JSONArray explicitAgentQueries = response.has(explicitAgentQueriesKey) ? response.getJSONArray(explicitAgentQueriesKey) : new JSONArray();

        JSONArray explicitAgentResults = response.has(explicitAgentResultsKey) ? response.getJSONArray(explicitAgentResultsKey) : new JSONArray();

        //displayResults
        JSONArray displayRequests = response.has(displayRequestsKey) ? response.getJSONArray(displayRequestsKey) : new JSONArray();

        //proactive agents
        JSONArray proactiveAgentResults = response.has(proactiveAgentResultsKey) ? response.getJSONArray(proactiveAgentResultsKey) : new JSONArray();
        JSONArray entityDefinitions = response.has(entityDefinitionsKey) ? response.getJSONArray(entityDefinitionsKey) : new JSONArray();

        //adhd STMB results
        JSONArray adhdStmbResults = response.has(adhdStmbAgentKey) ? response.getJSONArray(adhdStmbAgentKey) : new JSONArray();
        if (adhdStmbResults.length() != 0) {
            Log.d(TAG, "ADHD RESULTS: ");
            Log.d(TAG, adhdStmbResults.toString());

            if (!clearedScreenYet) {
                smartGlassesService.sendHomeScreen();
                clearedScreenYet = true;
            }

            updateAdhdSummaries(adhdStmbResults);
            String dynamicSummary = adhdStmbResults.getJSONObject(0).getString("summary");
            String [] adhdResults = calculateAdhdStmbStringFormatted(getAdhdStmbSummaries());
            smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendRowsCard(adhdResults), false, true, false));
            sendUiUpdateSingle(dynamicSummary);
            responsesBuffer.add(dynamicSummary);
        }

        JSONArray languageLearningResults = response.has(languageLearningKey) ? response.getJSONArray(languageLearningKey) : new JSONArray();
        JSONArray llWordSuggestUpgradeResults = response.has(llWordSuggestUpgradeKey) ? response.getJSONArray(llWordSuggestUpgradeKey) : new JSONArray();
        updateCombineResponse(languageLearningResults, llWordSuggestUpgradeResults);
        if (Objects.equals(getCurrentMode(this), "Language Learning") && (languageLearningResults.length() != 0 || llWordSuggestUpgradeResults.length() != 0)) {
            String [] llCombineResults = calculateLLCombineResponseFormatted(getLLCombineResponse());
            String newLineSeparator = isLiveCaptionsChecked ? "\n" : "\n\n";
            if (smartGlassesService.getConnectedDeviceModelOs() != SmartGlassesOperatingSystem.AUDIO_WEARABLE_GLASSES) {
                String textWallString = Arrays.stream(llCombineResults)
                        .reduce((a, b) -> b + newLineSeparator + a)
                        .orElse("");
                if (isLiveCaptionsChecked) sendTextWallLiveCaptionLL("", textWallString, false);
                else {
                    smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendTextWall(textWallString), true, true, true));
                }
            }
//            Log.d(TAG, "ll combine results"+ llCombineResults.toString());
            sendUiUpdateSingle(String.join("\n", llCombineResults));
            responsesBuffer.add(String.join("\n", llCombineResults));
        }

        JSONArray llContextConvoResults = response.has(llContextConvoKey) ? response.getJSONArray(llContextConvoKey) : new JSONArray();

        updateContextConvoResponses(llContextConvoResults); //sliding buffer, time managed context convo card
        String[] llContextConvoResponses;

        if (llContextConvoResults.length() != 0) {
            llContextConvoResponses = calculateLLContextConvoResponseFormatted(getContextConvoResponses());
            if (smartGlassesService.getConnectedDeviceModelOs() != SmartGlassesOperatingSystem.AUDIO_WEARABLE_GLASSES) {
                String textWallString = Arrays.stream(llContextConvoResponses)
                        .reduce((a, b) -> b + "\n\n" + a)
                        .orElse("");
                //sendRowsCard(llContextConvoResponses);

                if (isLiveCaptionsChecked) sendTextWallLiveCaptionLL("", textWallString, false);
                else {
                    smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendTextWall(textWallString), false, true, false));
                }
            }
            List<String> list = Arrays.stream(Arrays.copyOfRange(llContextConvoResponses, 0, llContextConvoResults.length())).filter(Objects::nonNull).collect(Collectors.toList());
            Collections.reverse(list);
            sendUiUpdateSingle(String.join("\n", list));
            responsesBuffer.add(String.join("\n", list));

            try {
                JSONObject llContextConvoResult = llContextConvoResults.getJSONObject(0);
//                Log.d(TAG, llContextConvoResult.toString());
                JSONObject toTTS = llContextConvoResult.getJSONObject("to_tts");
                String text = toTTS.getString("text");
                String language = toTTS.getString("language");
//                Log.d(TAG, "Text: " + text + ", Language: " + language);
                //sendTextToSpeech(text, language);
                smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendTextToSpeech(text, language), false, false, false));
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }

        // displayResults
        for (int i = 0; i < displayRequests.length(); i++) {
            try {
                JSONObject obj = displayRequests.getJSONObject(i);
                JSONObject req = obj.getJSONObject("data");
                JSONObject content = req.getJSONObject("content");
                String layout = req.getString("layout");
                String title;
                String body;
                switch (layout){
                    case "REFERENCE_CARD":
                        title = content.getString("title");
                        body = content.getString("body");
                        queueOutput(title + ": " + body);
                        smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendReferenceCard(title, body), false, false, false));
                        break;
                    case "TEXT_WALL":
                    case "TEXT_LINE":
                        body = content.getString("body");
                        queueOutput(body);
                        smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendTextWall(body), false, false,false));
                        break;
                    case "DOUBLE_TEXT_WALL":
                        String bodyTop = content.getString("bodyTop");
                        String bodyBottom = content.getString("bodyBottom");
                        queueOutput(bodyTop + "\n\n" + bodyBottom);
                        smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendDoubleTextWall(bodyTop, bodyBottom), false, false, false));
                        break;
                    case "ROWS_CARD":
                        JSONArray rowsArray = content.getJSONArray("rows");
                        String[] stringsArray = new String[rowsArray.length()];
                        for (int k = 0; k < rowsArray.length(); k++)
                            stringsArray[k] = rowsArray.getString(k);
                        queueOutput(String.join("\n", stringsArray));
                        smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendRowsCard(stringsArray), false, false, false));
                        break;
                    default:
                        Log.d(TAG, "SOME ISSUE");
                }
            }
            catch (JSONException e){
                e.printStackTrace();
            }
        }

        // entityDefinitions
        for (int i = 0; i < entityDefinitions.length(); i++) {
            try {
                JSONObject obj = entityDefinitions.getJSONObject(i);
                String name = obj.getString("name");
                String body = obj.getString("summary");
                if (isSmartGlassesServiceBound)
                    smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendReferenceCard("" + name + "", body), false, false, false));
                queueOutput(name + ": " + body);
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        long wakeWordTime = response.has(wakeWordTimeKey) ? response.getLong(wakeWordTimeKey) : -1;

        // Wake word indicator
        if (wakeWordTime != -1 && wakeWordTime != previousWakeWordTime){
            previousWakeWordTime = wakeWordTime;
            String body = "Listening... ";
            if (isSmartGlassesServiceBound)
                smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendReferenceCard(glassesCardTitle, body), true, true, false));
            queueOutput(body);
        }

        //go through explicit agent queries and add to resultsToDisplayList
        // "Processing query: " indicator
        for (int i = 0; i < explicitAgentQueries.length(); i++){
            try {
                JSONObject obj = explicitAgentQueries.getJSONObject(i);
                String title = "Processing Query";
                String body = "\"" + obj.getString("query") + "\"";
                if (isSmartGlassesServiceBound)
                    smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendReferenceCard(title, body), true, true, false));
                queueOutput(body);
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        //go through explicit agent results and add to resultsToDisplayList
        // Show Wake Word Query
        for (int i = 0; i < explicitAgentResults.length(); i++){
            Log.d(TAG, "explicitAgentResults.toString() *************");
            Log.d(TAG, explicitAgentResults.toString());
            try {
                JSONObject obj = explicitAgentResults.getJSONObject(i);
                //String body = "Response: " + obj.getString("insight");
                String body = obj.getString("insight");
                if (isSmartGlassesServiceBound)
                    smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendReferenceCard(glassesCardTitle, body), true, false, false));
                queueOutput(body);
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        //go through proactive agent results and add to resultsToDisplayList
        for (int i = 0; i < proactiveAgentResults.length(); i++){
            try {
                JSONObject obj = proactiveAgentResults.getJSONObject(i);
                String name = obj.getString("agent_name") + " says";
                String body = obj.getString("agent_insight");
                if (isSmartGlassesServiceBound)
                    smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendReferenceCard(name, body), false, false, false));
                queueOutput(name + ": " + body);
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        //see if we should update user settings
        boolean shouldUpdateSettingsResult = response.has(shouldUpdateSettingsKey) && response.getBoolean(shouldUpdateSettingsKey);
        if (shouldUpdateSettingsResult){
            Log.d(TAG, "Running get settings because shouldUpdateSettings true");
            getSettings();
        }
    }

    public void parseLocationResults(JSONObject response) throws JSONException {
        Log.d(TAG, "GOT LOCATION RESULT: " + response.toString());
        // ll context convo
    }

    // Display things to the phone screen
    public void queueOutput(String item){
        responsesBuffer.add(item);
        sendUiUpdateSingle(item);
    }

    public void speakTTS(String toSpeak){
        if (isSmartGlassesServiceBound)
            smartGlassesService.sendTextLine(toSpeak);
    }

    public void sendUiUpdateFull(){
        Intent intent = new Intent();
        intent.setAction(ConvoscopeUi.UI_UPDATE_FULL);
        intent.putStringArrayListExtra(ConvoscopeUi.CONVOSCOPE_MESSAGE_STRING, responsesBuffer);
        intent.putStringArrayListExtra(ConvoscopeUi.TRANSCRIPTS_MESSAGE_STRING, transcriptsBuffer);
        sendBroadcast(intent);
    }

    public void sendUiUpdateSingle(String message) {
        Intent intent = new Intent();
        intent.setAction(ConvoscopeUi.UI_UPDATE_SINGLE);
        intent.putExtra(ConvoscopeUi.CONVOSCOPE_MESSAGE_STRING, message);
        sendBroadcast(intent);
    }

    public void sendFinalTranscriptToActivity(String transcript){
        Intent intent = new Intent();
        intent.setAction(ConvoscopeUi.UI_UPDATE_FINAL_TRANSCRIPT);
        intent.putExtra(ConvoscopeUi.FINAL_TRANSCRIPT, transcript);
        sendBroadcast(intent);
    }

    public void buttonDownEvent(int buttonNumber, boolean downUp){ //downUp if true if down, false if up
        if (!downUp){
            return;
        }

        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("button_num", buttonNumber);
            jsonQuery.put("button_activity", downUp);
            jsonQuery.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(BUTTON_EVENT_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        Log.d(TAG, "GOT BUTTON RESULT: " + result.toString());
                        String query_answer = result.getString("message");
                        sendUiUpdateSingle(query_answer);
                        speakTTS(query_answer);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (buttonDownEvent)");
                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void setupAuthTokenMonitor(){
        idTokenListener = new FirebaseAuth.IdTokenListener() {
            @Override
            public void onIdTokenChanged(@NonNull FirebaseAuth firebaseAuth) {
                FirebaseUser user = firebaseAuth.getCurrentUser();
                if (user != null) {
                    user.getIdToken(true).addOnCompleteListener(new OnCompleteListener<GetTokenResult>() {
                        @Override
                        public void onComplete(@NonNull Task<GetTokenResult> task) {
                            if (task.isSuccessful()) {
                                String idToken = task.getResult().getToken();
                                Log.d(TAG, "GOT ONIDTOKENCHANGED Auth Token: " + idToken);
                                authToken = idToken;
                                PreferenceManager.getDefaultSharedPreferences(getApplicationContext())
                                        .edit()
                                        .putString("auth_token", idToken)
                                        .apply();
                            } else {
                                Log.d(TAG, "Task failure in setAuthToken");
                                EventBus.getDefault().post(new GoogleAuthFailedEvent("#1 ERROR IN (setupAuthTokenMonitor)"));
                            }
                        }
                    });
                }
            }
        };
    }

    public void manualSetAuthToken() {
        Log.d(TAG, "GETTING AUTH TOKEN");
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user != null) {
            user.getIdToken(true)
                    .addOnCompleteListener(new OnCompleteListener<GetTokenResult>() {
                        public void onComplete(@NonNull Task<GetTokenResult> task) {
                            if (task.isSuccessful()) {
                                String idToken = task.getResult().getToken();
                                Log.d(TAG, "GOT dat MANUAL Auth Token: " + idToken);
                                authToken = idToken;
                                PreferenceManager.getDefaultSharedPreferences(getApplicationContext())
                                        .edit()
                                        .putString("auth_token", idToken)
                                        .apply();
                            } else {
                                Log.d(TAG, "Task failure in setAuthToken");
                                EventBus.getDefault().post(new GoogleAuthFailedEvent("#1 ERROR IN (SETAUTHTOKEN)"));
                            }
                        }
                    });
        } else {
            // not logged in, must log in
            Log.d(TAG, "User is null in setAuthToken");
            EventBus.getDefault().post(new GoogleAuthFailedEvent("#2 ERROR IN (SETAUTHTOKEN) (USER IS NULL)"));
        }
    }

    public static void saveChosenTargetLanguage(Context context, String targetLanguageString) {
        Log.d("CONVOSCOPE", "SAVING TARGET LANGUAGE: " + targetLanguageString);
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_TARGET_LANGUAGE), targetLanguageString)
                .apply();
    }

//    public Boolean isVocabularyUpgradeEnabled(Context context) {
//        return PreferenceManager.getDefaultSharedPreferences(context)
//                .getBoolean(context.getResources().getString(R.string.SHARED_PREF_VOCABULARY_UPGRADE), false);
//    }

    public Boolean isVocabularyUpgradeEnabled(Context context) {
        return PreferenceManager.getDefaultSharedPreferences(context)
                .getBoolean(context.getResources().getString(R.string.SHARED_PREF_VOCABULARY_UPGRADE), true);
    }

    public void setVocabularyUpgradeEnabled(Context context, boolean isEnabled) {
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putBoolean(context.getResources().getString(R.string.SHARED_PREF_VOCABULARY_UPGRADE), isEnabled)
                .apply();
    }

    public static void saveChosenSourceLanguage(Context context, String sourceLanguageString) {
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_SOURCE_LANGUAGE), sourceLanguageString)
                .apply();
    }

    public static String getChosenTargetLanguage(Context context) {
        String targetLanguageString = PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_TARGET_LANGUAGE), "");
        if (targetLanguageString.equals("")){
            saveChosenTargetLanguage(context, "Russian");
            targetLanguageString = "Russian";
        }
        return targetLanguageString;
    }

    public static String getChosenSourceLanguage(Context context) {
        String sourceLanguageString = PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_SOURCE_LANGUAGE), "");
        if (sourceLanguageString.equals("")){
            saveChosenSourceLanguage(context, "English");
            sourceLanguageString = "English";
        }
        return sourceLanguageString;
    }

//    public void changeMode(String currentModeString){
//        if (currentModeString.equals("Proactive Agents")){
//            features = new String[]{explicitAgent, proactiveAgents, definerAgent};
//        } else if (currentModeString.equals("Language Learning")){
//            features = new String[]{explicitAgent, languageLearningAgent, llContextConvoAgent};
//        } else if (currentModeString.equals("ADHD Glasses")){
//            Log.d(TAG, "Settings features for ADHD Glasses");
//            features = new String[]{explicitAgent, adhdStmbAgent};
//        }
//    }

    public static void saveCurrentModeLocal(Context context, String currentModeString) {
        //save the new mode
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_CURRENT_MODE), currentModeString)
                .apply();
    }

    public void saveCurrentMode(Context context, String currentModeString) {
        if (isSmartGlassesServiceBound)
            smartGlassesService.sendHomeScreen();

        saveCurrentModeLocal(context, currentModeString);

        try{
            JSONObject settingsObj = new JSONObject();
            settingsObj.put("current_mode", currentModeString);
            sendSettings(settingsObj);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public String getCurrentMode(Context context) {
        String currentModeString = PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_CURRENT_MODE), "");
        // if (currentModeString.equals("")){
        //     currentModeString = "Proactive Agents";
        //     saveCurrentMode(context, currentModeString);
        // }
        return currentModeString;
    }

    public void updateVocabularyUpgradeOnBackend(Context context){
        Boolean upgradeEnabled = isVocabularyUpgradeEnabled(context);
        try{
            JSONObject settingsObj = new JSONObject();
            settingsObj.put("vocabulary_upgrade_enabled", upgradeEnabled);
            sendSettings(settingsObj);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }
    public void updateTargetLanguageOnBackend(Context context){
        String targetLanguage = getChosenTargetLanguage(context);
        try{
            JSONObject settingsObj = new JSONObject();
            settingsObj.put("target_language", targetLanguage);
            sendSettings(settingsObj);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }


    public void updateSourceLanguageOnBackend(Context context){
        String sourceLanguage = getChosenSourceLanguage(context);
        try{
            JSONObject settingsObj = new JSONObject();
            settingsObj.put("source_language", sourceLanguage);
            sendSettings(settingsObj);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }


    //language learning
    public void updateDefinedWords(JSONArray newData) {
        long currentTime = System.currentTimeMillis();

        // Add new data to the list
        for (int i = 0; i < newData.length(); i++) {
            try {
                JSONObject wordData = newData.getJSONObject(i);
                definedWords.addFirst(new DefinedWord(
                        wordData.getString("in_word"),
                        wordData.getString("in_word_translation"),
                        wordData.getLong("timestamp"),
                        wordData.getString("uuid")
                ));
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        // Remove old words based on time constraint
        definedWords.removeIf(word -> (currentTime - (word.timestamp * 1000)) > llDefinedWordsShowTime);

        // Ensure list does not exceed max size
        while (definedWords.size() > maxDefinedWordsShow) {
            definedWords.removeLast();
        }
    }

    public void updateCombineResponse(JSONArray llData, JSONArray ugData) {
        long currentTime = System.currentTimeMillis();
        // Add new data to the list
        for (int i = 0; i < llData.length(); i++) {
            try {
                JSONObject wordData = llData.getJSONObject(i);
                llCombineResponses.addFirst(new LLCombineResponse(
                        null,
                        null,
                        wordData.getString("in_word"),
                        wordData.getString("in_word_translation"),
                        wordData.getLong("timestamp"),
                        wordData.getString("uuid")
                ));
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        for (int i = 0; i < ugData.length(); i++) {
            try {
                JSONObject resData = ugData.getJSONObject(i);
                llCombineResponses.addFirst(new LLCombineResponse(
                        resData.getString("in_upgrade"),
                        resData.getString("in_upgrade_meaning"),
                        null,
                        null,
                        resData.getLong("timestamp"),
                        resData.getString("uuid")
                ));
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        // Remove old words based on time constraint
        llCombineResponses.removeIf(word -> (currentTime - (word.timestamp * 1000)) > llCombineShowTime);

        // Ensure list does not exceed max size
        while (llCombineResponses.size() > maxLLCombineShow) {
            llCombineResponses.removeLast();
        }
    }

    public void updateAdhdSummaries(JSONArray newData) {
        long currentTime = System.currentTimeMillis();
        boolean foundNewFalseShift = false;
        STMBSummary newFalseShiftSummary = null;

        // First, identify if there's a new summary with true_shift = false and prepare it
        for (int i = 0; i < newData.length(); i++) {
            try {
                JSONObject summaryData = newData.getJSONObject(i);
                if (!summaryData.getBoolean("true_shift")) {
                    foundNewFalseShift = true;
                    newFalseShiftSummary = new STMBSummary(
                            summaryData.getString("summary"),
                            summaryData.getLong("timestamp"),
                            false,
                            summaryData.getString("uuid"));
                    break; // Stop after finding the first false shift as only one should exist
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }

        // If a new false shift summary exists, remove the old false shift summary
        if (foundNewFalseShift) {
            adhdStmbSummaries.removeIf(summary -> !summary.true_shift);
        }

        // Now, add new data while excluding the newly identified false shift summary
        for (int i = 0; i < newData.length(); i++) {
            try {
                JSONObject summaryData = newData.getJSONObject(i);
                if (summaryData.getBoolean("true_shift") || !foundNewFalseShift || !summaryData.getString("uuid").equals(newFalseShiftSummary.uuid)) {
                    adhdStmbSummaries.addFirst(new STMBSummary(
                            summaryData.getString("summary"),
                            summaryData.getLong("timestamp"),
                            summaryData.getBoolean("true_shift"),
                            summaryData.getString("uuid")
                    ));
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }

        // Add the new false shift summary at the beginning if it exists
        if (newFalseShiftSummary != null) {
            adhdStmbSummaries.addFirst(newFalseShiftSummary);
        }

        // Remove old words based on time constraint
        adhdStmbSummaries.removeIf(summary -> (currentTime - (summary.timestamp * 1000)) > adhdSummaryShowTime);

        // Ensure list does not exceed max size
        while (adhdStmbSummaries.size() > maxAdhdStmbShowNum) {
            adhdStmbSummaries.removeLast();
        }
    }

    // Getter for the list, if needed
    public LinkedList<DefinedWord> getDefinedWords() {
        return definedWords;
    }

    public LinkedList<STMBSummary> getAdhdStmbSummaries() {
        return adhdStmbSummaries;
    }

    public LinkedList<LLUpgradeResponse> getLLUpgradeResponse() {
        return llUpgradeResponses;
    }

    public LinkedList<LLCombineResponse> getLLCombineResponse() {
        return llCombineResponses;
    }

    // A simple representation of your word data
    private static class DefinedWord {
        String inWord;
        String inWordTranslation;
        long timestamp;
        String uuid;

        DefinedWord(String inWord, String inWordTranslation, long timestamp, String uuid) {
            this.inWord = inWord;
            this.inWordTranslation = inWordTranslation;
            this.timestamp = timestamp;
            this.uuid = uuid;
        }
    }

    // A simple representation of upgrade word data
    // private static class UpgradeWord {
    //     String inUpgrade;
    //     String inUpgradeMeaning;
    //     long timestamp;
    //     String uuid;

    //     UpgradeWord(String inUpgrade, String inUpgradeMeaning, long timestamp, String uuid) {
    //         this.inUpgrade = inUpgrade;
    //         this.inUpgradeMeaning = inUpgradeMeaning;
    //         this.timestamp = timestamp;
    //         this.uuid = uuid;
    //     }
    // }

    // A simple representation of ADHD STMB data
    private static class STMBSummary {
        String summary;
        long timestamp;
        boolean true_shift;
        String uuid;

        STMBSummary(String summary, long timestamp, boolean true_shift, String uuid) {
            this.summary = summary;
            this.timestamp = timestamp;
            this.true_shift = true_shift;
            this.uuid = uuid;
        }
    }


    //context convo
    public void updateContextConvoResponses(JSONArray newData) {
        long currentTime = System.currentTimeMillis();
//        Log.d(TAG, "GOT NEW DATA: ");
//        Log.d(TAG, newData.toString());

        // Add new data to the list
        for (int i = 0; i < newData.length(); i++) {
            try {
                JSONObject wordData = newData.getJSONObject(i);
                contextConvoResponses.addFirst(new ContextConvoResponse(
                        wordData.getString("ll_context_convo_response"),
                        wordData.getLong("timestamp"),
                        wordData.getString("uuid")
                ));
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        contextConvoResponses.removeIf(contextConvoResponse -> (currentTime - (contextConvoResponse.timestamp * 1000)) > llContextConvoResponsesShowTime);

        // Ensure list does not exceed max size
        while (contextConvoResponses.size() > maxContextConvoResponsesShow) {
            contextConvoResponses.removeLast();
        }
    }

    public void updateLLUpgradeResponse(JSONArray newData) {
        long currentTime = System.currentTimeMillis();
        // Add new data to the list
        for (int i = 0; i < newData.length(); i++) {
            try {
                JSONObject resData = newData.getJSONObject(i);
                llUpgradeResponses.addFirst(new LLUpgradeResponse(
                        resData.getString("in_upgrade"),
                        resData.getString("in_upgrade_meaning"),
                        resData.getLong("timestamp"),
                        resData.getString("uuid")
                ));
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        llUpgradeResponses.removeIf(llupgradeResponse -> (currentTime - (llupgradeResponse.timestamp * 1000)) > llUpgradeShowTime);

        // Ensure list does not exceed max size
        while (llUpgradeResponses.size() > maxLLUpgradeResponsesShow) {
            llUpgradeResponses.removeLast();
        }
    }



    // Getter for the list, if needed
    public LinkedList<ContextConvoResponse> getContextConvoResponses() {
        return contextConvoResponses;
    }

    // A simple representation of your word data
    private static class ContextConvoResponse {
        String response;
        long timestamp;
        String uuid;

        ContextConvoResponse(String response, long timestamp, String uuid) {
            this.response = response;
            this.timestamp = timestamp;
            this.uuid = uuid;
        }
    }

    private static class LLUpgradeResponse {
        String inUpgrade;
        String inUpgradeMeaning;
        long timestamp;
        String uuid;

        LLUpgradeResponse(String inUpgrade, String inUpgradeMeaning, long timestamp, String uuid) {
            this.inUpgrade = inUpgrade;
            this.inUpgradeMeaning = inUpgradeMeaning;
            this.timestamp = timestamp;
            this.uuid = uuid;
        }
    }

    // A simple representation of combination of ll rare and ll upgrade
    private static class LLCombineResponse {
        String inUpgrade;
        String inUpgradeMeaning;
        String inWord;
        String inWordTranslation;
        long timestamp;
        String uuid;

        LLCombineResponse(String inUpgrade, String inUpgradeMeaning,String inWord, String inWordTranslation, long timestamp, String uuid) {
            this.inUpgrade = inUpgrade;
            this.inUpgradeMeaning = inUpgradeMeaning;
            this.inWord = inWord;
            this.inWordTranslation = inWordTranslation;
            this.timestamp = timestamp;
            this.uuid = uuid;
        }
    }

    //retry auth right away if it failed, but don't do it too much as we have a max # refreshes/day
    private int max_google_retries = 3;
    private int googleAuthRetryCount = 0;
    private long lastGoogleAuthRetryTime = 0;

    @Subscribe
    public void onGoogleAuthFailedEvent(GoogleAuthFailedEvent event) {
        Log.d(TAG, "onGoogleAuthFailedEvent triggered");
        numConsecutiveAuthFailures += 1;
        if(numConsecutiveAuthFailures > 10) {
            Log.d("TAG", "ATTEMPT SIGN OUT");
            handleSignOut();
        }
    }

    // Used for notifications and for screen mirror
    @Subscribe
    public void onNewScreenTextEvent(NewScreenTextEvent event) {
        // Notification
        if (event.title != null && event.body != null) {
            if (isSmartGlassesServiceBound)
                smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendReferenceCard(event.title, event.body), false, false, false));
        }
        else if (event.body != null){ //Screen mirror text
            if (isSmartGlassesServiceBound)
                smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendTextWall(event.body), false, true, false));
        }
    }

    @Subscribe
    public void onNewScreenImageEvent(NewScreenImageEvent event) {
        if (isSmartGlassesServiceBound)
            smartGlassesService.displayQueue.addTask(new DisplayQueue.Task(() -> smartGlassesService.sendBitmap(event.bmp), false, true, false));
    }

    private void updateLastDataSentTime() {
        lastDataSentTime = System.currentTimeMillis();
    }

    private void startNotificationService() {
        Intent notificationServiceIntent = new Intent(this, MyNotificationListeners.class);
        startService(notificationServiceIntent);

        NotificationListenerService.requestRebind(
                new ComponentName(this, MyNotificationListeners.class));
    }

    private void stopNotificationService() {
        Intent notificationServiceIntent = new Intent(this, MyNotificationListeners.class);
        stopService(notificationServiceIntent);
    }

    public JSONObject generateStatusJson() {
        try {
            // Creating the main status object
            JSONObject status = new JSONObject();

            // Adding puck battery life and charging status
            status.put("puck_battery_life", 25);
            status.put("charging_status", true);

            // Adding connected glasses object
            JSONObject connectedGlasses = new JSONObject();
            connectedGlasses.put("model_name", "Vuzix Z100");
            connectedGlasses.put("battery_life", 10);
            status.put("connected_glasses", connectedGlasses);

            // Adding wifi status
            JSONObject wifi = new JSONObject();
            wifi.put("is_connected", true);
            wifi.put("ssid", "test-ssid");
            wifi.put("signal_strength", 75);
            status.put("wifi", wifi);

            // Adding gsm status
            JSONObject gsm = new JSONObject();
            gsm.put("is_connected", true);
            gsm.put("carrier", "T-Mobile");
            gsm.put("signal_strength", 85);
            status.put("gsm", gsm);

            // Adding apps array
            JSONArray apps = new JSONArray();

            // First app
            JSONObject app1 = new JSONObject();
            app1.put("name", "Proactive Agents");
            app1.put("description", "Convoscope is rad");
            app1.put("is_running", false);
            app1.put("is_foreground", false);
            app1.put("package_name", "Proactive Agents");
            apps.put(app1);

            // Second app
            JSONObject app2 = new JSONObject();
            app2.put("name", "Language Learning");
            app2.put("description", "Language Learning is also rad");
            app2.put("is_running", false);
            app2.put("is_foreground", false);
            app2.put("package_name", "Language Learning");
            apps.put(app2);

            // Third app
            JSONObject app3 = new JSONObject();
            app3.put("name", "ADHD Live Memory Aid");
            app3.put("description", "I don't remember what this app does");
            app3.put("is_running", false);
            app3.put("is_foreground", false);
            app3.put("package_name", "ADHD Live Memory Aid");
            apps.put(app3);

            // Adding apps array to the status object
            status.put("apps", apps);

            // Wrapping the status object inside a main object (as shown in your example)
            JSONObject mainObject = new JSONObject();
            mainObject.put("status", status);

            return mainObject;
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
    }

    // AugmentOS_Manager Comms Callbacks

    @Override
    public void requestStatus() {
        Log.d("AugmentOsService", "Requesting status: ");
        // Build status obj, send to aosmanager
        JSONObject status = generateStatusJson();
        blePeripheral.sendDataToAugmentOsManager(status.toString());

    }

    @Override
    public void connectToWearable(String wearableId) {
        Log.d("AugmentOsService", "Connecting to wearable: " + wearableId);
        // Logic to connect to wearable
        startSmartGlassesService();
    }

    @Override
    public void disconnectWearable(String wearableId) {
        Log.d("AugmentOsService", "Disconnecting from wearable: " + wearableId);
        // Logic to disconnect wearable
        stopSmartGlassesService();
    }

    @Override
    public void enableVirtualWearable(boolean enabled) {
        Log.d("AugmentOsService", "Virtual wearable enabled: " + enabled);
        // Logic to enable/disable virtual wearable
        if (enabled)
            AugmentosSmartGlassesService.savePreferredWearable(this, new AudioWearable().deviceModelName);
        else
            AugmentosSmartGlassesService.savePreferredWearable(this, "");

        if (isSmartGlassesServiceBound) restartSmartGlassesService();
    }

    @Override
    public void startApp(String packageName) {
        Log.d("AugmentOsService", "Starting app: " + packageName);
        // Logic to start the app by package name

        // NOTE: Until TPA paradigm is reimplemented, this just switches modes
        saveCurrentMode(this, packageName);
    }

    @Override
    public void stopApp(String packageName) {
        Log.d("AugmentOsService", "Stopping app: " + packageName);
        // Logic to stop the app by package name

        // NOTE: Until TPA paradigm is reimplemented, this just switches modes
        saveCurrentMode(this, "");
    }

    @Override
    public void setAuthSecretKey(String authSecretKey) {
        Log.d("AugmentOsService", "Setting auth secret key: " + authSecretKey);
        // Logic to set the authentication key
        // Save the new authSecretKey & verify it

        // NOTE: This wont be used until phase 2
    }

    @Override
    public void verifyAuthSecretKey() {
        Log.d("AugmentOsService", "Deleting auth secret key");
        // Logic to verify the authentication key
        // (Ping a server /login or /verify route & return the result to aosManager)

        // NOTE: This wont be used until phase 2
    }

    @Override
    public void deleteAuthSecretKey() {
        Log.d("AugmentOsService", "Deleting auth secret key");
        // Logic to delete the authentication key
        // Delete our authSecretKey

        // NOTE: This wont be used until phase 2
    }

    @Override
    public void updateAppSettings(String targetApp, JSONObject settings) {
        Log.d("AugmentOsService", "Updating settings for app: " + targetApp);
        // Logic to update the app's settings

        // TODO: Hardcode this for now because the only relevant app here is LLSG
        // TODO: Long term, figure out how to architect this system
        if(targetApp.equals(("Language Learning"))){
            try {
                String newSourceLanguage = settings.getString("sourceLanguage");
                String newTargetLanguage = settings.getString("targetLanguage");
                String newTranscribeLanguage = settings.getString("transcribeLanguage");
                String newVocabularyUpgrade = settings.getString("vocabularyUpgrade");
                String newLiveCaptionsTranslationOption = settings.getString("liveCaptionsTranslationOption");

            } catch (JSONException e){}
        }
    }

    public class LocalBinder extends Binder {
        public AugmentosService getService() {
            // Return this instance of LocalService so clients can call public methods
            return AugmentosService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }
}
