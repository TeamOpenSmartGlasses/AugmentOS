package com.teamopensmartglasses.augmentos_manager;


import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class NotificationServiceModule extends ReactContextBaseJavaModule {

    private static final String TAG = "NotificationServiceUtils";
    private static ReactApplicationContext reactContext;


    public NotificationServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

    }

    @Override
    public String getName() {
        return "NotificationServiceUtils";
    }

    // Method to check if Notification Listener is enabled
    @ReactMethod
    public void isNotificationListenerEnabled(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            String enabledListeners = Settings.Secure.getString(
                    context.getContentResolver(),
                    "enabled_notification_listeners"
            );
            ComponentName myListener = new ComponentName(context, NotificationService.class);
            boolean isEnabled = enabledListeners != null && enabledListeners.contains(myListener.flattenToString());
            promise.resolve(isEnabled);
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    // Method to start the Notification Listener Service
    @ReactMethod
    public void startNotificationListenerService(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, NotificationService.class);
            context.startService(serviceIntent);
            promise.resolve("Service started successfully.");
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    // Method to stop the Notification Listener Service
    @ReactMethod
    public void stopNotificationListenerService(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, NotificationService.class);
            context.stopService(serviceIntent);
            promise.resolve("Service stopped successfully.");
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    // Send notifications to React Native
    public void sendNotificationToJS(String jsonString) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onNotificationPosted", jsonString);
    }

    // Callback for the Notification Listener Service
    public void onNotificationPosted(String jsonString) {
        // String packageName = sbn.getPackageName();
        // String title = sbn.getNotification().extras.getString("android.title");
        // String text = sbn.getNotification().extras.getString("android.text");

        Log.d(TAG, "Notification received: " + jsonString);
        sendNotificationToJS(jsonString);
    }
}