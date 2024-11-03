package com.teamopensmartglasses.convoscope.tpa;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.teamopensmartglasses.augmentoslib.AugmentOSCommand;
import com.teamopensmartglasses.augmentoslib.ThirdPartyApp;
import com.teamopensmartglasses.augmentoslib.events.BulletPointListViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.CommandTriggeredEvent;
import com.teamopensmartglasses.augmentoslib.events.DisplayCustomContentRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.FinalScrollingTextRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.FocusChangedEvent;
import com.teamopensmartglasses.augmentoslib.events.GlassesTapOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.IntermediateScrollingTextRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.KillTpaEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardImageViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardSimpleViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.RegisterCommandRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStartRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStopRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecFinalOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecIntermediateOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SubscribeDataStreamRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.TextLineViewRequestEvent;
import com.teamopensmartglasses.convoscope.tpa.eventbusmessages.TPARequestEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;

import java.lang.reflect.Type;
import java.util.ArrayList;

public class TPASystem {
    private String TAG = "WearableAi_TPASystem";
    private Context mContext;
    private AugmentOSLibBroadcastSender augmentOsLibBroadcastSender;
    private AugmentOSLibBroadcastReceiver augmentOsLibBroadcastReceiver;

    private static final String PREFS_NAME = "AugmentOSPrefs";
    private static final String APPS_KEY = "thirdPartyApps";

    private ArrayList<ThirdPartyApp> thirdPartyApps;
    private SharedPreferences sharedPreferences;
    private Gson gson;

    public TPASystem(Context context){
        mContext = context;
        augmentOsLibBroadcastSender = new AugmentOSLibBroadcastSender(mContext);
        augmentOsLibBroadcastReceiver = new AugmentOSLibBroadcastReceiver(mContext);

        //subscribe to event bus events
        EventBus.getDefault().register(this);



        sharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        gson = new Gson();
        thirdPartyApps = new ArrayList<>();
        loadThirdPartyAppsFromStorage();
    }

    @Subscribe
    public void onCommandTriggeredEvent(CommandTriggeredEvent receivedEvent){
        Log.d(TAG, "Command was triggered: " + receivedEvent.command.getName());
        AugmentOSCommand command = receivedEvent.command;
        String args = receivedEvent.args;
        long commandTriggeredTime = receivedEvent.commandTriggeredTime;
        if (command != null) {
            if (command.packageName != null){
                augmentOsLibBroadcastSender.sendEventToTPAs(CommandTriggeredEvent.eventId, new CommandTriggeredEvent(command, args, commandTriggeredTime));
            }
        }
    }

    @Subscribe
    public void onKillTpaEvent(KillTpaEvent killTpaEvent)
    {
        augmentOsLibBroadcastSender.sendEventToTPAs(KillTpaEvent.eventId, killTpaEvent);
    }

    @Subscribe
    public void onIntermediateTranscript(SpeechRecIntermediateOutputEvent event){
        boolean tpaIsSubscribed = true; //TODO: Hash out implementation
        if(tpaIsSubscribed){
            augmentOsLibBroadcastSender.sendEventToTPAs(SpeechRecIntermediateOutputEvent.eventId, event);
        }
    }

    @Subscribe
    public void onFocusChanged(FocusChangedEvent receivedEvent) {
        augmentOsLibBroadcastSender.sendEventToTPAs(FocusChangedEvent.eventId, receivedEvent, receivedEvent.appPackage);
    }

    @Subscribe
    public void onFinalTranscript(SpeechRecFinalOutputEvent event){
        boolean tpaIsSubscribed = true; //TODO: Hash out implementation
        if(tpaIsSubscribed){
            augmentOsLibBroadcastSender.sendEventToTPAs(SpeechRecFinalOutputEvent.eventId, event);
        }
    }

    @Subscribe
    public void onSmartRingButtonEvent(SmartRingButtonOutputEvent event){
        boolean tpaIsSubscribed = true; //TODO: Hash out implementation
        if(tpaIsSubscribed){
            augmentOsLibBroadcastSender.sendEventToTPAs(SmartRingButtonOutputEvent.eventId, event);
        }
    }

    @Subscribe
    public void onGlassesTapEvent(GlassesTapOutputEvent event){
        boolean tpaIsSubscribed = true; //TODO: Hash out implementation
        if(tpaIsSubscribed){
            augmentOsLibBroadcastSender.sendEventToTPAs(GlassesTapOutputEvent.eventId, event);
        }
    }

    @Subscribe
    public void onSubscribeDataStreamRequestEvent(SubscribeDataStreamRequestEvent event){
        Log.d(TAG, "Got a request to subscribe to data stream");
        /*
            TODO: Hash out implementation
            Should data stream subscriptions use an SGMCommand for its callback function,
            or something else?
        */
    }

    public void registerThirdPartyApp(ThirdPartyApp app) {
        thirdPartyApps.add(app);
        saveThirdPartyAppsToStorage();
    }

    public void unregisterThirdPartyApp(ThirdPartyApp app) {
        thirdPartyApps.remove(app);
        saveThirdPartyAppsToStorage();
    }

    private void saveThirdPartyAppsToStorage() {
        // Convert the list to JSON and save to SharedPreferences
        String json = gson.toJson(thirdPartyApps);
        sharedPreferences.edit().putString(APPS_KEY, json).apply();
    }

    public void loadThirdPartyAppsFromStorage() {
        // Load JSON string from SharedPreferences
        String json = sharedPreferences.getString(APPS_KEY, null);
        if (json != null) {
            Type type = new TypeToken<ArrayList<ThirdPartyApp>>() {}.getType();
            thirdPartyApps = gson.fromJson(json, type);
        } else {
            thirdPartyApps = new ArrayList<>();
        }
    }

    public ArrayList<ThirdPartyApp> getThirdPartyApps() {
        return thirdPartyApps;
    }

    public boolean shouldAppBeRunning(String packageName){
        for (ThirdPartyApp app : thirdPartyApps) {
            if (app.packageName.equals(packageName)) {
                // TODO: OK WE HAVE THE APP, NOW MAKE SURE IT'S SUPPOSED TO BE RUNNING
                return true;
            }
        }
        return false;
    }

    //respond and approve events below
    @Subscribe
    public void onTPARequestEvent(TPARequestEvent receivedEvent) {
        Log.d(TAG, "onTPARequestEvent");

        //map from id to event for all events that don't need permissions
        switch (receivedEvent.eventId) {
            case RegisterCommandRequestEvent.eventId:
                Log.d(TAG, "Resending register command request event");
                EventBus.getDefault().post((RegisterCommandRequestEvent) receivedEvent.serializedEvent);
                return;
        }

        if (!shouldAppBeRunning(receivedEvent.sendingPackage)) {
            Log.d(TAG, "Unknown app '" + receivedEvent.serializedEvent + "' attempting request... weird...");
            return;
        }

        switch (receivedEvent.eventId) {
            case ReferenceCardSimpleViewRequestEvent.eventId:
                EventBus.getDefault().post((ReferenceCardSimpleViewRequestEvent) receivedEvent.serializedEvent);
                break;
            case ReferenceCardImageViewRequestEvent.eventId:
                EventBus.getDefault().post((ReferenceCardImageViewRequestEvent) receivedEvent.serializedEvent);
                break;
            case BulletPointListViewRequestEvent.eventId:
                EventBus.getDefault().post((BulletPointListViewRequestEvent) receivedEvent.serializedEvent);
                break;
            case ScrollingTextViewStartRequestEvent.eventId: //mode start command - gives app focus
                EventBus.getDefault().post((ScrollingTextViewStartRequestEvent) receivedEvent.serializedEvent);
                break;
            case ScrollingTextViewStopRequestEvent.eventId:
                EventBus.getDefault().post((ScrollingTextViewStopRequestEvent) receivedEvent.serializedEvent);
                break;
            case FinalScrollingTextRequestEvent.eventId:
                EventBus.getDefault().post((FinalScrollingTextRequestEvent) receivedEvent.serializedEvent);
                break;
            case IntermediateScrollingTextRequestEvent.eventId:
                EventBus.getDefault().post((IntermediateScrollingTextRequestEvent) receivedEvent.serializedEvent);
                break;
            case TextLineViewRequestEvent.eventId:
                EventBus.getDefault().post((TextLineViewRequestEvent) receivedEvent.serializedEvent);
                break;
            case DisplayCustomContentRequestEvent.eventId:
                EventBus.getDefault().post((DisplayCustomContentRequestEvent) receivedEvent.serializedEvent);

        }
    }

    public void destroy(){
        augmentOsLibBroadcastReceiver.unregister();
        EventBus.getDefault().unregister(this);
    }
}