package com.augmentos.smartglassesmanager;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Binder;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.util.Log;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;
import androidx.lifecycle.LifecycleService;
import androidx.preference.PreferenceManager;

import com.augmentos.smartglassesmanager.eventbusmessages.NewAsrLanguagesEvent;
import com.augmentos.smartglassesmanager.smartglassescommunicators.SmartGlassesFontSize;
import com.augmentos.smartglassesmanager.comms.MessageTypes;
import com.augmentos.augmentoslib.events.BulletPointListViewRequestEvent;
import com.augmentos.augmentoslib.events.CenteredTextViewRequestEvent;
import com.augmentos.augmentoslib.events.DoubleTextWallViewRequestEvent;
import com.augmentos.augmentoslib.events.FinalScrollingTextRequestEvent;
import com.augmentos.augmentoslib.events.HomeScreenEvent;
import com.augmentos.augmentoslib.events.ReferenceCardImageViewRequestEvent;
import com.augmentos.augmentoslib.events.ReferenceCardSimpleViewRequestEvent;
import com.augmentos.augmentoslib.events.RowsCardViewRequestEvent;
import com.augmentos.augmentoslib.events.SendBitmapViewRequestEvent;
import com.augmentos.smartglassesmanager.eventbusmessages.SetFontSizeEvent;
import com.augmentos.augmentoslib.events.TextWallViewRequestEvent;
import com.augmentos.augmentoslib.events.ScrollingTextViewStartRequestEvent;
import com.augmentos.augmentoslib.events.ScrollingTextViewStopRequestEvent;
import com.augmentos.smartglassesmanager.eventbusmessages.SmartGlassesConnectionEvent;
import com.augmentos.augmentoslib.events.TextLineViewRequestEvent;
import com.augmentos.smartglassesmanager.eventbusmessages.TextToSpeechEvent;
import com.augmentos.smartglassesmanager.speechrecognition.ASR_FRAMEWORKS;
import com.augmentos.smartglassesmanager.speechrecognition.SpeechRecSwitchSystem;
import com.augmentos.smartglassesmanager.supportedglasses.AudioWearable;
import com.augmentos.smartglassesmanager.supportedglasses.EvenRealitiesG1;
import com.augmentos.smartglassesmanager.supportedglasses.InmoAirOne;
import com.augmentos.smartglassesmanager.supportedglasses.MentraMach1;
import com.augmentos.smartglassesmanager.supportedglasses.SmartGlassesDevice;
import com.augmentos.smartglassesmanager.supportedglasses.SmartGlassesOperatingSystem;
import com.augmentos.smartglassesmanager.supportedglasses.TCLRayNeoXTwo;
import com.augmentos.smartglassesmanager.supportedglasses.VuzixShield;
import com.augmentos.smartglassesmanager.supportedglasses.VuzixUltralite;
import com.augmentos.smartglassesmanager.texttospeech.TextToSpeechSystem;
import com.augmentos.smartglassesmanager.utils.SmartGlassesConnectionState;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.EventBusException;
import org.greenrobot.eventbus.Subscribe;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;

import io.reactivex.rxjava3.subjects.PublishSubject;

/** Main service of Smart Glasses Manager, that starts connections to smart glasses and talks to third party apps (3PAs) */
public abstract class SmartGlassesAndroidService extends LifecycleService {
    private static final String TAG = "SGM_ASP_Service";

    // Service Binder given to clients
    private final IBinder binder = new LocalBinder();
    public static final String ACTION_START_FOREGROUND_SERVICE = "MY_ACTION_START_FOREGROUND_SERVICE";
    public static final String ACTION_STOP_FOREGROUND_SERVICE = "MY_ACTION_STOP_FOREGROUND_SERVICE";
    private int myNotificationId;
    private Class mainActivityClass;
    private String myChannelId;
    private String notificationAppName;
    private String notificationDescription;
    private int notificationDrawable;

    //Text to Speech
    private TextToSpeechSystem textToSpeechSystem;

    //observables to send data around app
    PublishSubject<JSONObject> dataObservable;

    //representatives of the other pieces of the system
    SmartGlassesRepresentative smartGlassesRepresentative;

    //speech rec
    SpeechRecSwitchSystem speechRecSwitchSystem;

    //connection handler
    public Handler connectHandler;
    String translationLanguage;

    public SmartGlassesAndroidService(Class mainActivityClass, String myChannelId, int myNotificationId, String notificationAppName, String notificationDescription, int notificationDrawable){
        this.myNotificationId = myNotificationId;
        this.mainActivityClass = mainActivityClass;
        this.myChannelId = myChannelId;
        this.notificationAppName = notificationAppName;
        this.notificationDescription = notificationDescription;
        this.notificationDrawable = notificationDrawable;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        //setup connection handler
        connectHandler = new Handler();

        //start speech rec
        speechRecSwitchSystem = new SpeechRecSwitchSystem(this.getApplicationContext());
        ASR_FRAMEWORKS asrFramework = getChosenAsrFramework(this.getApplicationContext());
        String transcribeLanguage = getChosenTranscribeLanguage(this.getApplicationContext());
        String targetLanguage = getChosenTargetLanguage(this.getApplicationContext());
        String sourceLanguage = getChosenSourceLanguage(this.getApplicationContext());
        int selectedLiveCaptionsTranslation = getSelectedLiveCaptionsTranslation(this.getApplicationContext());
        if (selectedLiveCaptionsTranslation != 2) speechRecSwitchSystem.startAsrFramework(asrFramework);
        else {
            if (transcribeLanguage.equals(sourceLanguage)) speechRecSwitchSystem.startAsrFramework(asrFramework); // If transcribe language and source language are the same translate to the target language
            else speechRecSwitchSystem.startAsrFramework(asrFramework);
        }
//        speechRecSwitchSystem.startAsrFramework(asrFramework, "Chinese (Hanzi)", "English");

        //setup data observable which passes information (transcripts, commands, etc. around our app using mutlicasting
        dataObservable = PublishSubject.create();

        //start text to speech
        textToSpeechSystem = new TextToSpeechSystem(this);
        textToSpeechSystem.setup();
    }

    protected void setupEventBusSubscribers() {
        try {
            EventBus.getDefault().register(this);
        }
        catch(EventBusException e){
            e.printStackTrace();
        }
    }

    @Subscribe
    public void handleConnectionEvent(SmartGlassesConnectionEvent event) {
        sendUiUpdate();
    }

    protected abstract void onGlassesConnectionStateChanged(SmartGlassesDevice device, SmartGlassesConnectionState connectionState);

    public void connectToSmartGlasses(SmartGlassesDevice device) {
        LifecycleService currContext = this;

        // If we already have a representative for the same device, reuse it
        if (smartGlassesRepresentative == null || !smartGlassesRepresentative.smartGlassesDevice.deviceModelName.equals(device.deviceModelName)) {
            smartGlassesRepresentative = new SmartGlassesRepresentative(
                    currContext,
                    device,
                    currContext,
                    dataObservable
            );
        }

        // Use connectHandler to do the connecting
        connectHandler.post(new Runnable() {
            @Override
            public void run() {
                Log.d(TAG, "CONNECTING TO SMART GLASSES");
                smartGlassesRepresentative.connectToSmartGlasses();
            }
        });
    }

    public void findCompatibleDeviceNames(SmartGlassesDevice device) {
        LifecycleService currContext = this;

        // Same check as above: do not re-create the representative if it’s the same device
        if (smartGlassesRepresentative == null || !smartGlassesRepresentative.smartGlassesDevice.deviceModelName.equals(device.deviceModelName)) {
            smartGlassesRepresentative = new SmartGlassesRepresentative(
                    currContext,
                    device,
                    currContext,
                    dataObservable
            );
        }

        // Just call findCompatibleDeviceNames on the same instance
        connectHandler.post(new Runnable() {
            @Override
            public void run() {
                Log.d(TAG, "FINDING COMPATIBLE SMART GLASSES DEVICE NAMES");
                smartGlassesRepresentative.findCompatibleDeviceNames();
            }
        });
    }

//    public boolean tryConnectToPreferredWearable() {
//        String preferredWearableName = getPreferredWearable(getApplicationContext());
//
//        if (preferredWearableName == null || preferredWearableName.trim().isEmpty()) {
//            Log.d(TAG, "No preferred wearable stored. Cannot connect.");
//            return false;
//        }
//
//        SmartGlassesDevice matchingDevice = getSmartGlassesDeviceFromModelName(preferredWearableName);
//
//        if (matchingDevice != null) {
//            Log.d(TAG, "Trying to connect to preferred wearable: " + preferredWearableName);
//            connectToSmartGlasses(matchingDevice);
//            return true;
//        } else {
//            Log.d(TAG, "Preferred wearable \"" + preferredWearableName + "\" not recognized in our known devices list.");
//            return false;
//        }
//    }


    @Override
    public void onDestroy() {
        Log.d(TAG, "WearableAiAspService killing itself and all its children");

        EventBus.getDefault().unregister(this);

        //kill speech rec
        if (speechRecSwitchSystem != null){
            speechRecSwitchSystem.destroy();
        }

        //kill asg connection
        if (smartGlassesRepresentative != null) {
            smartGlassesRepresentative.destroy();
            smartGlassesRepresentative = null;
        }

        //kill data transmitters
        if (dataObservable != null) {
            dataObservable.onComplete();
        }

        //kill textToSpeech
        textToSpeechSystem.destroy();

        //kill aioConnect
        aioRetryHandler.removeCallbacks(aioRetryConnectionTask);

        //call parent destroy
        super.onDestroy();
        Log.d(TAG, "WearableAiAspService destroy complete");
    }

    public void sendTestCard(String title, String body, String img) {
        Log.d(TAG, "SENDING TEST CARD FROM WAIService");
        EventBus.getDefault().post(new ReferenceCardSimpleViewRequestEvent(title, body));
    }

    public SmartGlassesConnectionState getSmartGlassesConnectState() {
        if (smartGlassesRepresentative != null) {
            return smartGlassesRepresentative.getConnectionState();
        } else {
            return SmartGlassesConnectionState.DISCONNECTED;
        }
    }

    public SmartGlassesDevice getConnectedSmartGlasses() {
        if (smartGlassesRepresentative == null) return null;
        if(smartGlassesRepresentative.getConnectionState() != SmartGlassesConnectionState.CONNECTED) return null;
        return smartGlassesRepresentative.smartGlassesDevice;
    }

    public SmartGlassesOperatingSystem getConnectedDeviceModelOs(){
        if (smartGlassesRepresentative == null) return null;
        if(smartGlassesRepresentative.getConnectionState() != SmartGlassesConnectionState.CONNECTED) return null;
        return smartGlassesRepresentative.smartGlassesDevice.glassesOs;
    }

    public void sendUiUpdate() {
        //connectionState = 2 means connected
        Intent intent = new Intent();
        intent.setAction(MessageTypes.GLASSES_STATUS_UPDATE);
        // Set the optional additional information in extra field.
        SmartGlassesConnectionState connectionState;
        if (smartGlassesRepresentative != null) {
            connectionState = smartGlassesRepresentative.getConnectionState();
            intent.putExtra(MessageTypes.CONNECTION_GLASSES_GLASSES_OBJECT, smartGlassesRepresentative.smartGlassesDevice);

            // Update preferred wearable if connected
            if(connectionState == SmartGlassesConnectionState.CONNECTED){
                Log.d(TAG, "sendUiUpdate updates preferred wearable");
                savePreferredWearable(this, smartGlassesRepresentative.smartGlassesDevice.deviceModelName);
            }

            onGlassesConnectionStateChanged(smartGlassesRepresentative.smartGlassesDevice, connectionState);
        } else {
            connectionState = SmartGlassesConnectionState.DISCONNECTED;
        }
        intent.putExtra(MessageTypes.CONNECTION_GLASSES_STATUS_UPDATE, connectionState);
        sendBroadcast(intent);
    }

    /** Saves the chosen ASR framework in user shared preference. */
    public static void saveChosenAsrFramework(Context context, ASR_FRAMEWORKS asrFramework) {
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_ASR_KEY), asrFramework.name())
                .apply();
    }

    /** Gets the chosen ASR framework from shared preference. */
    public static ASR_FRAMEWORKS getChosenAsrFramework(Context context) {
        String asrString = PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_ASR_KEY), "");
        if (asrString.equals("")){
            saveChosenAsrFramework(context, ASR_FRAMEWORKS.AUGMENTOS_ASR_FRAMEWORK);
            asrString = ASR_FRAMEWORKS.AUGMENTOS_ASR_FRAMEWORK.name();
        }
        return ASR_FRAMEWORKS.valueOf(asrString);
    }

    public void changeChosenAsrFramework(ASR_FRAMEWORKS asrFramework){
        saveChosenAsrFramework(getApplicationContext(), asrFramework);
        if (speechRecSwitchSystem != null) {
            speechRecSwitchSystem.startAsrFramework(asrFramework);
        }
    }

    /** Gets the API key from shared preference. */
    public static String getApiKey(Context context) {
        return PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_KEY), "");
    }

    /** Saves the API Key in user shared preference. */
    public static void saveApiKey(Context context, String key) {
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_KEY), key)
                .apply();
    }

    /** Gets the preferred wearable from shared preference. */
    public static boolean getForceCoreOnboardMic(Context context) {
//        Log.d(TAG, "GETTING PREFERRED WEARABLE");
        return PreferenceManager.getDefaultSharedPreferences(context).getBoolean(context.getResources().getString(R.string.FORCE_CORE_ONBOARD_MIC), false);
    }

    /** Saves the preferred wearable in user shared preference. */
    public static void saveForceCoreOnboardMic(Context context, boolean toForce) {
//        Log.d(TAG, "SAVING PREFERRED WEARABLE");
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putBoolean(context.getResources().getString(R.string.FORCE_CORE_ONBOARD_MIC), toForce)
                .apply();
    }

    /** Gets the preferred wearable from shared preference. */
    public static String getPreferredWearable(Context context) {
//        Log.d(TAG, "GETTING PREFERRED WEARABLE");
        return PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.PREFERRED_WEARABLE), "");
    }

    /** Saves the preferred wearable in user shared preference. */
    public static void savePreferredWearable(Context context, String wearableName) {
//        Log.d(TAG, "SAVING PREFERRED WEARABLE");
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.PREFERRED_WEARABLE), wearableName)
                .apply();
    }

    public static void saveChosenTranscribeLanguage(Context context, String transcribeLanguageString) {
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_TRANSCRIBE_LANGUAGE), transcribeLanguageString)
                .apply();
    }

    public static String getChosenTranscribeLanguage(Context context) {
        String transcribeLanguageString = PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_TRANSCRIBE_LANGUAGE), "");
        if (transcribeLanguageString.equals("")){
            saveChosenTranscribeLanguage(context, "English");
            transcribeLanguageString = "English";
//            saveChosenTranscribeLanguage(context, "Chinese");
//            transcribeLanguageString = "Chinese";
        }
        return transcribeLanguageString;
    }

    public static void saveChosenTargetLanguage(Context context, String targetLanguageString) {
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_TARGET_LANGUAGE), targetLanguageString)
                .apply();
    }

    public static String getChosenTargetLanguage(Context context) {
        String targetLanguageString = PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_TARGET_LANGUAGE), "");
        if (targetLanguageString.equals("")){
            saveChosenTargetLanguage(context, "English");
            targetLanguageString = "English";
        }
        return targetLanguageString;
    }

    public static void saveChosenSourceLanguage(Context context, String sourceLanguageString) {
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_SOURCE_LANGUAGE), sourceLanguageString)
                .apply();
    }

    public static String getChosenSourceLanguage(Context context) {
        String sourceLanguageString = PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_SOURCE_LANGUAGE), "");
        if (sourceLanguageString.equals("")){
            saveChosenSourceLanguage(context, "English");
            sourceLanguageString = "English";
        }
        return sourceLanguageString;
    }

    public static void saveSelectedLiveCaptionsTranslationChecked(Context context, int liveCaptionsTranslationSelected) {
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putInt(context.getResources().getString(R.string.SHARED_PREF_LIVE_CAPTIONS_TRANSLATION), liveCaptionsTranslationSelected)
                .apply();
    }

    public static int getSelectedLiveCaptionsTranslation(Context context) {
        return PreferenceManager.getDefaultSharedPreferences(context).getInt(context.getResources().getString(R.string.SHARED_PREF_LIVE_CAPTIONS_TRANSLATION), 0);
    }

    //switches the currently running transcribe language without changing the default/saved language
    public void switchRunningTranscribeLanguage(String language){
        if (speechRecSwitchSystem.currentLanguage.equals(language)){
            return;
        }

        //kill previous speech rec
        speechRecSwitchSystem.destroy();
        speechRecSwitchSystem = null;

        //start speech rec after small delay
        Handler speechRecHandler = new Handler();
        Context context = this;
        speechRecHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                speechRecSwitchSystem = new SpeechRecSwitchSystem(context);
                ASR_FRAMEWORKS asrFramework = getChosenAsrFramework(context);
                speechRecSwitchSystem.startAsrFramework(asrFramework);
                if (translationLanguage != null) {
                    startTranslationStream(translationLanguage);
                }
            }
        }, 250);
    }

    //switches the currently running transcribe language without changing the default/saved language
    public void startTranslationStream(String toTranslateLanguage){
//        String language;
//
//        if (speechRecSwitchSystem == null) {
////            language = getChosenTranscribeLanguage(this.getApplicationContext());
//            language = "English";
//        } else {
//            language = speechRecSwitchSystem.currentLanguage;
//            speechRecSwitchSystem.destroy();
//        }
//
//        Log.d(TAG, "TRANSLATION STREAM STARTED" + language);
        String language = speechRecSwitchSystem.currentLanguage;
        translationLanguage = toTranslateLanguage;

        //kill previous speech rec
        speechRecSwitchSystem.destroy();
        speechRecSwitchSystem = null;

        //start speech rec after small delay
        Handler speechRecHandler = new Handler();
        Context context = this;
        speechRecHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                speechRecSwitchSystem = new SpeechRecSwitchSystem(context);
                ASR_FRAMEWORKS asrFramework = getChosenAsrFramework(context);
                speechRecSwitchSystem.startAsrFramework(ASR_FRAMEWORKS.AUGMENTOS_ASR_FRAMEWORK);
            }
        }, 2000);
        Log.d(TAG, "SSTOPPING TRANSCRIBE LANGUAGE IN n seconds");
    }

    //service stuff
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
        public SmartGlassesAndroidService getService() {
            // Return this instance of LocalService so clients can call public methods
            return SmartGlassesAndroidService.this;
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
        if (intent != null) {
            String action = intent.getAction();
            Bundle extras = intent.getExtras();

            switch (action) {
                case ACTION_START_FOREGROUND_SERVICE:
                    // start the service in the foreground
                    Log.d("TEST", "starting foreground");
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

    public static SmartGlassesDevice getSmartGlassesDeviceFromModelName(String modelName) {
        ArrayList<SmartGlassesDevice> allDevices = new ArrayList<>(
                Arrays.asList(
                        new VuzixUltralite(),
                        new MentraMach1(),
                        new EvenRealitiesG1(),
                        new VuzixShield(),
                        new InmoAirOne(),
                        new TCLRayNeoXTwo(),
                        new AudioWearable()
                )
        );

        SmartGlassesDevice matchingDevice = null;
        for (SmartGlassesDevice device : allDevices) {
            if (device.deviceModelName.equals(modelName)) {
                return device;
            }
        }

        return null;
    }

    // Setup for aioConnectSmartGlasses
    ArrayList<SmartGlassesDevice> smartGlassesDevices = new ArrayList<>();
    Handler aioRetryHandler = new Handler();
    Handler connectedCheckerHandler = new Handler(); // Handler for the connected checker
    Runnable aioRetryConnectionTask = new Runnable() {
        @Override
        public void run() {
            if (smartGlassesRepresentative == null || smartGlassesRepresentative.getConnectionState() != SmartGlassesConnectionState.CONNECTED) { // If still disconnected
                if(!smartGlassesDevices.isEmpty()){
                    Toast.makeText(getApplicationContext(), "Searching for glasses...", Toast.LENGTH_LONG).show();
                    // EventBus.getDefault().post(new PostGenericGlobalMessageEvent("Searching for glasses..."));
                    Log.d(TAG, "TRYING TO CONNECT TO: " + smartGlassesDevices.get(0).deviceModelName);

                    if (smartGlassesRepresentative != null) {
                        smartGlassesRepresentative.destroy();
                        smartGlassesRepresentative = null;
                    }

                    connectToSmartGlasses(smartGlassesDevices.get(0));
                    smartGlassesDevices.add(smartGlassesDevices.remove(0));
                    aioRetryHandler.postDelayed(this, 25000); // Schedule another retry if needed
                }
                else
                {
                    aioRetryHandler.removeCallbacks(this);
                    Toast.makeText(getApplicationContext(), "No glasses found", Toast.LENGTH_LONG).show();
                    // EventBus.getDefault().post(new PostGenericGlobalMessageEvent("No glasses found"));
                }
            }
            else {
                Toast.makeText(getApplicationContext(), "Connected to " + smartGlassesRepresentative.smartGlassesDevice.deviceModelName, Toast.LENGTH_LONG).show();
                // EventBus.getDefault().post(new PostGenericGlobalMessageEvent("Connected to " + smartGlassesRepresentative.smartGlassesDevice.deviceModelName));
            }
        }
    };

    // Connected checker
    Runnable connectedCheckerTask = new Runnable() {
        @Override
        public void run() {
            if (smartGlassesRepresentative != null && smartGlassesRepresentative.getConnectionState() == SmartGlassesConnectionState.CONNECTED) { // Check if connected
                Toast.makeText(getApplicationContext(), "Connected to " + smartGlassesRepresentative.smartGlassesDevice.deviceModelName, Toast.LENGTH_LONG).show();
                Log.d(TAG, "Connected to: " + smartGlassesRepresentative.smartGlassesDevice.deviceModelName);
//                sendReferenceCard("Connected", "Connected to AugmentOS");

                // Stop all retries and connected checker
                aioRetryHandler.removeCallbacks(aioRetryConnectionTask);
                connectedCheckerHandler.removeCallbacks(this);
            } else {
                // Schedule the next check
                connectedCheckerHandler.postDelayed(this, 1500);
            }
        }
    };

    public void updateGlassesBrightness(int brightness) {
        if (smartGlassesRepresentative != null) {
            smartGlassesRepresentative.updateGlassesBrightness(brightness);
        }
    }

    public void showNoGoogleAsrDialog(){
        new android.app.AlertDialog.Builder(getApplicationContext()).setIcon(android.R.drawable.ic_dialog_alert)
                .setTitle("No Google API Key Provided")
                .setMessage("You have Google ASR enabled without an API key. Please turn off Google ASR or enter a valid API key.")
                .setPositiveButton("Ok", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                    }
                }).show();
    }

    //show a reference card on the smart glasses with title and body text
    public static void sendReferenceCard(String title, String body) {
        EventBus.getDefault().post(new ReferenceCardSimpleViewRequestEvent(title, body));
    }

    //show a text wall card on the smart glasses
    public static void sendTextWall(String text) {
        EventBus.getDefault().post(new TextWallViewRequestEvent(text));
    }

    //show a double text wall card on the smart glasses
    public static void sendDoubleTextWall(String textTop, String textBottom) {
        EventBus.getDefault().post(new DoubleTextWallViewRequestEvent(textTop, textBottom));
    }

    //show a reference card on the smart glasses with title and body text
    public static void sendRowsCard(String[] rowStrings) {
        EventBus.getDefault().post(new RowsCardViewRequestEvent(rowStrings));
    }

    //show a bullet point list card on the smart glasses with title and bullet points
    public void sendBulletPointList(String title, String [] bullets) {
        EventBus.getDefault().post(new BulletPointListViewRequestEvent(title, bullets));
    }

    //show a list of up to 4 rows of text. Only put a few characters per line!
    public void sendBulletPointList(String[] rowStrings) {
        EventBus.getDefault().post(new RowsCardViewRequestEvent(rowStrings));
    }

    public void sendReferenceCard(String title, String body, String imgUrl) {
        EventBus.getDefault().post(new ReferenceCardImageViewRequestEvent(title, body, imgUrl));
    }

    public void sendBitmap(Bitmap bitmap) {
        EventBus.getDefault().post(new SendBitmapViewRequestEvent(bitmap));
    }

    public void startScrollingText(String title){
        EventBus.getDefault().post(new ScrollingTextViewStartRequestEvent(title));
    }

    public void pushScrollingText(String text){
        EventBus.getDefault().post(new FinalScrollingTextRequestEvent(text));
    }

    public void stopScrollingText(){
        EventBus.getDefault().post(new ScrollingTextViewStopRequestEvent());
    }

    public void sendTextLine(String text) {
        EventBus.getDefault().post(new TextLineViewRequestEvent(text));
    }

    public void sendTextToSpeech(String text, String languageString) {
        EventBus.getDefault().post(new TextToSpeechEvent(text, languageString));
    }

    public void sendCenteredText(String text){
        EventBus.getDefault().post(new CenteredTextViewRequestEvent(text));
    }

    public void sendCustomContent(String json){
        EventBus.getDefault().post(new CenteredTextViewRequestEvent(json));
    }

    public void sendHomeScreen(){
        EventBus.getDefault().post(new HomeScreenEvent());
    }

    public void setFontSize(SmartGlassesFontSize fontSize) { EventBus.getDefault().post(new SetFontSizeEvent(fontSize)); }


    @Subscribe
    public void handleNewAsrLanguagesEvent(NewAsrLanguagesEvent event) {
        Log.d(TAG, "NewAsrLanguages: " + event.languages.toString());
        speechRecSwitchSystem.updateConfig(event.languages);
    }
}