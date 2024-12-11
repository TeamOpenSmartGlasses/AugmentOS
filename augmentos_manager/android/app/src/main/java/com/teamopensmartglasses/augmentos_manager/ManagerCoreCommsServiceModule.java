package com.teamopensmartglasses.augmentos_manager;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class ManagerCoreCommsServiceModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ManagerCoreCommsServiceModule";
    private final ReactApplicationContext reactContext;
    private static ManagerCoreCommsService managerServiceInstance;
    private static ManagerCoreCommsServiceModule moduleInstance;

    public ManagerCoreCommsServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        moduleInstance = this;
    }

    @Override
    public String getName() {
        return "ManagerCoreCommsService";
    }

    public static ManagerCoreCommsServiceModule getInstance() {
        return moduleInstance;
    }

    @ReactMethod
    public void startService() {
        // Context context = getReactApplicationContext();
        // Intent serviceIntent = new Intent(context, ManagerCoreCommsService.class);
        // context.startService(serviceIntent);
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, ManagerCoreCommsService.class);
            //serviceIntent.setAction("AugmentOSLIB_ACTION_START_FOREGROUND_SERVICE");
            serviceIntent.setAction("AugmentOSLIB_ACTION_START_FOREGROUND_SERVICE");
            //serviceIntent.putExtra("tpaAction", "AugmentOSLIB_ACTION_START_FOREGROUND_SERVICE");
            context.startForegroundService(serviceIntent);
            Log.d(TAG, "ManagerCoreCommsService started as foreground service");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start ManagerCoreCommsService", e);
        }
    }

    @ReactMethod
    public void stopService() {
        Context context = getReactApplicationContext();
        Intent serviceIntent = new Intent(context, ManagerCoreCommsService.class);
        context.stopService(serviceIntent);
    }

    @ReactMethod
    public void sendCommandToCore(String jsonString) {
        if (managerServiceInstance == null) {
        //    startService();
        }

        if (managerServiceInstance != null) {
            managerServiceInstance.sendCommandToCore(jsonString);
        } else {
            Log.e(TAG, "ManagerCoreCommsService instance is null");
        }
    }

    public static void setManagerServiceInstance(ManagerCoreCommsService instance) {
        managerServiceInstance = instance;
    }

    public void emitMessageToJS(String eventName, String message) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, message);
        }
    }

        // AddListener Implementation
        public void addListener(String eventName) {
            Log.d(TAG, "addListener: Event listener added for " + eventName);
            // No additional setup required for basic event listeners
        }
    
        public void removeListeners(int count) {
            Log.d(TAG, "removeListeners: Removed " + count + " listeners");
            // No additional teardown required for basic event listeners
        }
}
