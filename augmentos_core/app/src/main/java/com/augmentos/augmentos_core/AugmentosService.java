package com.augmentos.augmentos_core;

import static com.augmentos.augmentos_core.smarterglassesmanager.smartglassescommunicators.EvenRealitiesG1SGC.deleteEvenSharedPreferences;
import static com.augmentos.augmentos_core.smarterglassesmanager.smartglassescommunicators.EvenRealitiesG1SGC.savePreferredG1DeviceId;
import static com.augmentos.augmentos_core.smarterglassesmanager.smartglassesconnection.SmartGlassesAndroidService.getSmartGlassesDeviceFromModelName;
import static com.augmentos.augmentos_core.smarterglassesmanager.smartglassesconnection.SmartGlassesAndroidService.savePreferredWearable;
import static com.augmentos.augmentoslib.AugmentOSGlobalConstants.AugmentOSManagerPackageName;
import static com.augmentos.augmentos_core.BatteryOptimizationHelper.handleBatteryOptimization;
import static com.augmentos.augmentos_core.BatteryOptimizationHelper.isSystemApp;
import static com.augmentos.augmentos_core.Constants.BUTTON_EVENT_ENDPOINT;
import static com.augmentos.augmentos_core.Constants.DIARIZE_QUERY_ENDPOINT;
import static com.augmentos.augmentos_core.Constants.REQUEST_APP_BY_PACKAGE_NAME_DOWNLOAD_LINK_ENDPOINT;
import static com.augmentos.augmentos_core.Constants.UI_POLL_ENDPOINT;
import static com.augmentos.augmentos_core.Constants.GEOLOCATION_STREAM_ENDPOINT;
import static com.augmentos.augmentos_core.Constants.GET_USER_SETTINGS_ENDPOINT;
import static com.augmentos.augmentos_core.Constants.explicitAgentQueriesKey;
import static com.augmentos.augmentos_core.Constants.explicitAgentResultsKey;
import static com.augmentos.augmentos_core.Constants.glassesCardTitle;
import static com.augmentos.augmentos_core.Constants.notificationFilterKey;
import static com.augmentos.augmentos_core.Constants.newsSummaryKey;
import static com.augmentos.augmentos_core.Constants.displayRequestsKey;
import static com.augmentos.augmentos_core.Constants.wakeWordTimeKey;
import static com.augmentos.augmentos_core.Constants.augmentOsMainServiceNotificationId;
import static com.augmentos.augmentos_core.statushelpers.JsonHelper.convertJsonToMap;


import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.SharedPreferences;
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

import java.io.IOException;
import java.io.InputStream;

import androidx.core.app.NotificationCompat;
import androidx.preference.PreferenceManager;

import com.augmentos.augmentos_core.augmentos_backend.AuthHandler;
import com.augmentos.augmentos_core.augmentos_backend.HTTPServerComms;
import com.augmentos.augmentos_core.augmentos_backend.ServerComms;
import com.augmentos.augmentos_core.augmentos_backend.ThirdPartyCloudApp;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.BatteryLevelEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.BrightnessLevelEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.DisplayGlassesDashboardEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.GlassesBluetoothSearchDiscoverEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.GlassesBluetoothSearchStopEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.GlassesHeadDownEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.GlassesHeadUpEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.NewAsrLanguagesEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.SetSensingEnabledEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.smartglassesconnection.SmartGlassesAndroidService;
import com.augmentos.augmentos_core.smarterglassesmanager.speechrecognition.AsrStreamKey;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.GlassesDisplayPowerEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.SmartGlassesConnectionStateChangedEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.speechrecognition.SpeechRecSwitchSystem;
import com.augmentos.augmentos_core.smarterglassesmanager.supportedglasses.SmartGlassesDevice;
import com.augmentos.augmentos_core.smarterglassesmanager.utils.SmartGlassesConnectionState;
import com.posthog.java.PostHog;
import com.augmentos.augmentoslib.PhoneNotification;
import com.augmentos.augmentoslib.ThirdPartyApp;
import com.augmentos.augmentoslib.ThirdPartyAppType;
import com.augmentos.augmentoslib.events.NotificationEvent;
import com.augmentos.augmentos_core.comms.AugmentOsActionsCallback;
import com.augmentos.augmentos_core.comms.AugmentosBlePeripheral;
import com.augmentos.augmentos_core.events.AugmentosSmartGlassesDisconnectedEvent;
import com.augmentos.augmentos_core.events.GoogleAuthFailedEvent;
import com.augmentos.augmentos_core.augmentos_backend.OldBackendServerComms;
import com.augmentos.augmentos_core.augmentos_backend.VolleyJsonCallback;
import com.augmentos.augmentos_core.events.NewScreenImageEvent;
import com.augmentos.augmentos_core.events.NewScreenTextEvent;
import com.augmentos.augmentos_core.events.ThirdPartyAppErrorEvent;
import com.augmentos.augmentos_core.events.TriggerSendStatusToAugmentOsManagerEvent;
import com.augmentos.augmentos_core.statushelpers.BatteryStatusHelper;
import com.augmentos.augmentos_core.statushelpers.DeviceInfo;
import com.augmentos.augmentos_core.statushelpers.GsmStatusHelper;
import com.augmentos.augmentos_core.statushelpers.WifiStatusHelper;
import com.augmentos.augmentos_core.tpa.TPASystem;
import com.augmentos.augmentos_core.ui.AugmentosCoreUi;
import com.augmentos.augmentoslib.events.KillTpaEvent;
import com.augmentos.augmentoslib.events.TranslateOutputEvent;
import com.augmentos.augmentoslib.events.StartAsrStreamRequestEvent;
import com.augmentos.augmentoslib.events.StopAsrStreamRequestEvent;


import com.augmentos.augmentoslib.events.DiarizationOutputEvent;
import com.augmentos.augmentoslib.events.GlassesTapOutputEvent;
import com.augmentos.augmentoslib.events.SmartRingButtonOutputEvent;
import com.augmentos.augmentoslib.events.SpeechRecOutputEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Collections;
import java.util.List;
import java.util.Scanner;
import java.util.Set;
//SpeechRecIntermediateOutputEvent
import com.augmentos.augmentos_core.smarterglassesmanager.utils.EnvHelper;
import com.augmentos.augmentoslib.enums.AsrStreamType;

import android.app.DownloadManager;
import android.net.Uri;
import android.os.Environment;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;


public class AugmentosService extends Service implements AugmentOsActionsCallback {
    public static final String TAG = "AugmentOS_AugmentOSService";

    private final IBinder binder = new LocalBinder();

    private static final String POSTHOG_API_KEY = "phc_J7nhqRlkNVoUjKxQZnpYtqRoyEeLl3gFCwYsajxFvpc";
    private static final String POSTHOG_HOST = "https://us.i.posthog.com";
//    private FirebaseAuth firebaseAuth;
//    private FirebaseAuth.AuthStateListener authStateListener;
//    private FirebaseAuth.IdTokenListener idTokenListener;

    private final String notificationAppName = "AugmentOS Core";
    private final String notificationDescription = "Running in foreground";
    private final String myChannelId = "augmentos_core";
    public static final String ACTION_START_CORE = "ACTION_START_CORE";
    public static final String ACTION_STOP_CORE = "ACTION_STOP_CORE";

    public static final String ACTION_START_FOREGROUND_SERVICE = "MY_ACTION_START_FOREGROUND_SERVICE";
    public static final String ACTION_STOP_FOREGROUND_SERVICE = "MY_ACTION_STOP_FOREGROUND_SERVICE";

    private BatteryStatusHelper batteryStatusHelper;
    private WifiStatusHelper wifiStatusHelper;
    private GsmStatusHelper gsmStatusHelper;

    //AugmentOS stuff
    String authToken = "";
    private OldBackendServerComms oldBackendServerComms;
    private AuthHandler authHandler;
    ArrayList<String> responsesBuffer;
    ArrayList<String> transcriptsBuffer;
    ArrayList<String> responsesToShare;
    private final Handler csePollLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable cseRunnableCode;
    private final Handler displayPollLoopHandler = new Handler(Looper.getMainLooper());
    private final Handler locationSendingLoopHandler = new Handler(Looper.getMainLooper());
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private final Handler screenCaptureHandler = new Handler();
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

    private final long locationSendTime = 1000 * 10; // define in milliseconds

    long previousWakeWordTime = -1; // Initialize this at -1
    private long currTime = 0;
    private long lastPressed = 0;
    private final long lastTapped = 0;

    // Double clicking constants
    private final long doublePressTimeConst = 420;
    private final long doubleTapTimeConst = 600;

    public TPASystem tpaSystem;

    public static PostHog postHog;

    private String userId;
    public SmartGlassesConnectionState previousSmartGlassesConnectionState = SmartGlassesConnectionState.DISCONNECTED;


    private AugmentosBlePeripheral blePeripheral;

    public AugmentosSmartGlassesService smartGlassesService;
    private boolean isSmartGlassesServiceBound = false;
    private final List<Runnable> serviceReadyListeners = new ArrayList<>();
    private NotificationSystem notificationSystem;
    private CalendarSystem calendarSystem;

    private Integer batteryLevel;
    private Integer brightnessLevel;

    private final boolean showingDashboardNow = false;
    private boolean contextualDashboardEnabled;
    private final Map<AsrStreamKey, Set<String>> activeStreams = new HashMap<>();
    private ServerComms serverComms;
    private HTTPServerComms httpServerComms;

    public AugmentosService() {
    }

    private final ServiceConnection connection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            AugmentosSmartGlassesService.LocalBinder binder = (AugmentosSmartGlassesService.LocalBinder) service;
            smartGlassesService = (AugmentosSmartGlassesService) binder.getService();
            isSmartGlassesServiceBound = true;
            tpaSystem.setSmartGlassesService(smartGlassesService);
            for (Runnable action : serviceReadyListeners) {
                action.run();
            }
            serviceReadyListeners.clear();
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            Log.d(TAG,"SMART GLASSES SERVICE DISCONNECTED!!!!");
            isSmartGlassesServiceBound = false;
            smartGlassesService = null;
            tpaSystem.setSmartGlassesService(smartGlassesService);

            // TODO: For now, stop all apps on disconnection
            // TODO: Future: Make this nicer
            tpaSystem.stopAllThirdPartyApps();
            sendStatusToAugmentOsManager();
        }
    };

    @Subscribe
    public synchronized void onSubscribeStartAsrStreamRequestEvent(StartAsrStreamRequestEvent event) {
        AsrStreamKey key;
        String transcribeLanguage = event.transcribeLanguage;
        if (event.asrStreamType == AsrStreamType.TRANSLATION) {
            String translateLanguage = event.translateLanguage;
            key = new AsrStreamKey(transcribeLanguage, translateLanguage);
        } else {
            key = new AsrStreamKey(transcribeLanguage);
        }
        addAsrStream(event.packageName, key);
    }

    @Subscribe
    public synchronized void onSubscribeStopAsrStreamRequestEvent(StopAsrStreamRequestEvent event) {
        AsrStreamKey key;
        String transcribeLanguage = event.transcribeLanguage;
        if (event.asrStreamType == AsrStreamType.TRANSLATION) {
            String translateLanguage = event.translateLanguage;
            key = new AsrStreamKey(transcribeLanguage, translateLanguage);
        } else {
            key = new AsrStreamKey(transcribeLanguage);
        }
        removeAsrStream(event.packageName, key);
    }

    private void addAsrStream(String packageName, AsrStreamKey key) {
        Set<String> subscribers = activeStreams.get(key);
        if (subscribers == null) {
            subscribers = new HashSet<>();
            activeStreams.put(key, subscribers);

            // Start the underlying ASR engine
            updateAsrLanguages();
        }

        subscribers.add(packageName);
        Log.d(TAG, "addAsrStream: " + packageName + " subscribed to " + key);
    }

    private void updateAsrLanguages() {
        //send the minimal list of languages to the speech rec framework
        EventBus.getDefault().post(new NewAsrLanguagesEvent(getActiveFilteredStreamKeys()));
    }

    private void removeAsrStream(String packageName, AsrStreamKey key) {
        Set<String> subscribers = activeStreams.get(key);
        if (subscribers == null) {
            Log.d(TAG, "removeAsrStream: Key " + key + " not active. Nothing to stop.");
            return;
        }

        subscribers.remove(packageName);
        Log.d(TAG, "removeAsrStream: " + packageName + " unsubscribed from " + key);

        if (subscribers.isEmpty()) {
            // Stop the underlying ASR
            updateAsrLanguages();

            activeStreams.remove(key);
        }
    }

    public synchronized List<AsrStreamKey> getActiveFilteredStreamKeys() {
        // 1) Find all languages that have at least one TRANSLATION active
        Set<String> translationLanguages = new HashSet<>();
        for (AsrStreamKey key : activeStreams.keySet()) {
            if (key.streamType == AsrStreamType.TRANSLATION) {
                translationLanguages.add(key.transcribeLanguage);
            }
        }

        // 2) Build the filtered list
        List<AsrStreamKey> filteredList = new ArrayList<>();
        for (AsrStreamKey key : activeStreams.keySet()) {
            if (key.streamType == AsrStreamType.TRANSLATION) {
                filteredList.add(key);
            } else if (key.streamType == AsrStreamType.TRANSCRIPTION) {
                if (!translationLanguages.contains(key.transcribeLanguage)) {
                    filteredList.add(key);
                }
            }
        }
        return filteredList;
    }

    @Subscribe
    public void onKillTpaEvent(KillTpaEvent event) {
        String tpaPackageName = event.tpa.packageName;
        Log.d(TAG, "TPA KILLING SELF: " + tpaPackageName);
        unsubscribeTpaFromAllStreams(tpaPackageName);
    }

    private void unsubscribeTpaFromAllStreams(String packageName) {
        for (Map.Entry<AsrStreamKey, Set<String>> entry : activeStreams.entrySet()) {
            entry.getValue().remove(packageName);
        }

        List<AsrStreamKey> keysToRemove = new ArrayList<>();
        for (Map.Entry<AsrStreamKey, Set<String>> entry : activeStreams.entrySet()) {
            AsrStreamKey key = entry.getKey();
            Set<String> subscribers = entry.getValue();

            if (subscribers.isEmpty()) {
                if (key.streamType == AsrStreamType.TRANSCRIPTION
                        && "en-US".equals(key.transcribeLanguage)) {
                    subscribers.add("AugmentOS_INTERNAL");
                } else {
                    keysToRemove.add(key);
                }
            }
        }

        for (AsrStreamKey removableKey : keysToRemove) {
            activeStreams.remove(removableKey);
        }
        updateAsrLanguages();
    }

    @Subscribe
    public void onAugmentosSmartGlassesDisconnectedEvent(AugmentosSmartGlassesDisconnectedEvent event){
        // TODO: For now, stop all apps on disconnection
        // TODO: Future: Make this nicer
        tpaSystem.stopAllThirdPartyApps();
        sendStatusToAugmentOsManager();
    }

    public void onTriggerSendStatusToAugmentOsManagerEvent(TriggerSendStatusToAugmentOsManagerEvent event) {
        sendStatusToAugmentOsManager();
    }

    @Subscribe
    public void onGlassesHeadUpEvent(GlassesHeadUpEvent event){
        serverComms.sendHeadPosition("up");
        EventBus.getDefault().post(new DisplayGlassesDashboardEvent());
    }

    @Subscribe
    public void onGlassesHeadDownEvent(GlassesHeadDownEvent event){
        serverComms.sendHeadPosition("down");
        if (smartGlassesService != null)
            smartGlassesService.windowManager.hideDashboard();
    }

    @Subscribe
    public void onGlassesTapSideEvent(GlassesTapOutputEvent event) {
        int numTaps = event.numTaps;
        boolean sideOfGlasses = event.sideOfGlasses;
        long time = event.timestamp;

        Log.d(TAG, "GLASSES TAPPED X TIMES: " + numTaps + " SIDEOFGLASSES: " + sideOfGlasses);
        if (smartGlassesService == null) return;
        if (numTaps == 2 || numTaps == 3) {
            if (smartGlassesService.windowManager.isDashboardShowing()) {
                smartGlassesService.windowManager.hideDashboard();
            } else {
                Log.d(TAG, "GOT A DOUBLE+ TAP");
                EventBus.getDefault().post(new DisplayGlassesDashboardEvent());
            }
        }
    }

    @Subscribe
    public void onThirdPartyAppErrorEvent(ThirdPartyAppErrorEvent event) {
        if (blePeripheral != null) {
            blePeripheral.sendNotifyManager(event.text, "error");
        }
        if (tpaSystem != null) {
            tpaSystem.stopThirdPartyAppByPackageName(event.packageName);
        }
        if (smartGlassesService != null) {
            smartGlassesService.windowManager.showAppLayer("system", () -> AugmentosSmartGlassesService.sendReferenceCard("App error", event.text), 10);
        }
        sendStatusToAugmentOsManager();
    }

    //TODO NO MORE PASTA
    public ArrayList<String> notificationList = new ArrayList<String>();
    public JSONArray latestNewsArray = new JSONArray();
    private int latestNewsIndex = 0;
    @Subscribe
    public void onDisplayGlassesDashboardEvent(DisplayGlassesDashboardEvent event) throws JSONException {
        if (!contextualDashboardEnabled) {
            return;
        }

        // Retrieve the next upcoming event
        CalendarItem calendarItem = calendarSystem.getNextUpcomingEvent();

        // Get current time in milliseconds
        long now = System.currentTimeMillis();
        long diffMillis = calendarItem.getDtStart() - now;
        String timeUntil;

        // Choose the appropriate unit to display the time difference
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyyMMdd", Locale.getDefault());
        String eventDate = simpleDateFormat.format(new Date(calendarItem.getDtStart()));
        String todayDate = simpleDateFormat.format(new Date(now));

        if (eventDate.equals(todayDate)) {
            // Event is today -> just show the time
            SimpleDateFormat timeFormat = new SimpleDateFormat("h:mma", Locale.getDefault());
            timeUntil = timeFormat.format(new Date(calendarItem.getDtStart()));
        } else if (eventDate.equals(simpleDateFormat.format(new Date(now + 24 * 60 * 60 * 1000)))) {
            // Event is tomorrow -> show 'tmr' and time
            SimpleDateFormat timeFormat = new SimpleDateFormat("h:mma", Locale.getDefault());
            timeUntil = "tmrw@" + timeFormat.format(new Date(calendarItem.getDtStart()));
        } else {
            // Event is after tomorrow -> do not show time
            timeUntil = "";
        }

        // Get current time and date strings
        SimpleDateFormat currentTimeFormat = new SimpleDateFormat("h:mm", Locale.getDefault());
        SimpleDateFormat currentDateFormat = new SimpleDateFormat("MMM dd", Locale.getDefault());
        String currentTime = currentTimeFormat.format(new Date());
        String currentDate = currentDateFormat.format(new Date());
        String calendarItemTitle = "";
        if (!timeUntil.isEmpty()) { // Only show the event tittle if the event is today or tomorrow
            calendarItemTitle = "| " + calendarItem.getTitle()
                    .replace("-", " ")
                    .replace("\n", " ")
                    .replaceAll("\\s+", " ")
                    .substring(0, Math.min(calendarItem.getTitle().length(), 12))
                    .trim();
            if (calendarItem.getTitle().length() > 12) {
                calendarItemTitle += "...";
            }
        }

        // Build the dashboard string with event information on the same line as time and date
        StringBuilder dashboard = new StringBuilder();
        dashboard.append(String.format(Locale.getDefault(),
                "%s, %s, %d%% %s %s\n",
                currentDate, currentTime, batteryLevel,
                calendarItemTitle, timeUntil));

        if (latestNewsIndex >= latestNewsArray.length()) {
            latestNewsIndex = 0;
        } else {
            latestNewsIndex ++;
        }

        String latestNews = latestNewsArray.getString(latestNewsIndex);

        if (latestNews != null && !latestNews.isEmpty()) {
            String newsToDisplay = latestNews.substring(0, Math.min(latestNews.length(), 30)).trim();
            if (latestNews.length() > 30) {
                newsToDisplay += "...";
            }
            dashboard.append(String.format("News: %s\n", newsToDisplay));
        }

        // Process notifications (as before)
        boolean recentNotificationFound = false;
        ArrayList<PhoneNotification> notifications = notificationSystem.getNotificationQueue();
        PhoneNotification mostRecentNotification = null;
        long mostRecentTime = 0;

        for (PhoneNotification notification : notifications) {
            long notificationTime = notification.getTimestamp();
            if ((notificationTime + 5000) > now) {
                if (mostRecentTime == 0 || notificationTime > mostRecentTime) {
                    mostRecentTime = notificationTime;
                    mostRecentNotification = notification;
                }
            }
        }

        if (mostRecentNotification != null) {
            dashboard.append(String.format("│ %s - %s\n",
                    mostRecentNotification.getTitle(),
                    mostRecentNotification.getText()));
            recentNotificationFound = true;
        }

        // If no recent notification was found, display from the notificationList
        if (!recentNotificationFound) {
            int notificationCount = Math.min(2, notificationList.size());
            for (int i = 0; i < notificationCount; i++) {
                dashboard.append(String.format("│ %s\n", notificationList.get(i)));
            }
        }

        // Send to text wall
        if (smartGlassesService != null) {
            smartGlassesService.windowManager.showDashboard(() ->
                    smartGlassesService.sendTextWall(dashboard.toString()), -1);
        }
        Log.d(TAG, "Dashboard displayed: " + dashboard);
    }

    @Subscribe
    public void onGlassBatteryLevelEvent(BatteryLevelEvent event) {
//        Log.d(TAG, "BATTERY received");
        batteryLevel = event.batteryLevel;
        serverComms.sendBatteryUpdate(event.batteryLevel, false, -1);
        sendStatusToAugmentOsManager();
    }

    @Subscribe
    public void onBrightnessLevelEvent(BrightnessLevelEvent event) {
//        Log.d(TAG, "BRIGHTNESS received");
        brightnessLevel = event.brightnessLevel;
        PreferenceManager.getDefaultSharedPreferences(this)
                .edit()
                .putString(this.getResources().getString(R.string.SHARED_PREF_BRIGHTNESS), String.valueOf(brightnessLevel))
                .apply();
        sendStatusToAugmentOsManager();
    }

    @Override
    public void onCreate() {
        super.onCreate();

//        createNotificationChannel(); // New method to ensure one-time channel creation
//        startForeground(augmentOsMainServiceNotificationId, updateNotification());
        EnvHelper.init(this);
        //setup event bus subscribers
        EventBus.getDefault().register(this);

        authHandler = new AuthHandler(this);

        userId = authHandler.getUniqueIdForAnalytics();

        postHog = new PostHog.Builder(POSTHOG_API_KEY).host(POSTHOG_HOST).build();

        Map<String, Object> props = new HashMap<>();
        props.put("timestamp", System.currentTimeMillis());
        props.put("device_info", DeviceInfo.getDeviceInfo());
        postHog.capture(authHandler.getUniqueIdForAnalytics(), "augmentos_service_started", props);

        //make responses holder
        responsesBuffer = new ArrayList<>();
        responsesToShare = new ArrayList<>();
        responsesBuffer.add("Welcome to AugmentOS.");

        //make responses holder
        transcriptsBuffer = new ArrayList<>();

        //setup backend comms
        oldBackendServerComms = OldBackendServerComms.getInstance(this);
        batteryStatusHelper = new BatteryStatusHelper(this);
        wifiStatusHelper = new WifiStatusHelper(this);
        gsmStatusHelper = new GsmStatusHelper(this);

        notificationSystem = new NotificationSystem(this, userId);
        calendarSystem = CalendarSystem.getInstance(this);

        contextualDashboardEnabled = getContextualDashboardEnabled();
        //startNotificationService();

        //what is the preferred wearable?
        String preferredWearable = AugmentosSmartGlassesService.getPreferredWearable(this);
// Init TPA broadcast receivers
        tpaSystem = new TPASystem(this, smartGlassesService);

        //setup english as an ASR language
        AsrStreamKey enKey = new AsrStreamKey("en-US");
        addAsrStream("AugmentOS_INTERNAL", enKey);

        // Initialize BLE Peripheral
        blePeripheral = new AugmentosBlePeripheral(this, this);
        if (!tpaSystem.isAppInstalled(AugmentOSManagerPackageName)) {
            // TODO: While we use simulated puck, disable the BLE Peripheral for testing
            // TODO: For now, just disable peripheral if manager is installed on same device
            // blePeripheral.start();
        }

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
        Log.d(TAG, "COMPLETE AUGMENTOS_CORE INITIALIZATION");
        setUpUiPolling();
        // setUpLocationSending();

        getCurrentMode(this);

        saveCurrentMode(this, getCurrentMode(this));

        saveCurrentMode(this, "");

        // Whitelist AugmentOS from battery optimization when system app
        // If not system app, bring up the settings menu
        if (isSystemApp(this)) {
            handleBatteryOptimization(this);
        }

        // TODO: Uncomment for auto-connect
        String preferredWearable = AugmentosSmartGlassesService.getPreferredWearable(this);
        if(!preferredWearable.isEmpty()) {
            SmartGlassesDevice preferredDevice = getSmartGlassesDeviceFromModelName(preferredWearable);
            if (preferredDevice != null) {
                executeOnceSmartGlassesServiceReady(this, () -> {
                    smartGlassesService.connectToSmartGlasses(preferredDevice);
                    sendStatusToAugmentOsManager();
                });
            } else {
                // We have some invalid device saved... delete from preferences
                savePreferredWearable(this, "");
            }
        }

        this.httpServerComms = new HTTPServerComms();


        this.serverComms = new ServerComms();
        serverComms.connectWebSocket("ws://localhost:7002/glasses-ws");

        httpServerComms.getApps(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e("HTTP", "GET /apps failed: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    Log.d("HTTP", "Response: ");
                }
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);

        if (intent == null || intent.getAction() == null) {
            Log.e(TAG, "Received null intent or null action");
            return Service.START_STICKY; // Or handle this scenario appropriately
        }

        String action = intent.getAction();
        Bundle extras = intent.getExtras();

        switch (action) {
            case ACTION_START_CORE:
            case ACTION_START_FOREGROUND_SERVICE:
                // start the service in the foreground
                Log.d("TEST", "starting foreground");
                createNotificationChannel(); // New method to ensure one-time channel creation
                startForeground(augmentOsMainServiceNotificationId, updateNotification());

                // Send out the status once AugmentOS_Core is ready :)
                // tpaSystem.stopThirdPartyAppByPackageName(AugmentOSManagerPackageName);
                tpaSystem.startThirdPartyAppByPackageName(AugmentOSManagerPackageName);

                if (!NewPermissionUtils.areAllPermissionsGranted(this)) {
                    blePeripheral.sendPermissionsErrorToManager();
                }

                break;
            case ACTION_STOP_CORE:
            case ACTION_STOP_FOREGROUND_SERVICE:
                stopForeground(true);
                stopSelf();
                break;
            default:
                Log.d(TAG, "Unknown action received in onStartCommand");
                Log.d(TAG, action);
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
        if (smartGlassesService != null) {
            unbindService(connection);  // Unbind from the service
            isSmartGlassesServiceBound = false;
            smartGlassesService = null;
            tpaSystem.setSmartGlassesService(smartGlassesService);
        }
        Intent intent = new Intent(this, AugmentosSmartGlassesService.class);
        stopService(intent);  // Stop the service
    }

    @Subscribe
    public void onGlassesDisplayPowerEvent(GlassesDisplayPowerEvent event) {
        if (smartGlassesService == null) return;
        if (event.turnedOn) {
            smartGlassesService.windowManager.showAppLayer("system", () -> smartGlassesService.sendReferenceCard("AugmentOS Connected", "Screen back on"), 4);
        }
    }

    @Subscribe
    public void onSmartGlassesConnnectionEvent(SmartGlassesConnectionStateChangedEvent event) {
        if (event.connectionState == previousSmartGlassesConnectionState) return;

        sendStatusToAugmentOsManager();
        if (event.connectionState == SmartGlassesConnectionState.CONNECTED) {
            Log.d(TAG, "Got event for onGlassesConnected.. CONNECTED ..");

            Log.d(TAG, "****************** SENDING REFERENCE CARD: CONNECTED TO AUGMENT OS");
            if (smartGlassesService != null)
                smartGlassesService.windowManager.showAppLayer("system", () -> smartGlassesService.sendReferenceCard("", "/// AugmentOS Connected \\\\\\"), 6);

            //start transcribing
            updateAsrLanguages();

            Map<String, Object> props = new HashMap<>();
            props.put("glasses_model_name", event.device.deviceModelName);
            props.put("timestamp", System.currentTimeMillis());
            postHog.capture(authHandler.getUniqueIdForAnalytics(), "glasses_connected", props);
        }
    }

    public void getSettings(){
        try{
            Log.d(TAG, "Runnign get settings");
            Context mContext = this.getApplicationContext();
            JSONObject getSettingsObj = new JSONObject();
            getSettingsObj.put("userId", userId);
            oldBackendServerComms.restRequest(GET_USER_SETTINGS_ENDPOINT, getSettingsObj, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        Log.d(TAG, "GOT GET Settings update result: " + result.toString());
                        JSONObject settings = result.getJSONObject("settings");
                        Boolean useDynamicTranscribeLanguage = settings.getBoolean("use_dynamic_transcribe_language");
                        String dynamicTranscribeLanguage = settings.getString("dynamic_transcribe_language");
                        Log.d(TAG, "Should use dynamic? " + useDynamicTranscribeLanguage);
//                        if (useDynamicTranscribeLanguage){
//                            Log.d(TAG, "Switching running transcribe language to: " + dynamicTranscribeLanguage);
//                            if (smartGlassesService != null)
//                                smartGlassesService.switchRunningTranscribeLanguage(dynamicTranscribeLanguage);
//                        } else {
//                            if (smartGlassesService != null)
//                                smartGlassesService.switchRunningTranscribeLanguage(smartGlassesService.getChosenTranscribeLanguage(mContext));
//                        }
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
                if (smartGlassesService != null) {
                    requestUiPoll();
                }
                long currentTime = System.currentTimeMillis();
                long interval = (currentTime - lastDataSentTime < DATA_SENT_THRESHOLD) ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_INACTIVE;
                csePollLoopHandler.postDelayed(this, interval);
            }
        };
        csePollLoopHandler.post(uiPollRunnableCode);
    }

    public void setUpLocationSending() {
        locationSystem = new LocationSystem(getApplicationContext());

        locationSendingLoopHandler.removeCallbacksAndMessages(this);

        locationSendingRunnableCode = new Runnable() {
            @Override
            public void run() {
                if (smartGlassesService != null)
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

        if (blePeripheral != null) {
            blePeripheral.destroy();
        }

        if (smartGlassesService != null) {
            unbindService(connection);
            isSmartGlassesServiceBound = false;
            smartGlassesService = null;
            tpaSystem.setSmartGlassesService(smartGlassesService);
        }

        if(tpaSystem != null) {
            tpaSystem.destroy();
        }

        postHog.shutdown();
        serverComms.disconnectWebSocket();
        super.onDestroy();
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

    @Subscribe
    public void onDiarizeData(DiarizationOutputEvent event) {
        Log.d(TAG, "SENDING DIARIZATION STUFF");
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("transcript_meta_data", event.diarizationData);
            jsonQuery.put("timestamp", System.currentTimeMillis() / 1000);
            jsonQuery.put("userId", userId);
            oldBackendServerComms.restRequest(DIARIZE_QUERY_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
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
        String languageCode = event.languageCode;
        boolean isFinal = event.isFinal;

        AsrStreamKey streamKey = new AsrStreamKey(languageCode);

        if (activeStreams.containsKey(streamKey)) {
            Set<String> activeStreamElements = activeStreams.get(streamKey);

            if (activeStreamElements != null) {
                for (String packageName : activeStreamElements) {
                    if (Objects.equals(packageName, "AugmentOS_INTERNAL")) {
                        continue;
                    }
                    Log.d(TAG, "Active stream element processed: " + packageName);
                    tpaSystem.sendTranscriptEventToTpa(event, packageName);
                }
            } else {
                Log.w(TAG, "Active stream elements are null, nothing to process.");
            }
        }

        if (isFinal) {
            transcriptsBuffer.add(text);
        }
    }

    @Subscribe
    public void onTranslate(TranslateOutputEvent event){
        String fromLanguageCode = event.fromLanguageCode;
        String toLanguageCode = event.toLanguageCode;
        AsrStreamKey streamKey = new AsrStreamKey(fromLanguageCode, toLanguageCode);

        if (activeStreams.containsKey(streamKey)) {
            Set<String> activeStreamElements = activeStreams.get(streamKey);

            if (activeStreamElements != null) {
                for (String packageName : activeStreamElements) {
                    if (Objects.equals(packageName, "AugmentOS_INTERNAL")) {
                        continue;
                    }
                    Log.d(TAG, "Active stream element processed: " + packageName);
                    tpaSystem.sendTranslateEventToTpa(event, packageName);
                }
            } else {
                Log.w(TAG, "Active stream elements are null, nothing to process.");
            }
        }
    }

    public void requestUiPoll(){
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("deviceId", deviceId);
            jsonQuery.put("userId", userId);
            Log.d(TAG, userId);
            oldBackendServerComms.restRequest(UI_POLL_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result) throws JSONException {
                    parseAugmentosResults(result);
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

    private void parseAugmentosResults(JSONObject jsonResponse) throws JSONException {
        JSONArray notificationArray = jsonResponse.getJSONArray(notificationFilterKey);
        JSONArray newsSummaryArray = jsonResponse.getJSONArray(newsSummaryKey);

        if (notificationArray.length() > 0) {
            JSONArray notifications = notificationArray.getJSONObject(0).getJSONArray("notification_data");
            Log.d(TAG, "Got notifications: " + notifications);

            List<JSONObject> sortedNotifications = new ArrayList<>();
            for (int i = 0; i < notifications.length(); i++) {
                sortedNotifications.add(notifications.getJSONObject(i));
            }

            Collections.sort(sortedNotifications, new Comparator<JSONObject>() {
                @Override
                public int compare(JSONObject a, JSONObject b) {
                    try {
                        return Integer.compare(a.getInt("rank"), b.getInt("rank"));
                    } catch (JSONException e) {
                        // If a rank is missing or unparsable, treat as equal
                        return 0;
                    }
                }
            });

            notificationList.clear();
//        Log.d(TAG, "Got notifications: " + sortedNotifications.toString());

            for (int i = 0; i < sortedNotifications.size(); i++) {
                JSONObject notification = sortedNotifications.get(i);
                String summary = notification.getString("summary");
                notificationList.add(summary);
            }
        }

        if (newsSummaryArray.length() > 0) {
            JSONObject newsSummary = newsSummaryArray.getJSONObject(0);
            latestNewsArray = newsSummary.getJSONObject("news_data").getJSONArray("news_summaries");
            Log.d(TAG, "Latest news: " + latestNewsArray);
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
            jsonQuery.put("userId", userId);
            jsonQuery.put("lat", latitude);
            jsonQuery.put("lng", longitude);

            oldBackendServerComms.restRequest(GEOLOCATION_STREAM_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
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
        //        if (!message.equals("")) {
//            responses.add(message);
//            sendUiUpdateSingle(message);
//            speakTTS(message);
//        }
    }

    public void parseAugmentOSResults(JSONObject response) throws JSONException {
        String imgKey = "image_url";
        String mapImgKey = "map_image_path";

        //explicit queries
        JSONArray explicitAgentQueries = response.has(explicitAgentQueriesKey) ? response.getJSONArray(explicitAgentQueriesKey) : new JSONArray();

        JSONArray explicitAgentResults = response.has(explicitAgentResultsKey) ? response.getJSONArray(explicitAgentResultsKey) : new JSONArray();

        //displayResults
        JSONArray displayRequests = response.has(displayRequestsKey) ? response.getJSONArray(displayRequestsKey) : new JSONArray();

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
                        smartGlassesService.windowManager.showAppLayer("server", () -> smartGlassesService.sendReferenceCard(title, body), -1);
                        break;
                    case "TEXT_WALL":
                    case "TEXT_LINE":
                        body = content.getString("body");
                        queueOutput(body);
                        smartGlassesService.windowManager.showAppLayer("server", () -> smartGlassesService.sendTextWall(body), -1);
                        break;
                    case "DOUBLE_TEXT_WALL":
                        String bodyTop = content.getString("bodyTop");
                        String bodyBottom = content.getString("bodyBottom");
                        queueOutput(bodyTop + "\n\n" + bodyBottom);
                        smartGlassesService.windowManager.showAppLayer("server", () -> smartGlassesService.sendDoubleTextWall(bodyTop, bodyBottom), -1);
                        break;
                    case "ROWS_CARD":
                        JSONArray rowsArray = content.getJSONArray("rows");
                        String[] stringsArray = new String[rowsArray.length()];
                        for (int k = 0; k < rowsArray.length(); k++)
                            stringsArray[k] = rowsArray.getString(k);
                        queueOutput(String.join("\n", stringsArray));
                        smartGlassesService.windowManager.showAppLayer("server", () -> smartGlassesService.sendRowsCard(stringsArray), -1);
                        break;
                    default:
                        Log.d(TAG, "SOME ISSUE");
                }
            }
            catch (JSONException e){
                e.printStackTrace();
            }
        }

        long wakeWordTime = response.has(wakeWordTimeKey) ? response.getLong(wakeWordTimeKey) : -1;

        // Wake word indicator
        if (wakeWordTime != -1 && wakeWordTime != previousWakeWordTime){
            previousWakeWordTime = wakeWordTime;
            String body = "Listening... ";
            if (smartGlassesService != null)
                smartGlassesService.windowManager.showAppLayer("server", () -> smartGlassesService.sendReferenceCard(glassesCardTitle, body), -1);
            queueOutput(body);
        }

        //go through explicit agent queries and add to resultsToDisplayList
        // "Processing query: " indicator
        for (int i = 0; i < explicitAgentQueries.length(); i++){
            try {
                JSONObject obj = explicitAgentQueries.getJSONObject(i);
                String title = "Processing Query";
                String body = "\"" + obj.getString("query") + "\"";
                if (smartGlassesService != null)
                    smartGlassesService.windowManager.showAppLayer("server", () -> smartGlassesService.sendReferenceCard(title, body), -1);
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
                if (smartGlassesService != null)
                    smartGlassesService.windowManager.showAppLayer("server", () -> smartGlassesService.sendReferenceCard(glassesCardTitle, body), -1);
                queueOutput(body);
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        //see if we should update user settings
//        boolean shouldUpdateSettingsResult = response.has(shouldUpdateSettingsKey) && response.getBoolean(shouldUpdateSettingsKey);
//        if (shouldUpdateSettingsResult){
//            Log.d(TAG, "Running get settings because shouldUpdateSettings true");
//            getSettings();
//        }
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
        if (smartGlassesService != null)
            smartGlassesService.sendTextLine(toSpeak);
    }

    public void sendUiUpdateFull(){
        Intent intent = new Intent();
        intent.setAction(AugmentosCoreUi.UI_UPDATE_FULL);
        intent.putStringArrayListExtra(AugmentosCoreUi.AUGMENTOS_CORE_MESSAGE_STRING, responsesBuffer);
        intent.putStringArrayListExtra(AugmentosCoreUi.TRANSCRIPTS_MESSAGE_STRING, transcriptsBuffer);
        sendBroadcast(intent);
    }

    public void sendUiUpdateSingle(String message) {
        Intent intent = new Intent();
        intent.setAction(AugmentosCoreUi.UI_UPDATE_SINGLE);
        intent.putExtra(AugmentosCoreUi.AUGMENTOS_CORE_MESSAGE_STRING, message);
        sendBroadcast(intent);
    }

    public void sendFinalTranscriptToActivity(String transcript){
        Intent intent = new Intent();
        intent.setAction(AugmentosCoreUi.UI_UPDATE_FINAL_TRANSCRIPT);
        intent.putExtra(AugmentosCoreUi.FINAL_TRANSCRIPT, transcript);
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
            jsonQuery.put("userId", userId);
            oldBackendServerComms.restRequest(BUTTON_EVENT_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
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

    public static void saveCurrentModeLocal(Context context, String currentModeString) {
        //save the new mode
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_CURRENT_MODE), currentModeString)
                .apply();
    }

    public void saveCurrentMode(Context context, String currentModeString) {
//        if (smartGlassesService != null)
//            smartGlassesService.sendHomeScreen();

        saveCurrentModeLocal(context, currentModeString);

        try{
            JSONObject settingsObj = new JSONObject();
            settingsObj.put("current_mode", currentModeString);
            //     sendSettings(settingsObj);
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
//        return currentModeString;
        return "Hard Coded Mode"; // TODO: hard coded mode
    }

    // Used for notifications and for screen mirror
    @Subscribe
    public void onNewScreenTextEvent(NewScreenTextEvent event) {
//        // Notification
//        if (event.title != null && event.body != null) {
//            if (smartGlassesService != null)
//                smartGlassesService.windowManager.addTask(new WindowManager.Task(() -> smartGlassesService.sendReferenceCard(event.title, event.body), false, false, false));
//        }
//        else if (event.body != null){ //Screen mirror text
//            if (smartGlassesService != null)
//                smartGlassesService.windowManager.addTask(new WindowManager.Task(() -> smartGlassesService.sendTextWall(event.body), false, true, false));
//        }
    }

    @Subscribe
    public void onGlassesBluetoothSearchDiscoverEvent(GlassesBluetoothSearchDiscoverEvent event){
        blePeripheral.sendGlassesBluetoothDiscoverResultToManager(event.modelName, event.deviceName);
    }

    @Subscribe
    public void onGlassesBluetoothSearchStopEvent(GlassesBluetoothSearchStopEvent event){
        blePeripheral.sendGlassesBluetoothStopToManager(event.modelName);
    }

    @Subscribe
    public void onNewScreenImageEvent(NewScreenImageEvent event) {
        if (smartGlassesService != null)
            smartGlassesService.windowManager.showAppLayer("server", () -> smartGlassesService.sendBitmap(event.bmp), -1);
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

    public boolean getIsSearchingForGlasses() {
        //return isSmartGlassesServiceBound && smartGlassesService.getConnectedSmartGlasses() == null;
        return smartGlassesService != null
                && smartGlassesService.getSmartGlassesConnectState() != SmartGlassesConnectionState.DISCONNECTED
                && smartGlassesService.getSmartGlassesConnectState() != SmartGlassesConnectionState.CONNECTED;
    }

    private void executeOnceSmartGlassesServiceReady(Context context, Runnable action) {
        if (smartGlassesService != null && smartGlassesService != null) {
            // If the service is already bound, execute the action immediately
            action.run();
            return;
        }

        // Add the action to the queue
        serviceReadyListeners.add(action);

        // Ensure the service is started and bound
        if (smartGlassesService == null) {
            startSmartGlassesService();
        }
    }

    private String getCoreVersion() {
        try {

            int resId = this.getResources().getIdentifier("config", "raw", this.getPackageName());
            if (resId == 0) {
                Log.w(TAG, "No tpa_config.json found in res/raw!");
                return "Unknown";
            }

            InputStream inputStream = this.getResources().openRawResource(resId);
            Scanner s = new Scanner(inputStream).useDelimiter("\\A");
            String jsonString = s.hasNext() ? s.next() : "";
            inputStream.close();

            JSONObject root = new JSONObject(jsonString);
            String version = root.optString("version");
            return version;
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
    }

    public JSONObject generateStatusJson() {
        try {
            // Creating the main status object
            JSONObject status = new JSONObject();

            // Adding puck battery life and charging status
            status.put("augmentos_core_version", getCoreVersion());
            status.put("puck_battery_life", batteryStatusHelper.getBatteryLevel());
            status.put("charging_status", batteryStatusHelper.isBatteryCharging());
            status.put("sensing_enabled", SpeechRecSwitchSystem.sensing_enabled);
            status.put("contextual_dashboard_enabled", this.contextualDashboardEnabled);
            status.put("force_core_onboard_mic", AugmentosSmartGlassesService.getForceCoreOnboardMic(this));
            status.put("default_wearable", AugmentosSmartGlassesService.getPreferredWearable(this));
            // Log.d(TAG, "PREFER - Got default wearable: " + AugmentosSmartGlassesService.getPreferredWearable(this));

            // Adding connected glasses object
            JSONObject connectedGlasses = new JSONObject();
            if(smartGlassesService != null && smartGlassesService.getConnectedSmartGlasses() != null) {
                connectedGlasses.put("model_name", smartGlassesService.getConnectedSmartGlasses().deviceModelName);
                connectedGlasses.put("battery_life", (batteryLevel == null) ? -1: batteryLevel); //-1 if unknown
                String brightnessString;
                if (brightnessLevel == null) {
                    brightnessString = "-";
                } else if (brightnessLevel == -1){
                    brightnessString = "AUTO";
                } else {
                    brightnessString = brightnessLevel + "%";
                }
                connectedGlasses.put("brightness", brightnessString);
            }
            else {
                connectedGlasses.put("is_searching", getIsSearchingForGlasses());
            }
            status.put("connected_glasses", connectedGlasses);

            // Adding wifi status
            JSONObject wifi = new JSONObject();
            wifi.put("is_connected", wifiStatusHelper.isWifiConnected());
            wifi.put("ssid", wifiStatusHelper.getSSID());
            wifi.put("signal_strength", wifiStatusHelper.getSignalStrength());
            status.put("wifi", wifi);

            // Adding gsm status
            JSONObject gsm = new JSONObject();
            gsm.put("is_connected", gsmStatusHelper.isConnected());
            gsm.put("carrier", gsmStatusHelper.getNetworkType());
            gsm.put("signal_strength", gsmStatusHelper.getSignalStrength());
            status.put("gsm", gsm);

            // Adding apps array
            JSONArray apps = new JSONArray();

//            for (ThirdPartyApp tpa : tpaSystem.getThirdPartyApps()) {
//                if(tpa.appType != ThirdPartyAppType.APP) continue;
//
//                JSONObject tpaObj = tpa.toJson(false);
//                //JSONObject tpaObj = new JSONObject();
//                //tpaObj.put("name", tpa.appName);
//                //tpaObj.put("description", tpa.appDescription);
//                tpaObj.put("is_running", tpaSystem.checkIsThirdPartyAppRunningByPackageName(tpa.packageName));
//                tpaObj.put("is_foreground", tpaSystem.checkIsThirdPartyAppRunningByPackageName(tpa.packageName));
//                tpaObj.put("version", tpa.version);
//                //tpaObj.put("package_name", tpa.packageName);
//                //tpaObj.put("type", tpa.appType.name());
//                apps.put(tpaObj);
//            }

            for (ThirdPartyCloudApp tpa : httpServerComms.getCachedApps()) {
                JSONObject tpaObj = tpa.toJson(false);
                tpaObj.put("is_running", false);//tpaSystem.checkIsThirdPartyAppRunningByPackageName(tpa.packageName));
                tpaObj.put("is_foreground", false);//tpaSystem.checkIsThirdPartyAppRunningByPackageName(tpa.packageName));
                apps.put(tpaObj);
            }

            // Adding apps array to the status object
            status.put("apps", apps);

            // Add auth to status object
            status.put("auth", authHandler.toJson());

            // Wrapping the status object inside a main object (as shown in your example)
            JSONObject mainObject = new JSONObject();
            mainObject.put("status", status);

            try {
                Map<String, Object> props = convertJsonToMap(status);
                postHog.capture(authHandler.getUniqueIdForAnalytics(), "status", props);
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }

            return mainObject;
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
    }

    // AugmentOS_Manager Comms Callbacks
    public void sendStatusToAugmentOsManager(){
        // Build status obj, send to aosmanager
        JSONObject status = generateStatusJson();
        blePeripheral.sendDataToAugmentOsManager(status.toString());
    }

    @Override
    public void requestPing() {
        blePeripheral.sendPing();
    }

    @Override
    public void requestStatus() {
        sendStatusToAugmentOsManager();
    }

    @Override
    public void searchForCompatibleDeviceNames(String modelName) {
        Log.d("AugmentOsService", "Searching for compatible device names for model: " + modelName);
        SmartGlassesDevice device = getSmartGlassesDeviceFromModelName(modelName);
        if (device == null) {
            blePeripheral.sendNotifyManager("Incorrect model name: " + modelName, "error");
            return;
        }

        executeOnceSmartGlassesServiceReady(this, () -> {
            smartGlassesService.findCompatibleDeviceNames(device);
            // blePeripheral.sendGlassesSearchResultsToManager(modelName, compatibleDeviceNames);
        });
    }

    @Override
    public void connectToWearable(String modelName, String deviceName) {
        Log.d("AugmentOsService", "Connecting to wearable: " + modelName + ". DeviceName: " + deviceName + ".");
        // Logic to connect to wearable
        SmartGlassesDevice device = getSmartGlassesDeviceFromModelName(modelName);
        if (device == null) {
            blePeripheral.sendNotifyManager("Incorrect model name: " + modelName, "error");
            return;
        }

        // TODO: Good lord this is hacky
        // TODO: Find a good way to conditionally send a glasses bt device name to SGC
        if (!deviceName.isEmpty() && modelName.contains("Even Realities"))
            savePreferredG1DeviceId(this, deviceName);

        executeOnceSmartGlassesServiceReady(this, () -> {
            smartGlassesService.connectToSmartGlasses(device);
            sendStatusToAugmentOsManager();
        });
    }

    @Override
    public void disconnectWearable(String wearableId) {
        Log.d("AugmentOsService", "Disconnecting from wearable: " + wearableId);
        // Logic to disconnect wearable
        stopSmartGlassesService();

        //reset some local variables
        brightnessLevel = null;
        batteryLevel = null;
    }

    @Override
    public void forgetSmartGlasses() {
        Log.d("AugmentOsService", "Forgetting wearable");
        savePreferredWearable(this, "");
        deleteEvenSharedPreferences(this);
        stopSmartGlassesService();
        sendStatusToAugmentOsManager();
    }

    @Override
    public void startApp(String packageName) {
        Log.d("AugmentOsService", "Starting app: " + packageName);
        // Logic to start the app by package name

        // Only allow starting apps if glasses are connected
        if (smartGlassesService != null && smartGlassesService.getConnectedSmartGlasses() != null) {
            //tpaSystem.startThirdPartyAppByPackageName(packageName);
            serverComms.startApp(packageName);
            sendStatusToAugmentOsManager();
        } else {
            Log.d(TAG, "Not starting app because glasses aren't connected.");
            blePeripheral.sendNotifyManager("Must connect glasses to start an app", "error");
        }

        Map<String, Object> props = new HashMap<>();
        props.put("package_name", packageName);
        props.put("timestamp", System.currentTimeMillis());
        postHog.capture(authHandler.getUniqueIdForAnalytics(), "start_app", props);
    }

    @Override
    public void stopApp(String packageName) {
        Log.d("AugmentOsService", "Stopping app: " + packageName);
        //tpaSystem.stopThirdPartyAppByPackageName(packageName);
        serverComms.stopApp(packageName);
        sendStatusToAugmentOsManager();

        Map<String, Object> props = new HashMap<>();
        props.put("package_name", packageName);
        props.put("timestamp", System.currentTimeMillis());
        postHog.capture(authHandler.getUniqueIdForAnalytics(), "stop_app", props);
    }

    @Override
    public void setForceCoreOnboardMic(boolean toForceCoreOnboardMic) {
        AugmentosSmartGlassesService.saveForceCoreOnboardMic(this, toForceCoreOnboardMic);
        blePeripheral.sendNotifyManager("Setting will apply next time you connect to glasses", "error");
        Map<String, Object> props = new HashMap<>();
        props.put("set_force_core_onboard_mic", toForceCoreOnboardMic);
        props.put("timestamp", System.currentTimeMillis());
        postHog.capture(authHandler.getUniqueIdForAnalytics(), "set_force_core_onboard_mic", props);
    }

    @Override
    public void setSensingEnabled(boolean sensingEnabled) {
        if (smartGlassesService != null) {
            EventBus.getDefault().post(new SetSensingEnabledEvent(sensingEnabled));
        } else {
            blePeripheral.sendNotifyManager("Connect glasses to toggle sensing", "error");
        }

        Map<String, Object> props = new HashMap<>();
        props.put("sensing_enabled", sensingEnabled);
        props.put("timestamp", System.currentTimeMillis());
        postHog.capture(authHandler.getUniqueIdForAnalytics(), "set_sensing_enabled", props);
    }

    @Override
    public void setContextualDashboardEnabled(boolean contextualDashboardEnabled) {
        saveContextualDashboardEnabled(contextualDashboardEnabled);
        this.contextualDashboardEnabled = contextualDashboardEnabled;
    }

    public boolean getContextualDashboardEnabled() {
        return this.getSharedPreferences("AugmentOSPrefs", Context.MODE_PRIVATE).getBoolean("contextual_dashboard_enabled", true);
    }

    public void saveContextualDashboardEnabled(boolean enabled) {
        SharedPreferences sharedPreferences = this.getSharedPreferences("AugmentOSPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putBoolean("contextual_dashboard_enabled", enabled);
        editor.apply();
    }

    @Override
    public void installAppFromRepository(String repository, String packageName) throws JSONException {
        Log.d("AugmentOsService", "Installing app from repository: " + packageName);

        JSONObject jsonQuery = new JSONObject();
        jsonQuery.put("packageName", packageName);

        oldBackendServerComms.restRequest(REQUEST_APP_BY_PACKAGE_NAME_DOWNLOAD_LINK_ENDPOINT, jsonQuery, new VolleyJsonCallback() {
            @Override
            public void onSuccess(JSONObject result) {
                Log.d(TAG, "GOT INSTALL APP RESULT: " + result.toString());

                try {
                    String downloadLink = result.optString("download_url");
                    String appName = result.optString("app_name");
                    String version = result.optString("version");
                    if (!downloadLink.isEmpty()) {
                        Log.d(TAG, "Download link received: " + downloadLink);

                        if (downloadLink.startsWith("https://api.augmentos.org/")) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                downloadApk(downloadLink, packageName, appName, version);
                            }
                        } else {
                            Log.e(TAG, "The download link does not match the required domain.");
                            throw new UnsupportedOperationException("Download links outside of https://api.augmentos.org/ are not supported.");
                        }
                    } else {
                        Log.e(TAG, "Download link is missing in the response.");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error parsing download link: ", e);
                }
            }

            @Override
            public void onFailure(int code) {
                Log.d(TAG, "SOME FAILURE HAPPENED (installAppFromRepository)");
            }
        });

        Map<String, Object> props = new HashMap<>();
        props.put("timestamp", System.currentTimeMillis());
        props.put("respository", repository);
        props.put("package_name", packageName);
        postHog.capture(authHandler.getUniqueIdForAnalytics(), "install_app_from_repo", props);
    }

    private void downloadApk(String downloadLink, String packageName, String appName, String version) { // TODO: Add fallback if the download doesn't succeed
        DownloadManager downloadManager = (DownloadManager) this.getSystemService(Context.DOWNLOAD_SERVICE);

        if (downloadManager != null) {
            Uri uri = Uri.parse(downloadLink);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle("Downloading " + appName);
//            request.setDescription("Downloading APK for " + appName);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            String downloadedAppName = appName.replace(" ", "") + "_" + version + ".apk";
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, downloadedAppName);
//            blePeripheral.sendAppIsInstalledEventToManager(packageName);

            long downloadId = downloadManager.enqueue(request);

            BroadcastReceiver receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId) {
                        installApk(packageName, downloadedAppName);

                        context.unregisterReceiver(this);
                    }
                }
            };

            this.registerReceiver(receiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }
    }

    private void installApk(String packageName, String downloadedAppName) {
        File apkFile = new File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                downloadedAppName
        );
        if (!apkFile.exists() || apkFile.length() == 0) {
            Log.e("Installer", "APK file is missing or 0 bytes.");
            return;
        }

        Log.d("Installer", "APK file exists: " + apkFile.getAbsolutePath());

        blePeripheral.sendAppIsInstalledEventToManager(packageName);

//        Uri apkUri;
//        Intent intent = new Intent(Intent.ACTION_VIEW);
//        apkUri = FileProvider.getUriForFile(
//                getApplicationContext(),
//                getApplicationContext().getPackageName() + ".provider",
//                apkFile
//        );
//        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
//
//        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
//        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
//        startActivity(intent);
//        blePeripheral.sendNotifyManager("App installed", "Success");
    }

    @Override
    public void uninstallApp(String uninstallPackageName) {
        Log.d(TAG, "uninstallApp not implemented");
        blePeripheral.sendNotifyManager("Uninstalling is not implemented yet", "error");

        Map<String, Object> props = new HashMap<>();
        props.put("timestamp", System.currentTimeMillis());
        props.put("package_name", uninstallPackageName);
        postHog.capture(authHandler.getUniqueIdForAnalytics(), "install_app_from_repo", props);
    }

    @Override
    public void requestAppInfo(String packageNameToGetDetails) {
        ThirdPartyApp tpa = tpaSystem.getThirdPartyAppByPackageName(packageNameToGetDetails);
        if (tpa == null) {
            blePeripheral.sendNotifyManager("Could not find app", "error");
            sendStatusToAugmentOsManager();
            return;
        }
        JSONArray settings = tpa.getSettings(this);
        if (settings == null) {
            blePeripheral.sendNotifyManager("Could not get app's details", "error");
            return;
        }
        blePeripheral.sendAppInfoToManager(tpa);

        Map<String, Object> props = new HashMap<>();
        props.put("package_name", packageNameToGetDetails);
        props.put("timestamp", System.currentTimeMillis());
        postHog.capture(authHandler.getUniqueIdForAnalytics(),"request_app_info", props);
    }

    @Override
    public void handleNotificationData(JSONObject notificationData){
        try {
            if (notificationData != null) {
                String appName = notificationData.getString("appName");
                String title = notificationData.getString("title");
                String text = notificationData.getString("text");
                long timestamp = notificationData.getLong("timestamp");
                String uuid = notificationData.getString("uuid");

                serverComms.sendPhoneNotification(uuid, appName, title, text, "high");

                //EventBus.getDefault().post(new NotificationEvent(title, text, appName, timestamp, uuid));
            } else {
                System.out.println("Notification Data is null");
            }
        } catch (JSONException e) {
            Log.d(TAG, "JSONException occurred while handling notification data: " + e.getMessage());
        }
    }

    @Override
    public void updateGlassesBrightness(int brightness) {
        Log.d("AugmentOsService", "Updating glasses brightness: " + brightness);
        if (smartGlassesService != null) {
            String title = "Brightness Adjustment";
            String body = "Updating glasses brightness to " + brightness + "%.";
            smartGlassesService.windowManager.showAppLayer("system", () -> SmartGlassesAndroidService.sendReferenceCard(title, body), 6);
            smartGlassesService.updateGlassesBrightness(brightness);
        } else {
            blePeripheral.sendNotifyManager("Connect glasses to update brightness", "error");
        }
    }

    @Override
    public void setAuthSecretKey(String uniqueUserId, String authSecretKey) {
        Log.d("AugmentOsService", "Setting auth secret key: " + authSecretKey);
        authHandler.setAuthSecretKey(authSecretKey);
        authHandler.verifyAuthSecretKey(uniqueUserId);
        sendStatusToAugmentOsManager();
    }

    @Override
    public void verifyAuthSecretKey() {
        Log.d("AugmentOsService", "Deleting auth secret key");
        // Logic to verify the authentication key
        // (Ping a server /login or /verify route & return the result to aosManager)
        //authHandler.verifyAuthSecretKey();
        //sendStatusToAugmentOsManager();
    }

    @Override
    public void deleteAuthSecretKey() {
        Log.d("AugmentOsService", "Deleting auth secret key");
        authHandler.deleteAuthSecretKey();
        sendStatusToAugmentOsManager();
    }

    @Override
    public void updateAppSettings(String targetApp, JSONObject settings) {
        Log.d("AugmentOsService", "Updating settings for app: " + targetApp);
        ThirdPartyApp tpa = tpaSystem.getThirdPartyAppByPackageName(targetApp);
        if (tpa == null) {
            blePeripheral.sendNotifyManager("Could not find app", "error");
            return;
        }

        boolean allSuccess = true;
        try {
            // New loop over all keys in the settings object
            Iterator<String> keys = settings.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object value = settings.get(key);
                if(!tpa.updateSetting(this, key, value)) {
                    allSuccess = false;
                }
            }
        } catch (JSONException e) {
            Log.e("AugmentOsService", "Failed to parse settings object", e);
            allSuccess = false;
        }

        if (!allSuccess) {
            blePeripheral.sendNotifyManager("Error updating settings", "error");
        }

        try {
            Map<String, Object> props = new HashMap<>();
            props.put("timestamp", System.currentTimeMillis());
            props.put("package_name", targetApp);
            props.put("settings", convertJsonToMap(settings));
            postHog.capture(authHandler.getUniqueIdForAnalytics(), "update_app_settings", props);
        } catch (JSONException e) {
            Log.d(TAG, "JSONEXCEPTION IN UPDATEAPPSETTINGS???");
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