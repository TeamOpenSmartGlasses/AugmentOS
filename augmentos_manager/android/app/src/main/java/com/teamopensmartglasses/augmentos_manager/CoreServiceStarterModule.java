package com.teamopensmartglasses.augmentos_manager;

import android.content.ComponentName;
import android.content.Intent;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class CoreServiceStarterModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CoreServiceStarter";

    public CoreServiceStarterModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ServiceStarter";
    }

    @ReactMethod
    public void startService() {
        try {
            Intent intent = new Intent();
            intent.setComponent(new ComponentName(
                    "com.teamopensmartglasses.convoscope",
                    "com.teamopensmartglasses.convoscope.AugmentosService"));
            intent.setAction("ACTION_START_CORE");

            Log.d(TAG, "Intent: " + intent.toString());
            Log.d(TAG, "PackageManager resolves service: " +
                    getReactApplicationContext().getPackageManager().resolveService(intent, 0));

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                Log.d(TAG, "Starting service as foreground service");
                getReactApplicationContext().startForegroundService(intent);
                // } else {
                //Log.d(TAG, "Starting service as normal service");
                //getReactApplicationContext().startService(intent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service", e);
        }
    }
    @ReactMethod
    public void stopService() {
        try {
            Intent intent = new Intent();
            intent.setComponent(new ComponentName(
                    "com.teamopensmartglasses.convoscope",
                    "com.teamopensmartglasses.convoscope.AugmentosService"));
            intent.setAction("ACTION_STOP_CORE");

            Log.d(TAG, "Stopping service with intent: " + intent.toString());

            getReactApplicationContext().stopService(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop service", e);
        }
    }

}
