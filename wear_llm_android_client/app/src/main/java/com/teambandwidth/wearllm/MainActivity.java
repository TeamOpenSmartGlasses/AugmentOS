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
import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.IBinder;
import android.text.Html;
import android.text.InputType;
import android.text.method.LinkMovementMethod;
import android.util.Log;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.preference.PreferenceManager;

import com.teambandwidth.wearllm.R;

public class MainActivity extends AppCompatActivity {
  public final String TAG = "WearLLM_MainActivity";
  public WearLLMService mService;
  boolean mBound;

  //Permissions
  private static final int PERMISSIONS_REQUEST_RECORD_AUDIO = 1;

  //UI
  private TextView transcript;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
    transcript = findViewById(R.id.transcript);
    mBound = false;
  }

  @Override
  public void onStart() {
    super.onStart();
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(
          this, new String[] {Manifest.permission.RECORD_AUDIO}, PERMISSIONS_REQUEST_RECORD_AUDIO);
    } else {
      showAPIKeyDialog();
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
          showAPIKeyDialog();
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

  /** The API won't work without a valid API key. This prompts the user to enter one. */
  private void showAPIKeyDialog() {
    LinearLayout contentLayout =
        (LinearLayout) getLayoutInflater().inflate(R.layout.api_key_message, null);
    TextView linkView = contentLayout.findViewById(R.id.api_key_link_view);
    linkView.setText(Html.fromHtml(getString(R.string.api_key_doc_link)));
    linkView.setMovementMethod(LinkMovementMethod.getInstance());
    EditText keyInput = contentLayout.findViewById(R.id.api_key_input);
    keyInput.setInputType(InputType.TYPE_CLASS_TEXT);
    keyInput.setText(getApiKey(this));

//    TextView selectLanguageView = contentLayout.findViewById(R.id.language_locale_view);
//    selectLanguageView.setText(Html.fromHtml(getString(R.string.select_language_message)));
//    selectLanguageView.setMovementMethod(LinkMovementMethod.getInstance());
//    final ArrayAdapter<String> languagesList =
//        new ArrayAdapter<String>(
//            this,
//            android.R.layout.simple_spinner_item,
//            getResources().getStringArray(R.array.languages));

//    Spinner sp = contentLayout.findViewById(R.id.language_locale_spinner);
//    sp.setAdapter(languagesList);
//    sp.setOnItemSelectedListener(
//        new OnItemSelectedListener() {
//          @Override
//          public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
//            handleLanguageChanged(position);
//          }
//
//          @Override
//          public void onNothingSelected(AdapterView<?> parent) {}
//        });
//    sp.setSelection(currentLanguageCodePosition);

    AlertDialog.Builder builder = new AlertDialog.Builder(this);
    builder
        .setTitle(getString(R.string.api_key_message))
        .setView(contentLayout)
        .setPositiveButton(
            getString(android.R.string.ok),
            (dialog, which) -> {
              saveApiKey(this, keyInput.getText().toString().trim());
              //start the main WearLLM backend, if it's not already running
              startWearLLMService();
            })
        .show();
  }

//  /** Handles selecting language by spinner. */
//  private void handleLanguageChanged(int itemPosition) {
//    currentLanguageCodePosition = itemPosition;
//    currentLanguageCode = getResources().getStringArray(R.array.language_locales)[itemPosition];
//  }

  /** Saves the API Key in user shared preference. */
  private static void saveApiKey(Context context, String key) {
    PreferenceManager.getDefaultSharedPreferences(context)
        .edit()
        .putString(context.getResources().getString(R.string.SHARED_PREF_KEY), key)
        .apply();
  }

  /** Gets the API key from shared preference. */
  public static String getApiKey(Context context) {
    return PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_KEY), "");
  }

  @Override
  protected void onResume() {
    super.onResume();

    if (isMyServiceRunning(WearLLMService.class)) {
      //bind to WearableAi service
      bindWearLLMService();
    }
  }

  @Override
  protected void onPause() {
    super.onPause();

    //unbind wearableAi service
    unbindWearLLMService();
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
    }
    @Override
    public void onServiceDisconnected(ComponentName arg0) {
      mBound = false;
    }
  };
}
