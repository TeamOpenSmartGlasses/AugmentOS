package com.teambandwidth.mxt2;

import androidx.appcompat.app.AppCompatActivity;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;

public class MainActivity extends Activity {
    public final String TAG = "MXT2_MainActivity";
    public MXTService mService;
    Button killServiceButton;
    boolean mBound;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        setupHoldToTalkButton();
        setupTestTTSButton();

        mBound = false;
        startMXTService();
    }

    //setup testing TTS
    public void setupTestTTSButton() {
        Button ttsButton = findViewById(R.id.test_tts_button);

        ttsButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                if (mService != null) {
                    mService.speakTTS("hello, this is a test of the text to speech system running in our Android app. Let's go!");
                }
            }
        });

    }

    //setup hold to talk button
    public void setupHoldToTalkButton(){
        Button holdToTalkButton = findViewById(R.id.hold_to_chat_button);

        holdToTalkButton.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        // Start recording audio
                        Log.d(TAG, "Start chat bro");
                        mService.userStartLLMQuery();
                        return true;
                    case MotionEvent.ACTION_UP:
                        // Stop recording audio and send the message
                        Log.d(TAG, "Stop chat bro");
                        mService.userStopLLMQuery();
                        return true;
                }
                return false;
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();

        //bind to foreground service
        bindMXTService();
    }

    @Override
    protected void onPause() {
        super.onPause();

        //unbind foreground service
        unbindMXTService();
    }

    public void stopMXTService() {
        unbindMXTService();
        if (!isMyServiceRunning(MXTService.class)) return;
        Intent stopIntent = new Intent(this, MXTService.class);
        stopIntent.setAction(MXTService.ACTION_STOP_FOREGROUND_SERVICE);
        startService(stopIntent);
    }

    public void sendMXTServiceMessage(String message) {
        if (!isMyServiceRunning(MXTService.class)) return;
        Intent messageIntent = new Intent(this, MXTService.class);
        messageIntent.setAction(message);
        startService(messageIntent);
    }

    public void startMXTService() {
        if (isMyServiceRunning(MXTService.class)){
            Log.d(TAG, "Not starting MXT service because it's already started.");
            return;
        }

        Log.d(TAG, "Starting MXT service.");
        Intent startIntent = new Intent(this, MXTService.class);
        startIntent.setAction(MXTService.ACTION_START_FOREGROUND_SERVICE);
        startService(startIntent);
        bindMXTService();
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

    public void bindMXTService(){
        if (!mBound){
            Intent intent = new Intent(this, MXTService.class);
            bindService(intent, searchAppServiceConnection, Context.BIND_AUTO_CREATE);
        }
    }

    public void unbindMXTService() {
        if (mBound){
            unbindService(searchAppServiceConnection);
            mBound = false;
        }
    }

    /** Defines callbacks for service binding, passed to bindService() */
    private ServiceConnection searchAppServiceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName className,
                                       IBinder service) {
            // We've bound to LocalService, cast the IBinder and get LocalService instance
            MXTService.LocalBinder sgmLibServiceBinder = (MXTService.LocalBinder) service;
            mService = (MXTService) sgmLibServiceBinder.getService();
            mBound = true;
        }
        @Override
        public void onServiceDisconnected(ComponentName arg0) {
            mBound = false;
        }
    };
}