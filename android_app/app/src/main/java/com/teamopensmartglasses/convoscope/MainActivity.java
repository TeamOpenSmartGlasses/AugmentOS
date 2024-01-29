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
package com.teamopensmartglasses.convoscope;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.ActivityManager;
import android.app.AlertDialog;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.IBinder;
import android.provider.ContactsContract;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.fragment.app.FragmentTransaction;

import com.firebase.ui.auth.AuthUI;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.teamopensmartglasses.convoscope.events.SharingContactChangedEvent;
import com.teamopensmartglasses.convoscope.events.ToggleEnableSharingEvent;
import com.teamopensmartglasses.convoscope.events.UserIdChangedEvent;
import com.teamopensmartglasses.convoscope.ui.SettingsUi;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.ASR_FRAMEWORKS;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.SmartGlassesDevice;
import com.teamopensmartglasses.smartglassesmanager.utils.PermissionsUtils;

import org.greenrobot.eventbus.EventBus;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {
  public final String TAG = "Convoscope_MainActivity";
  public ConvoscopeService mService;
  boolean mBound;

  PermissionsUtils permissionsUtils;

  //Permissions
  private static final int PERMISSIONS_REQUEST_RECORD_AUDIO = 1;
  private static final int SEND_SMS_PERMISSION_REQUEST_CODE = 1234;
  private static final int PICK_CONTACT_REQUEST = 1;
  private static final int READ_CONTACTS_PERMISSIONS_REQUEST = 2;
  //UI
  private ResponseTextUiAdapter responseTextUiAdapter;
  private RecyclerView responseRecyclerView;
  private TranscriptTextUiAdapter transcriptTextUiAdapter;
  private RecyclerView transcriptRecyclerView;
  public static final String UI_UPDATE_FULL = "UI_UPDATE_FULL";
  public static final String UI_UPDATE_SINGLE = "UI_UPDATE_SINGLE";
  public static final String UI_UPDATE_FINAL_TRANSCRIPT = "UI_UPDATE_FINAL_TRANSCRIPT";
  public static final String CONVOSCOPE_MESSAGE_STRING = "CONVOSCOPE_MESSAGE_STRING";
  public static final String FINAL_TRANSCRIPT = "FINAL_TRANSCRIPT";
  private SmartGlassesDevice selectedDevice;

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
    final Switch toggleSharingSwitch = findViewById(R.id.toggleSharingSwitch);
    toggleSharingSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
      //EventBus.getDefault().post(new ToggleEnableSharingEvent(isChecked));
      if(isChecked) {
        pickContact();
      }
      else {
        EventBus.getDefault().post(new SharingContactChangedEvent("", ""));
      }
    });

    final Button settingsButton = findViewById(R.id.settings_button);
    settingsButton.setOnClickListener(v -> openSettingsFragment());

    Button pickContactButton = findViewById(R.id.pick_contact_button);
    pickContactButton.setOnClickListener(new View.OnClickListener() {
      @Override
      public void onClick(View v) {
        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_CONTACTS)
                != PackageManager.PERMISSION_GRANTED) {
          ActivityCompat.requestPermissions(MainActivity.this,
                  new String[]{Manifest.permission.READ_CONTACTS},
                  READ_CONTACTS_PERMISSIONS_REQUEST);
        } else {
          pickContact();
        }
      }
    });

    FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
    if (user != null) {
      startConvoscopeService();
    } else {
      Intent intent = new Intent(this, LoginActivity.class);
      startActivity(intent);
    }
  }

  @Override
  public void onStart() {
    super.onStart();

    permissionsUtils = new PermissionsUtils(this, TAG);
    permissionsUtils.getSomePermissions();

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(
          this, new String[] {Manifest.permission.RECORD_AUDIO}, PERMISSIONS_REQUEST_RECORD_AUDIO);
    }

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED) {
      Log.d(TAG, "NO SMS PERM!");
      ActivityCompat.requestPermissions(
              this, new String[] {Manifest.permission.SEND_SMS}, SEND_SMS_PERMISSION_REQUEST_CODE);
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
      case READ_CONTACTS_PERMISSIONS_REQUEST:
        if (grantResults.length > 0 &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED) {
          pickContact();
        } else {
          Toast.makeText(this, "Permission to read contacts denied", Toast.LENGTH_SHORT).show();
        }
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

    if (isMyServiceRunning(ConvoscopeService.class)) {
      //bind to WearableAi service
      bindConvoscopeService();

      //ask the service to send us all the Convoscope responses
      if (mService != null) {
        mService.sendUiUpdateFull();
      }
    }
  }

  @Override
  protected void onPause() {
    super.onPause();

    //unbind wearableAi service
    unbindConvoscopeService();

    //unregister receiver
    unregisterReceiver(mMainServiceReceiver);
  }

  public void stopConvoscopeService() {
    unbindConvoscopeService();
    if (!isMyServiceRunning(ConvoscopeService.class)) return;
    Intent stopIntent = new Intent(this, ConvoscopeService.class);
    stopIntent.setAction(ConvoscopeService.ACTION_STOP_FOREGROUND_SERVICE);
    startService(stopIntent);
  }

  public void sendConvoscopeServiceMessage(String message) {
    if (!isMyServiceRunning(ConvoscopeService.class)) return;
    Intent messageIntent = new Intent(this, ConvoscopeService.class);
    messageIntent.setAction(message);
    startService(messageIntent);
  }

  public void startConvoscopeService() {
    if (isMyServiceRunning(ConvoscopeService.class)){
      Log.d(TAG, "Not starting Convoscope service because it's already started.");
      return;
    }

    Log.d(TAG, "Starting Convoscope service.");
    Intent startIntent = new Intent(this, ConvoscopeService.class);
    startIntent.setAction(ConvoscopeService.ACTION_START_FOREGROUND_SERVICE);
    startService(startIntent);
    bindConvoscopeService();
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

  public void bindConvoscopeService(){
    if (!mBound){
      Intent intent = new Intent(this, ConvoscopeService.class);
      bindService(intent, convoscopeAppServiceConnection, Context.BIND_AUTO_CREATE);
    }
  }

  public void unbindConvoscopeService() {
    if (mBound){
      unbindService(convoscopeAppServiceConnection);
      mBound = false;
    }
  }

  /** Defines callbacks for service binding, passed to bindService() */
  private ServiceConnection convoscopeAppServiceConnection = new ServiceConnection() {
    @Override
    public void onServiceConnected(ComponentName className,
                                   IBinder service) {
      // We've bound to LocalService, cast the IBinder and get LocalService instance
      ConvoscopeService.LocalBinder sgmLibServiceBinder = (ConvoscopeService.LocalBinder) service;
      mService = (ConvoscopeService) sgmLibServiceBinder.getService();
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
        String message = intent.getStringExtra(CONVOSCOPE_MESSAGE_STRING);
        if (!message.equals("") && !message.equals(null)) {
          Log.d(TAG, "Got message: " + message);
          addResponseTextBox(message);
        }
      } else if (UI_UPDATE_FULL.equals(action)){
        responseTextUiAdapter.clearTexts();
        ArrayList<String> messages = intent.getStringArrayListExtra(CONVOSCOPE_MESSAGE_STRING);
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

  private void pickContact() {
    Intent pickContactIntent = new Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI);
    startActivityForResult(pickContactIntent, PICK_CONTACT_REQUEST);
  }


  @Override
  protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    if (requestCode == PICK_CONTACT_REQUEST && resultCode == RESULT_OK) {
      Uri contactUri = data.getData();

      // Perform another query to get the contact's details
      Cursor cursor = getContentResolver().query(contactUri, null,
              null, null, null);

      if (cursor != null && cursor.moveToFirst()) {
        String id = cursor.getString(cursor.getColumnIndexOrThrow(ContactsContract.Contacts._ID));

        Cursor phones = getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                null,
                ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = " + id,
                null, null);

        while (phones != null && phones.moveToNext()) {
          @SuppressLint("Range") String phoneNumber = phones.getString(phones.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER));
          @SuppressLint("Range") String name = phones.getString(phones.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME));
          Toast.makeText(this, "Phone number: " + phoneNumber, Toast.LENGTH_LONG).show();
          EventBus.getDefault().post(new SharingContactChangedEvent(name, phoneNumber));
        }

        cursor.close();

        if (phones != null) {
          phones.close();
        }
      }
    }
  }

  // Change UserID button
  public void showTextInputDialog(Context context) {
    AlertDialog.Builder builder = new AlertDialog.Builder(context);
    builder.setTitle("Enter new UserID");

    // Set up the input
    final EditText input = new EditText(context);
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.MATCH_PARENT);
    input.setLayoutParams(lp);
    builder.setView(input);

    // Set up the buttons
    builder.setPositiveButton("OK", new DialogInterface.OnClickListener() {
      @Override
      public void onClick(DialogInterface dialog, int which) {
        String result = input.getText().toString();
        // Use the text result as needed
        handleTextInputResult(result);
      }
    });
    builder.setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
      @Override
      public void onClick(DialogInterface dialog, int which) {
        dialog.cancel();
      }
    });

    builder.show();
  }

  private void handleTextInputResult(String result) {
    // Handle the text input result here
    Toast.makeText(this, "Set UserID to: " + result, Toast.LENGTH_SHORT).show();
    EventBus.getDefault().post(new UserIdChangedEvent(result));
  }

  private void openSettingsFragment() {
    SettingsUi settingsFragment = new SettingsUi();
    FragmentTransaction transaction = getSupportFragmentManager().beginTransaction();
    transaction.replace(R.id.main_container, settingsFragment);
    transaction.addToBackStack(null); // Add to back stack for back button support
    transaction.commit();
  }

  @Override
  public boolean onSupportNavigateUp() {
    onBackPressed();
    return true;
  }

  public void signOut(){
    AuthUI.getInstance()
            .signOut(this)
            .addOnCompleteListener(new OnCompleteListener<Void>() {
              public void onComplete(@NonNull Task<Void> task) {
                Log.d(TAG, "LOGGED OUT");

                Intent intent = new Intent(MainActivity.this, MainActivity.class);
                startActivity(intent);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                finish();
              }
            });
  }
}
