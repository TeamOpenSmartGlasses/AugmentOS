package com.teamopensmartglasses.augmentoslibdebugapp;

import androidx.appcompat.app.AppCompatActivity;

import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;
import android.view.View;

public class MainActivity extends AppCompatActivity {
    public final String TAG = "SGMLibDebugApp_MainActivity";

    boolean mBound; //remembers if we've bound to our foreground service
    public SgmLibDebugAppService mService; //holds our service

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        mBound = false;

        startSgmLibService();
    }

    @Override
    protected void onResume() {
        super.onResume();

        //bind to foreground service
        bindSgmLibDebugAppService();
    }

    @Override
    protected void onPause() {
        super.onPause();

        //unbind foreground service
        unbindSgmLibDebugAppService();
    }

    public void stopSgmLibService() {
        unbindSgmLibDebugAppService();
        if (!isMyServiceRunning(SgmLibDebugAppService.class)) return;
        Intent stopIntent = new Intent(this, SgmLibDebugAppService.class);
        stopIntent.setAction(SgmLibDebugAppService.ACTION_STOP_FOREGROUND_SERVICE);
        startService(stopIntent);
    }

    public void sendSgmLibServiceMessage(String message) {
        if (!isMyServiceRunning(SgmLibDebugAppService.class)) return;
        Intent messageIntent = new Intent(this, SgmLibDebugAppService.class);
        messageIntent.setAction(message);
        startService(messageIntent);
    }

    public void startSgmLibService() {
        if (isMyServiceRunning(SgmLibDebugAppService.class)){
            Log.d(TAG, "Not starting service.");
            return;
        }
        Log.d(TAG, "Starting service.");
        Intent startIntent = new Intent(this, SgmLibDebugAppService.class);
        startIntent.setAction(SgmLibDebugAppService.ACTION_START_FOREGROUND_SERVICE);
        startService(startIntent);
        bindSgmLibDebugAppService();
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

    public void bindSgmLibDebugAppService(){
        if (!mBound){
            Intent intent = new Intent(this, SgmLibDebugAppService.class);
            bindService(intent, sgmLibServiceConnection, Context.BIND_AUTO_CREATE);
        }
    }

    public void unbindSgmLibDebugAppService() {
        if (mBound){
            unbindService(sgmLibServiceConnection);
            mBound = false;
        }
    }

    /** Defines callbacks for service binding, passed to bindService() */
    private ServiceConnection sgmLibServiceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName className,
                                       IBinder service) {
            // We've bound to LocalService, cast the IBinder and get LocalService instance
            SgmLibDebugAppService.LocalBinder sgmLibServiceBinder = (SgmLibDebugAppService.LocalBinder) service;
            mService = (SgmLibDebugAppService) sgmLibServiceBinder.getService();
            mBound = true;
        }
        @Override
        public void onServiceDisconnected(ComponentName arg0) {
            mBound = false;
        }
    };

    public void broadcastTestClicked(View v) {
        Log.d(TAG, "Pressed 'Test Broadcast' button.");
        if (mService != null) {
//            mService.sgmLib.sendReferenceCard("TPA Button Clicked", "Button was clicked. This is the content body of a card that was sent from a TPA using the SGMLib.");
            String [] strArr = {"bullet 1", "tpa bullet 2 this is a long one, what will happen?", "tpa bullet 3", "wise guy 4"};
            mService.sgmLib.sendBulletPointList("Bullet point TPA test", strArr);
        }
    }

    public void killServiceClicked(View v) {
        Log.d(TAG, "Pressed 'Killed Service' button.");
        stopSgmLibService();
    }

    public void ttsTestClicked(View v) {
        Log.d(TAG, "Pressed 'Test TTS' button.");
        if (sgmLibServiceConnection != null) {
            mService.sgmLib.sendTextLine("this is a test of SGM TTS");
        }
    }
}