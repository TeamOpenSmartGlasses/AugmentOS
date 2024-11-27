package com.teamopensmartglasses.example_smart_glasses_app;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;

import android.util.Log;

import com.teamopensmartglasses.smartglassesmanager.SmartGlassesAndroidService;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.GlassesTapOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SpeechRecOutputEvent;

public class SmartGlassesService extends SmartGlassesAndroidService {
    public String TAG = "SmartGlassesExampleApp_Service";

    public SmartGlassesService(){
        super(MainActivity.class,
                "example_smart_glasses_app",
                1837, //choose your own number here
                "Example Smart Glasses App",
                "An example app for smart glasses",
                R.drawable.ic_launcher_foreground);

        //register subscribers on EventBus
        EventBus.getDefault().register(this);
    }

    @Subscribe
    public void onTranscript(SpeechRecOutputEvent event) {
        String text = event.text;
        long time = event.timestamp;
        boolean isFinal = event.isFinal;

        if (isFinal) {
            Log.d(TAG, "Got a final transcript");
        } else {
            Log.d(TAG, "Got an intermediate transcript");
        }
    }

    @Subscribe
    public void onSmartRingButtonEvent(SmartRingButtonOutputEvent event) {
        int buttonId = event.buttonId;
        long time = event.timestamp;

        Log.d(TAG, "Got an smart ring button event");
    }

    @Subscribe
    public void onGlassesTapSideEvent(GlassesTapOutputEvent event) {
        int numTaps = event.numTaps;
        boolean sideOfGlasses = event.sideOfGlasses;
        long time = event.timestamp;
        Log.d(TAG, "Got an glasses tap event, number of taps is: " + numTaps);
    }

    public void deinit(){
        EventBus.getDefault().unregister(this);
    }
}
