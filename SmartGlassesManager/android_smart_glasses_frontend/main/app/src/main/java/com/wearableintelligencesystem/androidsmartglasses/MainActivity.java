package com.wearableintelligencesystem.androidsmartglasses;

import android.Manifest;
import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.StrictMode;
import android.text.method.ScrollingMovementMethod;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.navigation.NavController;
import androidx.navigation.fragment.NavHostFragment;

import com.wearableintelligencesystem.androidsmartglasses.BuildConfig;
import com.wearableintelligencesystem.androidsmartglasses.R;
import com.github.mikephil.charting.charts.PieChart;
import com.wearableintelligencesystem.androidsmartglasses.archive.GlboxClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;


public class MainActivity extends AppCompatActivity {
    public WearableAiService mService;
    public boolean mBound = false;

    public static String TAG = "WearableAiDisplay_MainActivity";

    public boolean binding = false; //should we be binding to the service?

    public long commandResolveTime = 8000;
    public long searchEngineResultTimeout = 12000;

    //local ID strings for UI updating
    public final static String ACTION_UI_UPDATE = "com.example.wearableaidisplaymoverio.UI_UPDATE";
    public final static String ACTION_TEXT_REFERENCE = "com.example.wearableaidisplaymoverio.ACTION_TEXT_REFERENCE";
    public final static String PHONE_CONN_STATUS_UPDATE = "com.example.wearableaidisplaymoverio.PHONE_CONN_STATUS_UPDATE";
    public final static String WIFI_CONN_STATUS_UPDATE = "com.example.wearableaidisplaymoverio.WIFI_CONN_STATUS_UPDATE";
    public final static String BATTERY_CHARGING_STATUS_UPDATE = "com.example.wearableaidisplaymoverio.BATTERY_CHARGIN_STATUS_UPDATE";
    public final static String BATTERY_LEVEL_STATUS_UPDATE = "com.example.wearableaidisplaymoverio.BATTERY_LEVEL_STATUS_UPDATE";
    public final static String VOICE_TEXT_RESPONSE = "VOICE_TEXT_RESPONSE";
    public final static String VOICE_TEXT_RESPONSE_TEXT = "VOICE_TEXT_RESPONSE_TEXT";

    //text list ui
    ArrayList<String> textListHolder = new ArrayList<>();
    TextView textListView;

    //text list ui
    private String textBlockHolder = "";
    TextView textBlockView;

    //save current mode
    String curr_mode = "";

    //HUD ui
    private TextView mClockTextView;
    private boolean clockRunning = false;
    private ImageView mWifiStatusImageView;
    private ImageView mPhoneStatusImageView;
    private ImageView mBatteryStatusImageView;

    //device status
    private TextView mBatteryStatusTextView;
    boolean phoneConnected = false;
    boolean wifiConnected;
    boolean batteryFull;
    float batteryLevel;
    boolean batteryCharging = false;

    private Handler uiHandler;
    private Handler clockHandler;
    private Handler navHandler;

    private NavController navController;

    TextView modeStatus;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "onCreate running");

        super.onCreate(savedInstanceState);

        //help us find potential issues in dev
        if (BuildConfig.DEBUG){
            StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder()
                    .detectAll()
                    .penaltyLog()
                    .build());
        }

        //hide top bar
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN);

        //setup ui handler
        uiHandler = new Handler();

        //setup clock handler
        clockHandler = new Handler();

        //setup nav handler
        navHandler = new Handler();

        //set main view
        setContentView(R.layout.activity_main);
        modeStatus = findViewById(R.id.mode_hud);

        //setup the nav bar
//        Log.d(TAG, getSupportFragmentManager().toString());
//        Log.d(TAG, getSupportFragmentManager().getFragments().toString());
////        NavHostFragment navHostFragment = (NavHostFragment) getSupportFragmentManager().findFragmentById(R.id.nav_host_fragment);
//        NavHostFragment navHostFragment = (NavHostFragment) NavHostFragment.findNavController();
//        Log.d(TAG, navHostFragment.toString());
//        navController = navHostFragment.getNavController();
        NavHostFragment navHostFragment = (NavHostFragment) getSupportFragmentManager().findFragmentById(R.id.nav_host_fragment);
        navController = navHostFragment.getNavController();

        //setup main view
        Log.d(TAG, "onCreate switchMode");
        switchMode(MessageTypes.MODE_HOME);

        //setup permissions
        if (ContextCompat.checkSelfPermission(this,
                Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    1234);
        } else {
            //create the WearableAI service if it isn't already running
            startWearableAiService();
        }

    }

    //handle permissions
    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           String permissions[], int[] grantResults) {
        switch (requestCode) {
            case 1234: {
                // If request is cancelled, the result arrays are empty.
                if (grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Log.d("TAG", "User granted audio permissions.");
                    startWearableAiService();
                } else {
                    Log.d("TAG", "permission denied by user");
                }
                return;
            }
        }
    }

    private void turnOffScreen(){
        screenBrightnessControl(0);
    }

    private void turnOnScreen(){
        screenBrightnessControl(-1);
    }

    private void screenBrightnessControl(float brightness){
        //turn screen brightness to 0;
        WindowManager.LayoutParams params = getWindow().getAttributes();
        params.screenBrightness = brightness;
        getWindow().setAttributes(params);
    }

    private void setupHud(){
        //setup clock
        if (! clockRunning) {
            clockRunning = true;
            clockHandler.post(new Runnable() {
                public void run() {
                    // Default time format for current locale, with respect (on API 22+) to user's 12/24-hour
                    // settings. I couldn't find any simple way to respect it back to API 14.
                    //String prettyTime = DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date()) + "-" + DateFormat.getDateInstance(DateFormat.SHORT).format(new Date());
                    String prettyTime = new SimpleDateFormat("h:mm a").format(new Date());
                    mClockTextView = (TextView) findViewById(R.id.clock_text_view);
                    if (mClockTextView != null) {
                        mClockTextView.setText(prettyTime);
                    }
                    clockHandler.postDelayed(this, 1000);
                }
            });
        } else{
            //do just one update so user doesn't have to wait
            String prettyTime = new SimpleDateFormat("h:mm a").format(new Date());
            mClockTextView = (TextView) findViewById(R.id.clock_text_view);
            if (mClockTextView != null) {
                mClockTextView.setText(prettyTime);
            }
        }

        //setup wifi status
        updateWifiHud();

        //setup phone connect status
        updatePhoneHud();

        //setup battery connect status
        updateBatteryHud();
    }

    private void updateWifiHud(){
        mWifiStatusImageView = (ImageView) findViewById(R.id.wifi_image_view);

        if (mWifiStatusImageView == null){
            return;
        }
        //wifiConnected = WifiUtils.checkWifiOnAndConnected(this); //check wifi status - don't need now that we have listener in service
        Drawable wifiOnDrawable = this.getDrawable(R.drawable.ic_wifi_on);
        Drawable wifiOffDrawable = this.getDrawable(R.drawable.ic_wifi_off);
        if (wifiConnected) {
            mWifiStatusImageView.setImageDrawable(wifiOnDrawable);
        } else {
            mWifiStatusImageView.setImageDrawable(wifiOffDrawable);
        }
    }

    private void updatePhoneHud(){
        mPhoneStatusImageView = (ImageView) findViewById(R.id.phone_status_image_view);
        if (mPhoneStatusImageView == null){
            return;
        }
        Drawable phoneOnDrawable = this.getDrawable(R.drawable.ic_phone_connected);
        Drawable phoneOffDrawable = this.getDrawable(R.drawable.ic_phone_disconnected);
        if (phoneConnected) {
            mPhoneStatusImageView.setImageDrawable(phoneOnDrawable);
        } else {
            mPhoneStatusImageView.setImageDrawable(phoneOffDrawable);
        }
    }

    private void updateBatteryHud(){
        //set the icon
        mBatteryStatusImageView = (ImageView) findViewById(R.id.battery_status_image_view);
        if (mBatteryStatusImageView == null){
            return;
        }
        Drawable batteryFullDrawable = this.getDrawable(R.drawable.ic_full_battery);
        Drawable batteryFullChargingDrawable = this.getDrawable(R.drawable.ic_full_battery_charging);
        Drawable batteryLowDrawable = this.getDrawable(R.drawable.ic_low_battery);
        Drawable batteryLowChargingDrawable = this.getDrawable(R.drawable.ic_low_battery_charging);
        if (batteryFull) {
            if (batteryCharging) {
                mBatteryStatusImageView.setImageDrawable(batteryFullChargingDrawable);
            } else {
                mBatteryStatusImageView.setImageDrawable(batteryFullDrawable);
            }
        } else {
            if (batteryCharging) {
                mBatteryStatusImageView.setImageDrawable(batteryLowChargingDrawable);
            } else {
                mBatteryStatusImageView.setImageDrawable(batteryLowDrawable);
            }
        }

        //set the text
        mBatteryStatusTextView = (TextView) findViewById(R.id.battery_percentage_text_view);
        mBatteryStatusTextView.setText((int)batteryLevel + "%");
    }

    private void switchMode(String mode) {
        curr_mode = mode;
        String modeDisplayName = "...";

        //clear any previous ui intentions
        uiHandler.removeCallbacksAndMessages(null);

        if (mode != MessageTypes.MODE_BLANK){
            turnOnScreen();
        }

        switch (mode) {
            case MessageTypes.MODE_BLANK:
                blankUi();
                modeDisplayName = "Blank";
                break;
            case MessageTypes.MODE_LANGUAGE_TRANSLATE:
                navController.navigate(R.id.nav_language_translate);
                modeDisplayName = "Lang.Trans.";
                break;
            case MessageTypes.MODE_OBJECT_TRANSLATE:
                navController.navigate(R.id.nav_object_translate);
                modeDisplayName = "Obj.Trans.";
                break;
            case MessageTypes.MODE_TEXT_LIST:
                setupTextList();
                modeDisplayName = "TextList";
                break;
            case MessageTypes.MODE_TEXT_BLOCK:
                setupTextBlock();
                modeDisplayName = "TextBlock";
                break;
//            case MessageTypes.MODE_REFERENCE_GRID:
//                setContentView(R.layout.image_gridview);
//                modeDisplayName = "Ref.Grid";
//                break;
//            case MessageTypes.MODE_SOCIAL_MODE:
//                setupSocialIntelligenceUi();
//                modeDisplayName = "Social";
//                break;
            case MessageTypes.MODE_HOME:
                navController.navigate(R.id.nav_home_prompt);
                modeDisplayName = "Home";
                break;
            case MessageTypes.MODE_LIVE_LIFE_CAPTIONS:
                navController.navigate(R.id.nav_live_life_captions);
                modeDisplayName = "ScrollingText";
                break;
            case MessageTypes.MODE_CONVERSATION_MODE:
                navController.navigate(R.id.nav_convo_mode);
                modeDisplayName = "Convo";
                break;
            case MessageTypes.MODE_SEARCH_ENGINE_RESULT:
                modeDisplayName = "Card";
            break;
        }

        //set new mode status
        modeStatus.setText(modeDisplayName);

        //registerReceiver(mComputeUpdateReceiver, makeComputeUpdateIntentFilter());
    }

    //generic way to set the current enumerated list of strings and display them, scrollably, on the main UI
    private void setupTextList() {
        //live life captions mode gui setup
        setContentView(R.layout.text_list);

        //setup the text list view
        textListView = (TextView) findViewById(R.id.text_list);
        textListView.setText("");
        for (int i = 0; i < textListHolder.size(); i++) {
            textListView.append(Integer.toString(i+1) + ": " + textListHolder.get(i) + "\n");
        }
        textListView.setPadding(10, 0, 10, 0);
        textListView.setMovementMethod(new ScrollingMovementMethod());
        textListView.setSelected(true);
    }

    //generic way to set the current single string, scrollably, on the main UI
    private void setupTextBlock() {
        //live life captions mode gui setup
        setContentView(R.layout.text_block);

        //setup the text list view
        textBlockView = (TextView) findViewById(R.id.text_block);
        textBlockView.setText(textBlockHolder);
        textBlockView.setPadding(10, 0, 10, 0);
        textBlockView.setMovementMethod(new ScrollingMovementMethod());
        textBlockView.setSelected(true);
    }

    private void blankUi() {
        turnOffScreen();
    }

    @Override
    public void onResume() {
        super.onResume();

        setupHud();

        registerReceiver(mComputeUpdateReceiver, makeComputeUpdateIntentFilter());

        if (binding) {
            bindWearableAiService();
        }
    }

    private void teardownHud() {
        uiHandler.removeCallbacksAndMessages(null);
        clockHandler.removeCallbacksAndMessages(null);
        clockRunning = false;
    }

    @Override
    public void onPause() {
        super.onPause();

        teardownHud();

        if (binding) {
            unbindWearableAiService();
        }

        //unregister receiver
        unregisterReceiver(mComputeUpdateReceiver);
    }

    private static IntentFilter makeComputeUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(GlboxClientSocket.COMMAND_SWITCH_MODE);
        intentFilter.addAction(GlboxClientSocket.ACTION_WIKIPEDIA_RESULT);
        intentFilter.addAction(GlboxClientSocket.ACTION_TRANSLATION_RESULT);
        intentFilter.addAction(GlboxClientSocket.ACTION_VISUAL_SEARCH_RESULT);
        intentFilter.addAction(GlboxClientSocket.ACTION_AFFECTIVE_SUMMARY_RESULT);
        intentFilter.addAction(MessageTypes.FACE_SIGHTING_EVENT);

        intentFilter.addAction(ASPClientSocket.ACTION_AFFECTIVE_MEM_TRANSCRIPT_LIST);
        intentFilter.addAction(ASPClientSocket.ACTION_AFFECTIVE_SEARCH_QUERY);

        intentFilter.addAction(ACTION_UI_UPDATE);
        intentFilter.addAction(ASPClientSocket.ACTION_UI_DATA);

        return intentFilter;
    }

    private final BroadcastReceiver mComputeUpdateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            final String action = intent.getAction();
            if (ASPClientSocket.ACTION_UI_DATA.equals(action)) {
                Log.d(TAG, "THIS SHIT: " + action.toString());
                try {
                    JSONObject data = new JSONObject(intent.getStringExtra(ASPClientSocket.RAW_MESSAGE_JSON_STRING));
                    String typeOf = data.getString(MessageTypes.MESSAGE_TYPE_LOCAL);
                    Log.d(TAG, typeOf);
                    if (typeOf.equals(MessageTypes.SEARCH_ENGINE_RESULT)){
                        showSearchEngineResults(data);
                    } else if (typeOf.equals(MessageTypes.REFERENCE_CARD_SIMPLE_VIEW)){
                        showReferenceCardSimpleView(data);
                    } else if (typeOf.equals(MessageTypes.REFERENCE_CARD_TEXT_WALL_VIEW)){
                        showTextWallView(data);
                    } else if (typeOf.equals(MessageTypes.REFERENCE_CARD_IMAGE_VIEW)){
                        Log.d(TAG, "GOT IMAGE REFERENCE VIEW REQUEST");
                        showReferenceCardImageView(data);
                    } else if (typeOf.equals(MessageTypes.ACTION_SWITCH_MODES)){
                        //parse out the name of the mode
                        String modeName = data.getString(MessageTypes.NEW_MODE);
                        //switch to that mode
                        Log.d(TAG, "ACTION_SWITCH_MODES switchMode");
                        switchMode(modeName);
                    } else if (typeOf.equals(MessageTypes.SCROLLING_TEXT_VIEW_START)){
                        Log.d(TAG, "GOT SCROLL START, Switching");
                        switchMode(MessageTypes.MODE_LIVE_LIFE_CAPTIONS);
                    } else if (typeOf.equals(MessageTypes.SCROLLING_TEXT_VIEW_STOP)){
                        Log.d(TAG, "GOT SCROLL STOP, Switching");
                        switchMode(MessageTypes.MODE_HOME);
                    } else if (typeOf.equals(MessageTypes.VOICE_COMMAND_STREAM_EVENT)) {
                        Log.d(TAG, "GOT VOICE COMMAND STREAM EVENT");
                        showVoiceCommandInterface(data);
                    }
                } catch(JSONException e){
                        e.printStackTrace();
                }
            } else if (ACTION_UI_UPDATE.equals(action)) {
//                Log.d(TAG, "GOT ACTION_UI_UPDATE");
                if (intent.hasExtra(PHONE_CONN_STATUS_UPDATE)) {
                    phoneConnected = intent.getBooleanExtra(PHONE_CONN_STATUS_UPDATE, false);
                    updatePhoneHud();
                }
                if (intent.hasExtra(BATTERY_CHARGING_STATUS_UPDATE)){
                    batteryCharging = intent.getBooleanExtra(BATTERY_CHARGING_STATUS_UPDATE, false);
                    updateBatteryHud();
                }
                if (intent.hasExtra(BATTERY_LEVEL_STATUS_UPDATE)){
                    batteryLevel = intent.getFloatExtra(BATTERY_LEVEL_STATUS_UPDATE, 100f);
                    if (batteryLevel > 30f) {
                        batteryFull = true;
                    } else {
                        batteryFull = false;
                    }
                    updateBatteryHud();
                }
                if (intent.hasExtra(WIFI_CONN_STATUS_UPDATE)){
                    wifiConnected = intent.getBooleanExtra(WIFI_CONN_STATUS_UPDATE, false);
                    updateWifiHud();
                }
            }
        }
    };

    //disable the back button
    @Override
    public void onBackPressed() {
        //do nothing
    }

    /** Defines callbacks for service binding, passed to bindService() */
    private ServiceConnection connection = new ServiceConnection() {

        @Override
        public void onServiceConnected(ComponentName className,
                                       IBinder service) {
            // We've bound to LocalService, cast the IBinder and get LocalService instance
            WearableAiService.LocalBinder binder = (WearableAiService.LocalBinder) service;
            mService = binder.getService();
            mBound = true;

            //get update of ui information
            mService.requestUiUpdate();
            Log.d(TAG, "onServiceConnected complete");
        }

        @Override
        public void onServiceDisconnected(ComponentName arg0) {
            mBound = false;
        }
    };

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        Log.d(TAG, "got keycode");
        Log.d(TAG, Integer.toString(keyCode));
        //broadcast to child fragments that this happened
        final Intent nintent = new Intent();
        nintent.setAction(MessageTypes.SG_TOUCHPAD_EVENT);
        nintent.putExtra(MessageTypes.SG_TOUCHPAD_KEYCODE, keyCode);
        this.sendBroadcast(nintent);

        switch (keyCode) {
            case KeyEvent.KEYCODE_ENTER:
                Log.d(TAG, "keycode _ enter felt");
                return super.onKeyUp(keyCode, event);
            case KeyEvent.KEYCODE_DEL:
                Log.d(TAG, "keycode DEL entered - this means go back home");
                navHandler.removeCallbacksAndMessages(null);
                switchMode(MessageTypes.MODE_HOME);
                return super.onKeyUp(keyCode, event);
            default:
                return super.onKeyUp(keyCode, event);
        }
    }

    // Note  from authour - From what I've seen you don't need the wake-lock or wifi-lock below for the audio-recorder to persist through screen-off.
    // However, to be on the safe side you might want to activate them anyway. (and/or if you have other functions that need them)
    private PowerManager.WakeLock wakeLock_partial = null;
    public void StartPartialWakeLock() {
        if (wakeLock_partial != null && wakeLock_partial.isHeld()) return;
        Log.i("vmain", "Starting partial wake-lock.");
        final PowerManager pm = (PowerManager) this.getApplicationContext().getSystemService(Context.POWER_SERVICE);
        wakeLock_partial = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "com.myapp:partial_wake_lock");
        wakeLock_partial.acquire();
    }

    public void bindWearableAiService(){
        // Bind to that service
        Intent intent = new Intent(this, WearableAiService.class);
        bindService(intent, connection, Context.BIND_AUTO_CREATE);
    }

    public void unbindWearableAiService() {
        // Unind to that service
        unbindService(connection);
    }

    private void showReferenceCard(String title, String body, String imgUrl, long timeout){
        //navHandler.removeCallbacksAndMessages(null);
        uiHandler.removeCallbacksAndMessages(null);
        String lastMode = curr_mode;

        //show the reference
        Bundle args = new Bundle();
        args.putString("title", title);
        args.putString("body", body);
        args.putString("img_url", imgUrl);
        //quickly go home then to result, because if we go straight to the result, it will fail to display results if the nav_reference page is already loaded - this is a hack
//        switchMode(MessageTypes.MODE_HOME);
        navController.navigate(R.id.nav_reference, args);

        //for now, show for n seconds and then return to llc
        uiHandler.postDelayed(new Runnable() {
            public void run() {
                Log.d(TAG, "showReferenceCard switchMode");
                switchMode(MessageTypes.MODE_HOME);
            }
        }, timeout);
    }

    private void showSearchEngineResults(JSONObject data) {
        try {
            //parse out the response object - one result for now
            JSONObject search_engine_result = new JSONObject(data.getString(MessageTypes.SEARCH_ENGINE_RESULT_DATA));

            //get content
            String title = search_engine_result.getString("title");
            String summary = search_engine_result.getString("body");

            //pull image from web and display in imageview
            String img_url = null;
            if (search_engine_result.has("image")) {
                img_url = search_engine_result.getString("image");
            }

            Log.d(TAG, "Running search engine result");
            Log.d(TAG, title);
            Log.d(TAG, summary);
            switchMode(MessageTypes.MODE_SEARCH_ENGINE_RESULT);
            showReferenceCard(title, summary, img_url, searchEngineResultTimeout);
        } catch (JSONException e) {
            Log.d(TAG, e.toString());
            e.printStackTrace();
        }
    }

    private void showReferenceCardSimpleView(JSONObject data) {
        try {
            //get content
            String title = data.getString(MessageTypes.REFERENCE_CARD_SIMPLE_VIEW_TITLE);
            String body = data.getString(MessageTypes.REFERENCE_CARD_SIMPLE_VIEW_BODY);

            Log.d(TAG, "Running reference card simple view");
            Log.d(TAG, title);
            Log.d(TAG, body);
            switchMode(MessageTypes.MODE_SEARCH_ENGINE_RESULT);
            showReferenceCard(title, body, null, searchEngineResultTimeout);
        } catch (JSONException e) {
            Log.d(TAG, e.toString());
        }
    }

    private void showTextWallView(JSONObject data) {
        try {
            //get content
            String text = data.getString(MessageTypes.REFERENCE_CARD_TEXT_WALL_TEXT);

            Log.d(TAG, "Running text wall card simple view");
            Log.d(TAG, text);
            switchMode(MessageTypes.MODE_SEARCH_ENGINE_RESULT);

            uiHandler.removeCallbacksAndMessages(null);
            String lastMode = curr_mode;

            //show the reference
            Bundle args = new Bundle();
            args.putString("text", text);
            //quickly go home then to result, because if we go straight to the result, it will fail to display results if the nav_reference page is already loaded - this is a hack
    //        switchMode(MessageTypes.MODE_HOME);
            navController.navigate(R.id.nav_text_wall, args);

            //for now, show for n seconds and then return to llc
//            uiHandler.postDelayed(new Runnable() {
//                public void run() {
//                    Log.d(TAG, "showReferenceCard switchMode");
//                    switchMode(MessageTypes.MODE_HOME);
//                }
//            }, timeout);
        } catch (JSONException e) {
            Log.d(TAG, e.toString());
        }
    }

    private void showReferenceCardImageView(JSONObject data) {
        try {
            //get content
            String title = data.getString(MessageTypes.REFERENCE_CARD_IMAGE_VIEW_TITLE);
            String body = data.getString(MessageTypes.REFERENCE_CARD_IMAGE_VIEW_BODY);
            String imgUrl = data.getString(MessageTypes.REFERENCE_CARD_IMAGE_VIEW_IMG_URL);

            Log.d(TAG, "Running reference card image view");
            Log.d(TAG, title);
            Log.d(TAG, body);
            switchMode(MessageTypes.MODE_SEARCH_ENGINE_RESULT);
            showReferenceCard(title, body, imgUrl, searchEngineResultTimeout);
        } catch (JSONException e) {
            Log.d(TAG, e.toString());
        }
    }

    //start, stop, handle the service
    public void stopWearableAiService() {
        Log.d(TAG, "Stopping WearableAI service");
        unbindWearableAiService();
        binding = false;

        if (!isMyServiceRunning(WearableAiService.class)) return;
        Intent stopIntent = new Intent(this, WearableAiService.class);
        stopIntent.setAction(WearableAiService.ACTION_STOP_FOREGROUND_SERVICE);
        startService(stopIntent);
    }

    public void sendWearableAiServiceMessage(String message) {
        if (!isMyServiceRunning(WearableAiService.class)) return;
        Intent messageIntent = new Intent(this, WearableAiService.class);
        messageIntent.setAction(message);
        Log.d(TAG, "Sending WearableAi Service this message: " + message);
        startService(messageIntent);
    }

    public void startWearableAiService() {
        Log.d(TAG, "Starting wearableAiService");
        binding = true;
        if (isMyServiceRunning(WearableAiService.class)) return;
        Intent startIntent = new Intent(this, WearableAiService.class);
        startIntent.setAction(WearableAiService.ACTION_START_FOREGROUND_SERVICE);
        startService(startIntent);
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

    private void showVoiceCommandInterface(JSONObject data){
        try{
            String voiceInputType = data.getString(MessageTypes.VOICE_COMMAND_STREAM_EVENT_TYPE);
            Log.d(TAG, voiceInputType);

            //if it told us to cancel the stream

            if (voiceInputType.equals(MessageTypes.CANCEL_EVENT_TYPE)) {
                Log.d(TAG, "CANCEL_EVENT_TYPE switchMode");
                switchMode(MessageTypes.MODE_HOME);
            } else if (voiceInputType.equals(MessageTypes.TEXT_RESPONSE_EVENT_TYPE)){ //if it was a wake word
                String commandResponseDisplayString = data.getString(MessageTypes.COMMAND_RESPONSE_DISPLAY_STRING);

                //send a broadcast to our fragment showing the command result
                final Intent nintent = new Intent();
                nintent.setAction(VOICE_TEXT_RESPONSE);
                nintent.putExtra(VOICE_TEXT_RESPONSE_TEXT, commandResponseDisplayString);
                sendBroadcast(nintent); //eventually, we won't need to use the activity context, as our service will have its own context to send from

                //reset ui so user has time to read answer
                //clear any previous ui intentions
                uiHandler.removeCallbacksAndMessages(null);
                uiHandler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        Log.d(TAG, "TEXT_RESPONSE_EVENT_TYPE switchMode");
                        switchMode(MessageTypes.MODE_HOME);
                    }
                }, commandResolveTime);
            } else if (voiceInputType.equals(MessageTypes.WAKE_WORD_EVENT_TYPE)){ //if it was a wake word
                JSONArray commandList = new JSONArray(data.getString(MessageTypes.VOICE_COMMAND_LIST));
                showPostWakeWordInterface(data.getString(MessageTypes.INPUT_WAKE_WORD), commandList);
            } else if (voiceInputType.equals(MessageTypes.COMMAND_EVENT_TYPE)){ //if it was a wake word
                String argumentExpect = data.getString(MessageTypes.VOICE_ARG_EXPECT_TYPE);
                if (argumentExpect.equals(MessageTypes.VOICE_ARG_EXPECT_NATURAL_LANGUAGE)) {
                    showPostCommandInterface(data.getString(MessageTypes.INPUT_WAKE_WORD), data.getString(MessageTypes.INPUT_VOICE_COMMAND_NAME));
                }
            } else if (voiceInputType.equals(MessageTypes.REQUIRED_ARG_EVENT_TYPE)){ //if it's a required argument we need to show a prompt for
                JSONArray argsList = new JSONArray(data.getString(MessageTypes.ARG_OPTIONS));
                showRequiredArgumentInterface(data.getString(MessageTypes.ARG_NAME), argsList);
            } else if (voiceInputType.equals(MessageTypes.RESOLVE_EVENT_TYPE)){
                boolean status = data.getBoolean(MessageTypes.COMMAND_RESULT);
                String commandResponseDisplayString = data.getString(MessageTypes.COMMAND_RESPONSE_DISPLAY_STRING);
                showCommandResolve(status, commandResponseDisplayString);
            }
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    private void showPostWakeWordInterface(String wakeWord, JSONArray commandOptions){
        //show the reference
        Bundle args = new Bundle();
        args.putString(MessageTypes.VOICE_COMMAND_LIST, commandOptions.toString());
        args.putString(MessageTypes.INPUT_WAKE_WORD, wakeWord);
        uiHandler.removeCallbacksAndMessages(null);
        navController.navigate(R.id.nav_wake_word_post, args);
    }

    private void showRequiredArgumentInterface(String argName, JSONArray argOptions){
        Bundle args = new Bundle();
        args.putString(MessageTypes.ARG_OPTIONS, argOptions.toString());
        args.putString(MessageTypes.ARG_NAME, argName);
        uiHandler.removeCallbacksAndMessages(null);
        navController.navigate(R.id.nav_required_args, args);
    }

    private void showPostCommandInterface(String wakeWord, String selectedCommand){
        Bundle args = new Bundle();
        args.putString(MessageTypes.INPUT_WAKE_WORD, wakeWord);
        args.putString(MessageTypes.INPUT_VOICE_COMMAND_NAME, selectedCommand);
        uiHandler.removeCallbacksAndMessages(null);
        navController.navigate(R.id.nav_command_post, args);
    }

    private void showCommandResolve(boolean success, String message){
        //clear any previous ui intentions
        uiHandler.removeCallbacksAndMessages(null);

        //show the reference
        Bundle args = new Bundle();
        args.putBoolean("success", success);
        args.putString("message", message);
        navController.navigate(R.id.nav_command_resolve, args);

        uiHandler.postDelayed(new Runnable() {
            @Override
            public void run() {

                Log.d(TAG, "showCommandResolve switch mode");
                switchMode(MessageTypes.MODE_HOME);
            }
        }, commandResolveTime);
    }
}

