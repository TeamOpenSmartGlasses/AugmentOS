package com.teamopensmartglasses.convoscope.tpa;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.ServiceInfo;
import android.util.Log;
import android.content.pm.PackageManager;
import android.widget.Toast;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.teamopensmartglasses.augmentoslib.ThirdPartyApp;
import com.teamopensmartglasses.augmentoslib.events.BulletPointListViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.CommandTriggeredEvent;
import com.teamopensmartglasses.augmentoslib.events.DisplayCustomContentRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.FinalScrollingTextRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.GlassesTapOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.IntermediateScrollingTextRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.KillTpaEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardImageViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardSimpleViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.RegisterCommandRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.RegisterTpaRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStartRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStopRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecFinalOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecIntermediateOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SubscribeDataStreamRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.TextLineViewRequestEvent;
import com.teamopensmartglasses.convoscope.events.TriggerSendStatusToAugmentOsManagerEvent;
import com.teamopensmartglasses.convoscope.tpa.eventbusmessages.TPARequestEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;

import java.lang.reflect.Field;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class TPASystem {
    private String TAG = "WearableAi_TPASystem";
    private Context mContext;
    private AugmentOSLibBroadcastSender augmentOsLibBroadcastSender;
    private AugmentOSLibBroadcastReceiver augmentOsLibBroadcastReceiver;

    private static final String PREFS_NAME = "AugmentOSPrefs";
    private static final String APPS_KEY = "thirdPartyApps";

    private BroadcastReceiver packageInstallReceiver;

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
        setupPackageInstallReceiver();
    }

    private void setupPackageInstallReceiver() {
        packageInstallReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_PACKAGE_ADDED.equals(intent.getAction())) {
                    String packageName = intent.getData().getSchemeSpecificPart();
                    Log.d(TAG, "New app installed: " + packageName);
                    checkIsInstalledPackageNameAugmentOsThirdPartyApp(packageName, context);
                }
            }
        };

        IntentFilter filter = new IntentFilter(Intent.ACTION_PACKAGE_ADDED);
        filter.addDataScheme("package");
        mContext.registerReceiver(packageInstallReceiver, filter);
    }

    private boolean checkIsInstalledPackageNameAugmentOsThirdPartyApp(String packageName, Context context) {
        PackageManager packageManager = context.getPackageManager();
        try {
            PackageInfo packageInfo = packageManager.getPackageInfo(packageName, PackageManager.GET_SERVICES | PackageManager.GET_META_DATA);

            if (packageInfo.services != null) {
                for (ServiceInfo serviceInfo : packageInfo.services) {
                    // Check if this service has metadata indicating it’s an AugmentOS TPA
                    if (serviceInfo.metaData != null && serviceInfo.metaData.getBoolean("com.augmentos.TPA", false)) {
                        Log.d(TAG, "AugmentOS TPA detected: " + packageName);
                        return true;
                    }
                }
            }
            Log.d(TAG, "No AugmentOS components found in app: " + packageName);

        } catch (PackageManager.NameNotFoundException e) {
            Log.e(TAG, "Package not found: " + e.getMessage());
        }
        return false;
    }

    public void startThirdPartyAppByPackageName(String packageName){
        if (isAppInstalled(packageName)) {
            for (ThirdPartyApp tpa : thirdPartyApps) {
                if (tpa.packageName.equals(packageName)) {
                    augmentOsLibBroadcastSender.startThirdPartyApp(tpa);
                }
            }
        } else {
            Log.d(TAG, "App " + packageName + " is not installed. Removing from list.");
            unregisterThirdPartyAppByPackageName(packageName);
        }
    }

    public void stopThirdPartyAppByPackageName(String packageName){
        for (ThirdPartyApp tpa : thirdPartyApps) {
            if (tpa.packageName.equals(packageName)) {
                augmentOsLibBroadcastSender.killThirdPartyApp(tpa);
            }
        }
    }

    public ThirdPartyApp getThirdPartyAppByPackageName(String packageName){
        for (ThirdPartyApp tpa : thirdPartyApps) {
            if (tpa.packageName.equals(packageName)) {
                return tpa;
            }
        }
        return null;
    }

    public void stopAllThirdPartyApps(){
        for (ThirdPartyApp tpa : thirdPartyApps) augmentOsLibBroadcastSender.killThirdPartyApp(tpa);
    }

    public boolean isAppInstalled(String packageName) {
        PackageManager packageManager = mContext.getPackageManager();
        try {
            packageManager.getPackageInfo(packageName, 0);
            return true;  // Package is installed
        } catch (PackageManager.NameNotFoundException e) {
            return false;  // Package not installed
        }
    }

    @Subscribe
    public void onRegisterTpaRequestEvent(RegisterTpaRequestEvent e){
        registerThirdPartyApp((ThirdPartyApp) e.thirdPartyApp);
    }

    @Subscribe
    public void onCommandTriggeredEvent(CommandTriggeredEvent receivedEvent){
        // TODO: Sort out new implementatation
        //        Log.d(TAG, "Command was triggered: " + receivedEvent.command.getName());
//        AugmentOSCommand command = receivedEvent.command;
//        String args = receivedEvent.args;
//        long commandTriggeredTime = receivedEvent.commandTriggeredTime;
//        if (command != null) {
//            if (command.packageName != null){
//                augmentOsLibBroadcastSender.sendEventToTPAs(CommandTriggeredEvent.eventId, new CommandTriggeredEvent(command, args, commandTriggeredTime));
//            }
//        }
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

//    @Subscribe
//    public void onFocusChanged(FocusChangedEvent receivedEvent) {
//        augmentOsLibBroadcastSender.sendEventToTPAs(FocusChangedEvent.eventId, receivedEvent, receivedEvent.appPackage);
//    }

    @Subscribe
    public void onFinalTranscript(SpeechRecFinalOutputEvent event){
        boolean tpaIsSubscribed = true; //TODO: Hash out implementation
        if(tpaIsSubscribed){
            augmentOsLibBroadcastSender.sendEventToTPAs(SpeechRecFinalOutputEvent.eventId, event);
        }
    }

    @Subscribe
    public void onTranscript(SpeechRecOutputEvent event){
        boolean tpaIsSubscribed = true;
        if(tpaIsSubscribed){
            augmentOsLibBroadcastSender.sendEventToTPAs(SpeechRecOutputEvent.eventId, event);
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
        ThirdPartyApp oldTpa = getThirdPartyAppByPackageName(app.packageName);
        if (oldTpa != null) {
            Log.d(TAG, "Replacing third party app:" + app.packageName);
            Toast.makeText(mContext, "Replacing third party app:" + app.packageName, Toast.LENGTH_LONG);
            thirdPartyApps.remove(oldTpa);
        }

        thirdPartyApps.add(app);
        saveThirdPartyAppsToStorage();

        // TODO: Evaluate if we should be doing this
        // Manually triggering these status updates seems like it will lead to chaotic spaghetti slot
        // I *think* status updates should be 99% manager-controlled, basically REST API pattern.
        // EventBus.getDefault().post(new TriggerSendStatusToAugmentOsManagerEvent());
    }

    public void unregisterThirdPartyApp(ThirdPartyApp app) {
        thirdPartyApps.remove(app);
        saveThirdPartyAppsToStorage();
    }

    private void unregisterThirdPartyAppByPackageName(String packageName) {
        for (ThirdPartyApp tpa : thirdPartyApps) {
            if (tpa.packageName.equals(packageName)) {
                unregisterThirdPartyApp(tpa);
                break;
            }
        }
    }

    private void saveThirdPartyAppsToStorage() {
        // Convert the list to JSON and save to SharedPreferences
        String json = gson.toJson(thirdPartyApps);
        sharedPreferences.edit().putString(APPS_KEY, json).apply();
    }

    public void loadThirdPartyAppsFromStorage() {
        String json = sharedPreferences.getString(APPS_KEY, null);
        if (json != null) {
            Type type = new TypeToken<ArrayList<ThirdPartyApp>>() {}.getType();
            ArrayList<ThirdPartyApp> loadedApps = gson.fromJson(json, type);

            // Filter out uninstalled apps
            thirdPartyApps = new ArrayList<>();
            for (ThirdPartyApp app : loadedApps) {
                if (isAppInstalled(app.packageName)) {
                    thirdPartyApps.add(app);
                } else {
                    Log.d(TAG, "App not installed: " + app.packageName + ", removing from list.");
                }
            }

            // Save the filtered list back to storage
            saveThirdPartyAppsToStorage();
        } else {
            thirdPartyApps = new ArrayList<>();
        }

        // Now, check if there are any installed TPAs that we haven't registered yet
        ArrayList<String> preinstalledPackageNames = getAllInstalledPackageNames(mContext);
        for (String packageName : preinstalledPackageNames){
            if(checkIsInstalledPackageNameAugmentOsThirdPartyApp(packageName, mContext)) {
                if (getThirdPartyAppByPackageName(packageName) != null) {
                    // TODO: In the future, do something graceful to automatically populate TPA information.
                    Log.d(TAG, "Discovered an unregistered TPA on device: " + packageName);
                    Toast.makeText(mContext, "Discovered an unregistered TPA on device: " + packageName, Toast.LENGTH_LONG);
                    // ThirdPartyApp discoveredTpa = new ThirdPartyApp();
                }
            }
        }
    }

    public static ArrayList<String> getAllInstalledPackageNames(Context context) {
        ArrayList<String> packageNames = new ArrayList<>();
        PackageManager packageManager = context.getPackageManager();
        List<PackageInfo> packages = packageManager.getInstalledPackages(0);

        for (PackageInfo packageInfo : packages) {
            packageNames.add(packageInfo.packageName);
        }

        return packageNames;
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
            case RegisterTpaRequestEvent.eventId:
                Log.d(TAG, "Resending register TPA request event");
                EventBus.getDefault().post((RegisterTpaRequestEvent) receivedEvent.serializedEvent);
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
        mContext.unregisterReceiver(packageInstallReceiver);
        EventBus.getDefault().unregister(this);
    }
}