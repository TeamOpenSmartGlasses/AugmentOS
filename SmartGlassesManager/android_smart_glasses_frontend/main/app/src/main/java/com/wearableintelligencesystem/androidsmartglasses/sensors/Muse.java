package com.wearableintelligencesystem.androidsmartglasses.sensors;

//thanks to MuServe for code
//https://github.com/CaydenPierce/MuServe

import static android.content.Context.BIND_AUTO_CREATE;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;

public class Muse extends Thread {
    private String TAG = "WearableAI_MuseHandler";
    private Context mContext;

    private MuseService mMuseService;
    private String mDeviceName;
    private String mDeviceAddress;

    // Code to manage Service lifecycle.
    private final ServiceConnection mServiceConnection = new ServiceConnection() {

        @Override
        public void onServiceConnected(ComponentName componentName, IBinder service) {
            Log.d(TAG, "Muse Service connected'");
            mMuseService = ((MuseService.LocalBinder) service).getService();

            if (!mMuseService.initialize()) {
                return;
            }
            // Automatically connects to the device upon successful start-up initialization.
            mMuseService.connect(mDeviceAddress);
        }

        @Override
        public void onServiceDisconnected(ComponentName componentName) {
            //mMuseService = null;
        }
    };

    public Muse(Context context, String name, String address){
        mContext = context;
        mDeviceAddress = address;
        mDeviceName = name;

    }

    public void run(){
        connect();
    }

    public void connect(){
        Intent startIntent = new Intent(mContext, MuseService.class);
        mContext.startService(startIntent);
                /*
                Intent bleService = new Intent(this, MuseService.class);
                getApplicationContext().startForegroundService(bleService); //start up the service first so it stays alive after shutting down the app*/
        Intent gattServiceIntent = new Intent(mContext, MuseService.class);
        mContext.bindService(gattServiceIntent, mServiceConnection, BIND_AUTO_CREATE); //then bind to the service so we can communicate with it
        //mMuseService.connect(mDeviceAddress);
    }

    public void disconnect(){
        mMuseService.disconnect();
        mContext.unbindService(mServiceConnection);
        Intent myService = new Intent(mContext, MuseService.class);
        mContext.stopService(myService);
    }

    private static IntentFilter makeGattUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(MuseService.ACTION_GATT_CONNECTED);
        intentFilter.addAction(MuseService.ACTION_GATT_DISCONNECTED);
        intentFilter.addAction(MuseService.ACTION_GATT_SERVICES_DISCOVERED);
        intentFilter.addAction(MuseService.ACTION_DATA_AVAILABLE);
        return intentFilter;
    }

//    // Handles various events fired by the Service.
//    // ACTION_GATT_CONNECTED: connected to a GATT server.
//    // ACTION_GATT_DISCONNECTED: disconnected from a GATT server.
//    // ACTION_GATT_SERVICES_DISCOVERED: discovered GATT services.
//    // ACTION_DATA_AVAILABLE: received data from the device.  This can be a result of read
//    //                        or notification operations.
//    private final BroadcastReceiver mGattUpdateReceiver = new BroadcastReceiver() {
//        @Override
//        public void onReceive(Context context, Intent intent) {
//            final String action = intent.getAction();
//            if (MuseService.ACTION_GATT_CONNECTED.equals(action)) {
//                mConnected = true;
//                updateConnectionState(R.string.connected);
//                invalidateOptionsMenu();
//            } else if (MuseService.ACTION_GATT_DISCONNECTED.equals(action)) {
//                mConnected = false;
//                updateConnectionState(R.string.disconnected);
//                invalidateOptionsMenu();
//                clearUI();
//            } else if (MuseService.ACTION_GATT_SERVICES_DISCOVERED.equals(action)) {
//                // Show all the supported services and characteristics on the user interface.
//                displayGattServices(mMuseService.getSupportedGattServices());
//                mMuseService.museSetup();
//            } else if (MuseService.ACTION_DATA_AVAILABLE.equals(action)) {
//                displayData(intent.getStringExtra(MuseService.EXTRA_DATA));
//            }
//        }
//    };

}
