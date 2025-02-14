package com.augmentos.augmentos_manager;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.augmentos.augmentos_core.AugmentosService;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import android.content.ComponentName;

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
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, ManagerCoreCommsService.class);
            serviceIntent.setAction("AugmentOSLIB_ACTION_START_FOREGROUND_SERVICE");
            context.startForegroundService(serviceIntent);
            Log.d(TAG, "ManagerCoreCommsService started as foreground service");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start ManagerCoreCommsService", e);
        }
    }

    @ReactMethod
    public void startAugmentosCoreService() {
        try {
            Intent intent = new Intent(getReactApplicationContext(), AugmentosService.class);
            intent.setAction("ACTION_START_CORE");
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getReactApplicationContext().startService(intent);
            }
        } catch (Exception e) {
            Log.e(TAG, "mc: Failed to start core service", e);
        }
    }

    @ReactMethod
    public void stopService() {
        Context context = getReactApplicationContext();
        Intent serviceIntent = new Intent(context, ManagerCoreCommsService.class);
        serviceIntent.setAction("AugmentOSLIB_ACTION_STOP_FOREGROUND_SERVICE");
        context.startService(serviceIntent);
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean isServiceRunning() {
        return managerServiceInstance != null;
    }

    @ReactMethod
    public void sendCommandToCore(String jsonString) {
        if (managerServiceInstance == null) {
            startService();
            startAugmentosCoreService();
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
    @ReactMethod
    public void addListener(String eventName) {
        Log.d(TAG, "addListener: Event listener added for " + eventName);
        // No additional setup required for basic event listeners
    }

    @ReactMethod
    public void removeListeners(int count) {
        Log.d(TAG, "removeListeners: Removed " + count + " listeners");
        // No additional teardown required for basic event listeners
    }
}
