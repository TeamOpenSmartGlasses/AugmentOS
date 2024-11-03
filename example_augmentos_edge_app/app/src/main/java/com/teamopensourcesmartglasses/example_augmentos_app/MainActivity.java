package com.teamopensourcesmartglasses.example_augmentos_app;

import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import android.os.IBinder;
import android.util.Log;

import com.teamopensourcesmartglasses.example_augmentos_app.databinding.ActivityMainBinding;


public class MainActivity extends AppCompatActivity {

    private final String TAG = "ExampleAugmentosApp_MainActivity";
    boolean mBound;
    public ExampleAugmentosAppService mService;
    private ActivityMainBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        setSupportActionBar(binding.toolbar);

        startService();
    }

    /* AugmentOSLib */
    @Override
    protected void onResume() {
        super.onResume();

        //bind to foreground service
        bindService();
    }

    @Override
    protected void onPause() {
        super.onPause();

        //unbind foreground service
        unbindService();
    }

    public void stopService() {
        unbindService();
        if (!isMyServiceRunning(ExampleAugmentosAppService.class)) return;
        Intent stopIntent = new Intent(this, ExampleAugmentosAppService.class);
        stopIntent.setAction(ExampleAugmentosAppService.ACTION_STOP_FOREGROUND_SERVICE);
        startService(stopIntent);
    }

    public void startService() {
        if (isMyServiceRunning(ExampleAugmentosAppService.class)){
            Log.d(TAG, "Not starting service.");
            return;
        }
        Log.d(TAG, "Starting service.");
        Intent startIntent = new Intent(this, ExampleAugmentosAppService.class);
        startIntent.setAction(ExampleAugmentosAppService.ACTION_START_FOREGROUND_SERVICE);
        startService(startIntent);
        bindService();
    }

    //check if service is running
    private boolean isMyServiceRunning(Class<?> serviceClass) {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }

    public void bindService(){
        if (!mBound){
            Intent intent = new Intent(this, ExampleAugmentosAppService.class);
            bindService(intent, appServiceConnection, Context.BIND_AUTO_CREATE);
        }
    }

    public void unbindService() {
        if (mBound){
            unbindService(appServiceConnection);
            mBound = false;
        }
    }

    /** Defines callbacks for service binding, passed to bindService() */
    private ServiceConnection appServiceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName className,
                                       IBinder service) {
            // We've bound to LocalService, cast the IBinder and get LocalService instance
            ExampleAugmentosAppService.LocalBinder augmentosLibServiceBinder = (ExampleAugmentosAppService.LocalBinder) service;
            mService = (ExampleAugmentosAppService) augmentosLibServiceBinder.getService();
            mBound = true;
        }
        @Override
        public void onServiceDisconnected(ComponentName arg0) {
            mBound = false;
        }
    };
}