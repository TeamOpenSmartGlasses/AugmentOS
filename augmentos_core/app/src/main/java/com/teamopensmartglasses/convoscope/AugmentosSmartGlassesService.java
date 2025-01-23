package com.teamopensmartglasses.convoscope;

import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import android.view.WindowManager;

import com.teamopensmartglasses.convoscope.events.AugmentosSmartGlassesDisconnectedEvent;
import com.teamopensmartglasses.convoscope.ui.AugmentosUi;
import com.teamopensmartglasses.augmentoslib.events.DiarizationOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.GlassesTapOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecOutputEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import java.util.ArrayList;

import com.teamopensmartglasses.smartglassesmanager.SmartGlassesAndroidService;
import com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators.SmartGlassesFontSize;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.ASR_FRAMEWORKS;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.SmartGlassesDevice;

public class AugmentosSmartGlassesService extends SmartGlassesAndroidService {
    public final String TAG = "AugmentOS_AugmentOSService";

    private final IBinder binder = new LocalBinder();

    String authToken = "";

    ArrayList<String> responsesBuffer;
    ArrayList<String> responsesToShare;
    private final Handler csePollLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable cseRunnableCode;
    private final Handler displayPollLoopHandler = new Handler(Looper.getMainLooper());

    private long currTime = 0;
    private long lastPressed = 0;
    private long lastTapped = 0;

    // Double clicking constants
    private final long doublePressTimeConst = 420;
    private final long doubleTapTimeConst = 600;
    public WindowManagerWithTimeouts windowManager;

    public AugmentosSmartGlassesService() {
        super(AugmentosUi.class,
                "augmentos_app",
                3589,
                "AugmentOS SGM",
                "AugmentOS SmartGlassesManager", R.drawable.ic_launcher_foreground);
    }

    @Override
    public void onCreate() {
        super.onCreate();

        //setup event bus subscribers
        this.setupEventBusSubscribers();

        windowManager = new WindowManagerWithTimeouts(
                19, // globalTimeoutSeconds
                () -> windowManager.clearAll() // what to do when globally timed out
        );

        String asrApiKey = getResources().getString(R.string.google_api_key);
        saveApiKey(this, asrApiKey);

        saveChosenAsrFramework(this, ASR_FRAMEWORKS.AZURE_ASR_FRAMEWORK);
    }

    @Override
    protected void onGlassesConnected(SmartGlassesDevice device) {
        Log.d(TAG, "Glasses connected successfully: " + device.deviceModelName);
        setFontSize(SmartGlassesFontSize.MEDIUM);
        //windowManager.startQueue();
    }

    @Override
    public void onDestroy(){
        EventBus.getDefault().post(new AugmentosSmartGlassesDisconnectedEvent());
        EventBus.getDefault().unregister(this);

        //if (windowManager != null) windowManager.stopQueue();
        if (windowManager != null) windowManager.shutdown();

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
        }

        if(isDown) {
            lastPressed = System.currentTimeMillis();
        }
    }

    @Subscribe
    public void onDiarizeData(DiarizationOutputEvent event) {
    }

    @Subscribe
    public void onTranscript(SpeechRecOutputEvent event) {

    }

    public WindowManagerWithTimeouts getWindowManager() {
        return windowManager;
    }

    public void clearScreen() {
     sendHomeScreen();
    }
}
