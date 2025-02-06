package com.augmentos.augmentos_manager;

import android.content.ComponentName;
import android.content.Intent;
import android.service.notification.NotificationListenerService;
import android.util.Log;

import com.augmentos.augmentoslib.SmartGlassesAndroidService;
import com.augmentos.augmentoslib.AugmentOSLib;

import org.greenrobot.eventbus.Subscribe;

import org.json.JSONException;
import org.json.JSONObject;

public class ManagerCoreCommsService extends SmartGlassesAndroidService {
    public final String TAG = "ManagerCoreCommsService";

    public AugmentOSLib augmentOSLib;

    public ManagerCoreCommsService() {
        super();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        augmentOSLib = new AugmentOSLib(this);

        augmentOSLib.subscribeCoreToManagerMessages(this::processCoreMessage);

        // Set the service instance for the module
        ManagerCoreCommsServiceModule.setManagerServiceInstance(this);

        sendCommandToCore("{ 'command': 'request_status' }");

        // startNotificationService();
    }


    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy: Called");
        augmentOSLib.deinit();
        ManagerCoreCommsServiceModule.setManagerServiceInstance(null);
        stopNotificationService();
        super.onDestroy();
    }

    public void processCoreMessage(String jsonString){
        Log.d(TAG, "processCoreMessage: " + jsonString);
        if (ManagerCoreCommsServiceModule.getInstance() != null) {
            ManagerCoreCommsServiceModule.getInstance().emitMessageToJS("CoreMessageIntentEvent", jsonString);
        } else {
            Log.w(TAG, "No active ManagerCoreCommsServiceModule instance to emit message.");
        }
    }

    public void sendCommandToCore(String jsonString) {
        Log.d(TAG, "sendCommandToCore: " + jsonString);
        augmentOSLib.sendDataFromManagerToCore(jsonString);
    }

    //
    // Following code is for sending Android user's notifications to puck/glasses:
    //

    private void startNotificationService() {
        Intent notificationServiceIntent = new Intent(this, NotificationService.class);
        startService(notificationServiceIntent);

        NotificationListenerService.requestRebind(
                new ComponentName(this, NotificationService.class));
    }

    private void stopNotificationService() {
        Intent notificationServiceIntent = new Intent(this, NotificationService.class);
        stopService(notificationServiceIntent);
    }

    @Subscribe
    public void onNewNotificationReceivedEvent(NewNotificationReceivedEvent event) {
        try {
            Log.d(TAG, "onNewNotificationReceivedEvent: " + event.toString());
            JSONObject commandObj = new JSONObject();
            JSONObject paramsObj = new JSONObject();
            commandObj.put("command", "phone_notification");
            paramsObj.put("app_name", event.appName);
            paramsObj.put("title", event.title);
            paramsObj.put("text", event.text);
            commandObj.put("params", paramsObj);
            this.sendCommandToCore(commandObj.toString());
        } catch (JSONException e) {
            Log.d(TAG, "Failed to create JSON object from notification event: " + e.toString());
        }
    }

    public void setup() {}
}