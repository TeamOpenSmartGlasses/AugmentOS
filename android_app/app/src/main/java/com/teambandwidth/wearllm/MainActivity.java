/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.teambandwidth.wearllm;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.IBinder;
import android.text.Html;
import android.text.InputType;
import android.text.method.LinkMovementMethod;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.preference.PreferenceManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {
  public final String TAG = "WearLLM_MainActivity";
  public WearLLMService mService;
  boolean mBound;

  //Permissions
  private static final int PERMISSIONS_REQUEST_RECORD_AUDIO = 1;

  //UI
  private ResponseTextUiAdapter responseTextUiAdapter;
  private RecyclerView responseRecyclerView;
  private TranscriptTextUiAdapter transcriptTextUiAdapter;
  private RecyclerView transcriptRecyclerView;
  public static final String UI_UPDATE_FULL = "UI_UPDATE_FULL";
  public static final String UI_UPDATE_SINGLE = "UI_UPDATE_SINGLE";
  public static final String UI_UPDATE_FINAL_TRANSCRIPT = "UI_UPDATE_FINAL_TRANSCRIPT";
  public static final String WEARLLM_MESSAGE_STRING = "WEARLLM_MESSAGE_STRING";
  public static final String FINAL_TRANSCRIPT = "FINAL_TRANSCRIPT";

  @SuppressLint("ClickableViewAccessibility")
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
    mBound = false;

    //setup UI
    responseRecyclerView = findViewById(R.id.recyclerView);
    responseRecyclerView.setLayoutManager(new LinearLayoutManager(this));
    responseTextUiAdapter = new ResponseTextUiAdapter(new ArrayList<>());
    responseRecyclerView.setAdapter(responseTextUiAdapter);
    transcriptRecyclerView = findViewById(R.id.rawTranscriptsRecyclerView);
    transcriptRecyclerView.setLayoutManager(new LinearLayoutManager(this));
    transcriptTextUiAdapter = new TranscriptTextUiAdapter(new ArrayList<>());
    transcriptRecyclerView.setAdapter(transcriptTextUiAdapter);

    //buttons
    final Button llmButton = findViewById(R.id.llmButton);
    llmButton.setOnTouchListener(new View.OnTouchListener() {
      @Override
      public boolean onTouch(View v, MotionEvent event) {
        switch (event.getAction()) {
          case MotionEvent.ACTION_DOWN:
            Log.d(TAG, "Button down.");
            if (mService != null) {
              mService.buttonDownEvent(0, false);
            }
            break;
          case MotionEvent.ACTION_UP:
            Log.d(TAG, "Button up.");
            if (mService != null) {
              mService.buttonDownEvent(0, true);
            }
            break;
        }
        return true;
      }
    });

    //start the main WearLLM backend, if it's not already running
    startWearLLMService();

    //debug
//    for (int i = 0; i < 25; i++) {
//      addResponseTextBox("this is a text box");
//    }
  }

  @Override
  public void onStart() {
    super.onStart();
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(
          this, new String[] {Manifest.permission.RECORD_AUDIO}, PERMISSIONS_REQUEST_RECORD_AUDIO);
    }
  }

  @Override
  public void onStop() {
    super.onStop();
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
  }

  @Override
  public void onRequestPermissionsResult(
      int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    switch (requestCode) {
      case PERMISSIONS_REQUEST_RECORD_AUDIO:
        // If request is cancelled, the result arrays are empty.
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
//          showAPIKeyDialog();
        } else {
          // This should nag user again if they launch without the permissions.
          Toast.makeText(
                  this,
                  "This app does not work without the Microphone permission.",
                  Toast.LENGTH_SHORT)
              .show();
          finish();
        }
        return;
      default: // Should not happen. Something we did not request.
    }
  }

  @Override
  protected void onResume() {
    super.onResume();

    //register receiver that gets data from the service
    registerReceiver(mMainServiceReceiver, makeMainServiceReceiverIntentFilter());

    //scroll to bottom of scrolling UIs
    responseRecyclerView.scrollToPosition(responseTextUiAdapter.getItemCount() - 1);
    transcriptRecyclerView.scrollToPosition(transcriptTextUiAdapter.getItemCount() - 1);

    if (isMyServiceRunning(WearLLMService.class)) {
      //bind to WearableAi service
      bindWearLLMService();

      //ask the service to send us all the WearLLM responses
      if (mService != null) {
        mService.sendUiUpdateFull();
      }
    }
  }

  @Override
  protected void onPause() {
    super.onPause();

    //unbind wearableAi service
    unbindWearLLMService();

    //unregister receiver
    unregisterReceiver(mMainServiceReceiver);
  }

  public void stopWearLLMService() {
    unbindWearLLMService();
    if (!isMyServiceRunning(WearLLMService.class)) return;
    Intent stopIntent = new Intent(this, WearLLMService.class);
    stopIntent.setAction(WearLLMService.ACTION_STOP_FOREGROUND_SERVICE);
    startService(stopIntent);
  }

  public void sendWearLLMServiceMessage(String message) {
    if (!isMyServiceRunning(WearLLMService.class)) return;
    Intent messageIntent = new Intent(this, WearLLMService.class);
    messageIntent.setAction(message);
    startService(messageIntent);
  }

  public void startWearLLMService() {
    if (isMyServiceRunning(WearLLMService.class)){
      Log.d(TAG, "Not starting WearLLM service because it's already started.");
      return;
    }

    Log.d(TAG, "Starting WearLLM service.");
    Intent startIntent = new Intent(this, WearLLMService.class);
    startIntent.setAction(WearLLMService.ACTION_START_FOREGROUND_SERVICE);
    startService(startIntent);
    bindWearLLMService();
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

  public void bindWearLLMService(){
    if (!mBound){
      Intent intent = new Intent(this, WearLLMService.class);
      bindService(intent, wearLLMAppServiceConnection, Context.BIND_AUTO_CREATE);
    }
  }

  public void unbindWearLLMService() {
    if (mBound){
      unbindService(wearLLMAppServiceConnection);
      mBound = false;
    }
  }

  /** Defines callbacks for service binding, passed to bindService() */
  private ServiceConnection wearLLMAppServiceConnection = new ServiceConnection() {
    @Override
    public void onServiceConnected(ComponentName className,
                                   IBinder service) {
      // We've bound to LocalService, cast the IBinder and get LocalService instance
      WearLLMService.LocalBinder sgmLibServiceBinder = (WearLLMService.LocalBinder) service;
      mService = (WearLLMService) sgmLibServiceBinder.getService();
      mBound = true;

      //get update for UI
      mService.sendUiUpdateFull();
    }
    @Override
    public void onServiceDisconnected(ComponentName arg0) {
      mBound = false;
    }
  };

  //UI
  private static IntentFilter makeMainServiceReceiverIntentFilter() {
    final IntentFilter intentFilter = new IntentFilter();
    intentFilter.addAction(UI_UPDATE_FULL);
    intentFilter.addAction(UI_UPDATE_SINGLE);
    intentFilter.addAction(UI_UPDATE_FINAL_TRANSCRIPT);

    return intentFilter;
  }

  private final BroadcastReceiver mMainServiceReceiver = new BroadcastReceiver() {
    @Override
    public void onReceive(Context context, Intent intent) {
      final String action = intent.getAction();
      if (UI_UPDATE_SINGLE.equals(action)) {
        String message = intent.getStringExtra(WEARLLM_MESSAGE_STRING);
        if (!message.equals("") && !message.equals(null)) {
          Log.d(TAG, "Got message: " + message);
          addResponseTextBox(message);
        }
      } else if (UI_UPDATE_FULL.equals(action)){
        responseTextUiAdapter.clearTexts();
        ArrayList<String> messages = intent.getStringArrayListExtra(WEARLLM_MESSAGE_STRING);
        for(String message : messages) {
          addResponseTextBox(message);
        }
      } else if (UI_UPDATE_FINAL_TRANSCRIPT.equals(action)){
        String transcript = intent.getStringExtra(FINAL_TRANSCRIPT);
        addTranscriptTextBox(transcript);
      }
    }
  };

  // Call this method to add a new text box to the list
  public void addResponseTextBox(String text) {
    responseTextUiAdapter.addText(text);
    responseRecyclerView.smoothScrollToPosition(responseTextUiAdapter.getItemCount() - 1);
  }

  // Call this method to add a new text box to the list
  public void addTranscriptTextBox(String text) {
    transcriptTextUiAdapter.addText(text);
    transcriptRecyclerView.smoothScrollToPosition(transcriptTextUiAdapter.getItemCount() - 1);
  }


}
