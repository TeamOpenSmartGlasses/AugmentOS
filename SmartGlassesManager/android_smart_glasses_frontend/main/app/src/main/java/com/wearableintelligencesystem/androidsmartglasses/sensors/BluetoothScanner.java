package com.wearableintelligencesystem.androidsmartglasses.sensors;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.util.Log;

public class BluetoothScanner {
    private String TAG = "WearableAI_BluetoothScanner";

    private Muse myMuse;

    private Context mContext;

    public static String CLIENT_CHARACTERISTIC_CONFIG = "00002902-0000-1000-8000-00805f9b34fb";

    private BluetoothAdapter mBluetoothAdapter;
    private BluetoothLeScanner mBluetoothLeScanner;
    private boolean mScanning;
    private Handler mHandler;

    private static final int REQUEST_ENABLE_BT = 1;
    // Stops scanning after 10 seconds.
    private static final long SCAN_PERIOD = 90000;

    public BluetoothScanner(Context context){
        mHandler = new Handler();
        mContext = context;

        // Use this check to determine whether BLE is supported on the device.  Then you can
        // selectively disable BLE-related features.
        if (!context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
            Log.d(TAG, "BLUETOOTH NOT AVAILABLE");
        }

        // Initializes a Bluetooth adapter.  For API level 18 and above, get a reference to
        // BluetoothAdapter through BluetoothManager.
        final BluetoothManager bluetoothManager =
                (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        mBluetoothAdapter = bluetoothManager.getAdapter();
        mBluetoothLeScanner =  mBluetoothAdapter.getBluetoothLeScanner();

        // Ensures Bluetooth is enabled on the device.  If Bluetooth is not currently enabled,
        // fire an intent to display a dialog asking the user to grant permission to enable it.
        if (!mBluetoothAdapter.isEnabled()) {
            Log.d(TAG, "BLUETOOTH IS DISABLED ON DEVICE");
        }

        // Checks if Bluetooth is supported on the device.
        if (mBluetoothAdapter == null) {
            Log.d(TAG, "BLUETOOTH NOT AVAILABLE");
            return;
        }
    }

    public void startScan(){
        scanLeDevice(true);
    }

    public void stopScan(){
        scanLeDevice(false);
    }

    private void scanLeDevice(final boolean enable) {
        Log.d(TAG, "Bluetooth scanning...");
        if (enable) {
            // Stops scanning after a pre-defined scan period.
            mHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    mScanning = false;
                    mBluetoothAdapter.stopLeScan(mLeScanCallback);
                }
            }, SCAN_PERIOD);

            mScanning = true;
            mBluetoothAdapter.startLeScan(mLeScanCallback);
        } else {
            mScanning = false;
            mBluetoothAdapter.stopLeScan(mLeScanCallback);
            //mBluetoothLeScanner.stopSca
        }
    }

    // Device scan callback.
    private BluetoothAdapter.LeScanCallback mLeScanCallback =
            new BluetoothAdapter.LeScanCallback() {
                @Override
                public void onLeScan(final BluetoothDevice device, int rssi, byte[] scanRecord) {
                    Log.d(TAG, "Found device: " + device.getName());
                    if (device.getName() != null && device.getName().toLowerCase().contains("muse")){
                        Log.d(TAG, "FOUND MUSE: " + device.getName());
                        if (mScanning) {
                            mBluetoothAdapter.stopLeScan(mLeScanCallback);
                            mScanning = false;
                            //below needs to happen in a new thread/handler
                            myMuse = new Muse(mContext, device.getName(), device.getAddress());
                            myMuse.run();
                        }
                    }
                }
            };
}
