package com.teamopensmartglasses.example_smart_glasses_app;

import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.navigation.NavController;
import androidx.navigation.fragment.NavHostFragment;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.teamopensmartglasses.smartglassesmanager.comms.MessageTypes;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.ASR_FRAMEWORKS;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.AudioWearable;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.InmoAirOne;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.SmartGlassesDevice;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.TCLRayNeoXTwo;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.VuzixShield;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.VuzixUltralite;
import com.teamopensmartglasses.smartglassesmanager.utils.PermissionsUtils;

/** This provides a simple UI for users to connect and setup their glasses. This activity launches the service which does all of the work to communicate with glasses and third party apps. **/
public class MainActivity extends AppCompatActivity {
    private  final String TAG = "SGM_ExampleApp_MainActivity";

    //the smart glasses we're currently connecting and communicating with
    public SmartGlassesDevice selectedDevice;

    //handle the foreground service which does all of the important stuff
    public SmartGlassesService mService;
    boolean mBound = false;

    //handle permissions
    PermissionsUtils permissionsUtils;

    //UI - bottom nav bar
    private BottomNavigationView bottomNavigation;
    private NavController navController;

    //list of glasses we support
    public SmartGlassesDevice [] smartGlassesDevices;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mBound = false;

        //setup action bar
        Toolbar myToolbar = (Toolbar) findViewById(R.id.main_toolbar);
        setSupportActionBar(myToolbar);

        //set main view
        setContentView(R.layout.activity_main);

        //setup the available smart glasses we support
        smartGlassesDevices = new SmartGlassesDevice[]{new VuzixShield(), new InmoAirOne(), new TCLRayNeoXTwo(), new VuzixUltralite(), new AudioWearable()};

        //setup the nav bar
        NavHostFragment navHostFragment = (NavHostFragment) getSupportFragmentManager().findFragmentById(R.id.nav_host_fragment);
        Log.d(TAG, getSupportFragmentManager().getFragments().toString());
        navController = navHostFragment.getNavController();

        //get permissions
        permissionsUtils = new PermissionsUtils(this, TAG);
        permissionsUtils.getSomePermissions();
    }

    private static IntentFilter makeMainServiceReceiverIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(MessageTypes.GLASSES_STATUS_UPDATE);

        return intentFilter;
    }

    private final BroadcastReceiver mMainServiceReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            final String action = intent.getAction();
            if (MessageTypes.GLASSES_STATUS_UPDATE.equals(action)) {
                int glassesConnectionState = intent.getIntExtra(MessageTypes.CONNECTION_GLASSES_STATUS_UPDATE, -1);
                SmartGlassesDevice smartGlassesDevice = (SmartGlassesDevice) intent.getSerializableExtra(MessageTypes.CONNECTION_GLASSES_GLASSES_OBJECT);
                updateGlassesConnectionState(glassesConnectionState, smartGlassesDevice);
            }
        }
    };

    public void updateGlassesConnectionState(int glassesConnectionState, SmartGlassesDevice smartGlassesDevice){
        selectedDevice = smartGlassesDevice;
        if (selectedDevice != null) {
            selectedDevice.setConnectionState(glassesConnectionState);
        }

        //show connection page
        if (glassesConnectionState == 2){
            navController.navigate(R.id.nav_connected_to_smart_glasses);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        //register receiver that gets data from the service
        registerReceiver(mMainServiceReceiver, makeMainServiceReceiverIntentFilter());

        if (isMyServiceRunning(SmartGlassesService.class)) {
            //bind to Smart Glasses service
            bindSmartGlassesService();

            //ask the service to send us information about the connection
            if (mService != null) {
                mService.sendUiUpdate();
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();

        //unbind wearableAi service
        unbindSmartGlassesService();

        //unregister receiver
        unregisterReceiver(mMainServiceReceiver);
    }

    public void stopSmartGlassesService() {
        Log.d(TAG, "Stopping SmartGlassesService");
        unbindSmartGlassesService();

        if (!isMyServiceRunning(SmartGlassesService.class)) return;
        Intent stopIntent = new Intent(this, SmartGlassesService.class);
        stopIntent.setAction(SmartGlassesService.ACTION_STOP_FOREGROUND_SERVICE);
        startService(stopIntent);
    }

    public void startSmartGlassesService() {
        Log.d(TAG, "Starting SmartGlassesService");
        if (isMyServiceRunning(SmartGlassesService.class)){
            Log.i(TAG, "SmartGlassesService already running, stopping...");
            stopSmartGlassesService();
        }

        Intent startIntent = new Intent(this, SmartGlassesService.class);
        startIntent.setAction(SmartGlassesService.ACTION_START_FOREGROUND_SERVICE);
        startService(startIntent);
        bindSmartGlassesService();
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

    //handle bottom app bar navigation - if you want a multi-page app, this is ready to go
//    private void setupBottomNavBar(){
//        bottomNavigation = (BottomNavigationView) findViewById(R.id.bottom_nav_main_menu_nav);
//        bottomNavigation.setOnNavigationItemSelectedListener(new BottomNavigationView.OnNavigationItemSelectedListener() {
//            @Override
//            public boolean onNavigationItemSelected(@NonNull MenuItem item) {
//                //this has to be an if-else: https://stackoverflow.com/questions/21005205/what-causes-constant-expression-required-errors-for-the-generated-r-id-xxx-val
//                int itemId = item.getItemId();
//                if(R.id.memory_page == itemId){
//                    Log.d(TAG, "Clicked memory tools");
//                    navController.navigate(R.id.nav_memory_tools);
//                } else if (R.id.smart_glasses_debug_page == itemId){
//                    Log.d(TAG, "Clicked smart glasses debug page");
//                    navController.navigate(R.id.nav_smart_glasses_debug);
//                } else if (R.id.settings_page == itemId){
//                    Log.d(TAG, "Clicked settings page");
//                    navController.navigate(R.id.nav_settings);
//                }
//                return true;
//            }
//        });
//    }

    public void bindSmartGlassesService(){
        // Bind to that service
        if (!mBound){
            Intent intent = new Intent(this, SmartGlassesService.class);
            bindService(intent, wearableAiServiceConnection, Context.BIND_AUTO_CREATE);
        }
    }

    public void unbindSmartGlassesService() {
        // Bind to that service
        if (mBound){
            unbindService(wearableAiServiceConnection);
            mBound = false;
        }
    }

    /** Defines callbacks for service binding, passed to bindService() */
    private ServiceConnection wearableAiServiceConnection = new ServiceConnection() {

        @Override
        public void onServiceConnected(ComponentName className,
                                       IBinder service) {
            // We've bound to LocalService, cast the IBinder and get LocalService instance
            SmartGlassesService.LocalBinder wearableAiServiceBinder = (SmartGlassesService.LocalBinder) service;
            mService = (SmartGlassesService) wearableAiServiceBinder.getService();
            mBound = true;

            //get update for UI
            mService.sendUiUpdate();
        }

        @Override
        public void onServiceDisconnected(ComponentName arg0) {
            mBound = false;
        }
    };

    //this should only be called after the Smart glasses Service is up and bound
    public void connectSmartGlasses(SmartGlassesDevice device){
        this.selectedDevice = device;

        //check if the service is running. If not, we should start it first, so it doesn't die when we unbind
        if (!isMyServiceRunning(SmartGlassesService.class)){
            Log.e(TAG, "Something went wrong, service should be started and bound.");
        } else {
            mService.connectToSmartGlasses(device);
        }
    }

    public boolean areSmartGlassesConnected(){
        if (!isMyServiceRunning(SmartGlassesService.class)){
            return false;
        } else {
            return (mService.getSmartGlassesConnectState() == 2);
        }
    }

    public void changeAsrFramework(ASR_FRAMEWORKS asrFramework){
        if (mService != null){
            mService.changeChosenAsrFramework(asrFramework);
        }
    }
}