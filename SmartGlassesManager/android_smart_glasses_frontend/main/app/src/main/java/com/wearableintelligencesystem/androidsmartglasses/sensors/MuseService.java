package com.wearableintelligencesystem.androidsmartglasses.sensors;

//thanks to MuServe for most code

/*
 * Copyright (C) 2013 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.content.Context;
import android.content.Intent;
import android.os.Binder;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
//import android.support.v4.app.NotificationCompat;
//import android.support.v4.app.NotificationCompat;

import android.util.Log;

import com.wearableintelligencesystem.androidsmartglasses.MainActivity;
import com.wearableintelligencesystem.androidsmartglasses.R;

import java.net.DatagramSocket;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import androidx.core.app.NotificationCompat;

/**
 * Service for managing connection and data communication with a GATT server hosted on a
 * given Bluetooth LE device.
 */
public class MuseService extends Service {
    private final static String TAG = "WearableAI_MuseService";

    private BluetoothManager mBluetoothManager;
    private BluetoothAdapter mBluetoothAdapter;
    private String mBluetoothDeviceAddress;
    private BluetoothGatt mBluetoothGatt;
    private int mConnectionState = STATE_DISCONNECTED;

    private boolean shouldStream=true;

    private static final int STATE_DISCONNECTED = 0;
    private static final int STATE_CONNECTING = 1;
    private static final int STATE_CONNECTED = 2;

    public final static String ACTION_GATT_CONNECTED =
            "com.example.bluetooth.le.ACTION_GATT_CONNECTED";
    public final static String ACTION_GATT_DISCONNECTED =
            "com.example.bluetooth.le.ACTION_GATT_DISCONNECTED";
    public final static String ACTION_GATT_SERVICES_DISCOVERED =
            "com.example.bluetooth.le.ACTION_GATT_SERVICES_DISCOVERED";
    public final static String ACTION_DATA_AVAILABLE =
            "com.example.bluetooth.le.ACTION_DATA_AVAILABLE";
    public final static String EXTRA_DATA =
            "com.example.bluetooth.le.EXTRA_DATA";

    public final static UUID UUID_HEART_RATE_MEASUREMENT =
            UUID.fromString(BluetoothScanner.CLIENT_CHARACTERISTIC_CONFIG);

    //list of chars we want to write to
    //sample are received in this order : 44, 41, 38, 32, 35
    public String charStreamUUID = "273e0001-4c4d-454d-96be-f03bac821358"; //write preset to this

    public Object [] charTP9UUID = {"273e0003-4c4d-454d-96be-f03bac821358", 44};
    public Object [] charAF7UUID = {"273e0004-4c4d-454d-96be-f03bac821358", 41};
    public Object [] charAF8UUID = {"273e0005-4c4d-454d-96be-f03bac821358", 38};
    public Object [] charTP10UUID = {"273e0006-4c4d-454d-96be-f03bac821358", 32};
    public Object [] charRightAuxUUID = {"273e0007-4c4d-454d-96be-f03bac821358", 35};

    public Object [][] elecChars = {charAF7UUID, charAF8UUID, charRightAuxUUID, charTP9UUID, charTP10UUID};

    public Boolean lock = false; //check if bluetooth writer/reader is locked before trying to read/write
    public int attempts = 0; //number of attempts to keep retrying connection to bluetooth
    public Boolean tryStill = false; //should we keep retrying to connect, this option is for "Croc'ing" - reconnecting on disconnec
    private NotificationManager mNotificationManager; //manage notifications...
    private final static String FOREGROUND_CHANNEL_ID = "MuServeAppStreamerService";
    public DatagramSocket udpSocket; //creating the socket here... this should be moved to its own service for understandability and to expand this to TCP
    String csvName;

    @Override
    public void onDestroy(){
        Log.d("UUID", "destroying streamer service");
        tryStill = false;
        stopForeground(true);
        disconnect();
        close();
        this.stopSelf();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        mNotificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        //create socket connection
//        try {
//            udpSocket = new DatagramSocket(9999);
//        } catch (Exception e){
//            Log.e("UUID", e.toString());
//        }
//        csvName = Long.toString(System.currentTimeMillis() / 1000);
    }


    private Notification prepareNotification() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O &&
                mNotificationManager.getNotificationChannel(FOREGROUND_CHANNEL_ID) == null) {
            // The user-visible name of the channel.
            CharSequence name = "Test"; //getString(R.string.text_value_radio_notification);
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel mChannel = new NotificationChannel(FOREGROUND_CHANNEL_ID, name, importance);
            mChannel.enableVibration(false);
            mNotificationManager.createNotificationChannel(mChannel);
        }
        Intent notificationIntent = new Intent(this, MainActivity.class);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.HONEYCOMB) {
            notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        } else {
            notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder lNotificationBuilder;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            lNotificationBuilder = new NotificationCompat.Builder(this, FOREGROUND_CHANNEL_ID);
        } else {
            lNotificationBuilder = new NotificationCompat.Builder(this);
        }
        lNotificationBuilder
                .setContentTitle("Title")
                .setSmallIcon(R.drawable.ic_launcher_background)
                .setOnlyAlertOnce(true)
                .setOngoing(true)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            lNotificationBuilder.setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        }
        return lNotificationBuilder.build();

    }


    @Override
    public int onStartCommand (Intent intent, int flags, int startId){
        Log.d("UUID", "starting ble");
        if (intent == null) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(69696969, prepareNotification());
        return START_NOT_STICKY;
    }

    // Implements callback methods for GATT events that the app cares about.  For example,
    // connection change and services discovered.
    private final BluetoothGattCallback mGattCallback = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
            String intentAction;
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                //tryStill = false;
                intentAction = ACTION_GATT_CONNECTED;
                mConnectionState = STATE_CONNECTED;
                broadcastUpdate(intentAction);
                Log.i("UUID", "Connected to GATT server.");
                // Attempts to discover services after successful connection.
                Log.i("UUID", "Attempting to start service discovery:" +
                        mBluetoothGatt.discoverServices());

            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                attempts++;
                intentAction = ACTION_GATT_DISCONNECTED;
                mConnectionState = STATE_DISCONNECTED;
                Log.i("UUID", "Disconnected from GATT server.");
                if (tryStill.equals(true)) {
                    oldConn(mBluetoothDeviceAddress);
                    broadcastUpdate(intentAction);
                }
            }
        }

        @Override
        public void onServicesDiscovered(BluetoothGatt gatt, int status) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                broadcastUpdate(ACTION_GATT_SERVICES_DISCOVERED);
                //run on handler so we don't block this callback
                final Handler handler = new Handler(Looper.myLooper());
                handler.post(new Runnable() {
                    @Override
                    public void run() {
                        museSetup();
                    }
                });
            } else {
                Log.w(TAG, "onServicesDiscovered received: " + status);
            }
        }

        @Override
        public void onCharacteristicRead(BluetoothGatt gatt,
                                         BluetoothGattCharacteristic characteristic,
                                         int status) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                broadcastUpdate(ACTION_DATA_AVAILABLE, characteristic);
            }
        }

        @Override
        public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status){
            Log.d("UUID", "Char write success");
            lock = false;
        }

        @Override
        public void onDescriptorWrite (BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status){
            lock = false;
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt gatt,
                                            BluetoothGattCharacteristic characteristic) {
            broadcastUpdate(ACTION_DATA_AVAILABLE, characteristic);
            byte [] values = characteristic.getValue();
            String currUuid = characteristic.getUuid().toString();
            int handle = 0;
            for (int i = 0; i < elecChars.length; i++){
                if (elecChars[i][0].equals(currUuid)){
                    handle = (int) elecChars[i][1];
                }
            }
            Log.d(TAG, "Handle: " + handle + ", Values: " + values);

//            if(shouldStream) {
//                Streamer streamer = new Streamer(getApplicationContext(), ipAddress, ipPortNum, id);
//                Object[] obj = new Object[4];
//                obj[0] = udpSocket;
//                obj[1] = values;
//                obj[2] = csvName;
//                obj[3] = handle;
//                streamer.execute(obj);
//            }
        }
    };

    private void broadcastUpdate(final String action) { final Intent intent = new Intent(action);
        sendBroadcast(intent);
    }

    private void broadcastUpdate(final String action,
                                 final BluetoothGattCharacteristic characteristic) {
        final Intent intent = new Intent(action);

        // This is special handling for the Heart Rate Measurement profile.  Data parsing is
        // carried out as per profile specifications:
        // http://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml
        if (UUID_HEART_RATE_MEASUREMENT.equals(characteristic.getUuid())) {
            int flag = characteristic.getProperties();
            int format = -1;
            if ((flag & 0x01) != 0) {
                format = BluetoothGattCharacteristic.FORMAT_UINT16;
                Log.d(TAG, "Heart rate format UINT16.");
            } else {
                format = BluetoothGattCharacteristic.FORMAT_UINT8;
                Log.d(TAG, "Heart rate format UINT8.");
            }
            final int heartRate = characteristic.getIntValue(format, 1);
            Log.d(TAG, String.format("Received heart rate: %d", heartRate));
            intent.putExtra(EXTRA_DATA, String.valueOf(heartRate));
        } else {
            // For all other profiles, writes the data formatted in HEX.
            final byte[] data = characteristic.getValue();
            if (data != null && data.length > 0) {
                final StringBuilder stringBuilder = new StringBuilder(data.length);
                for(byte byteChar : data)
                    stringBuilder.append(String.format("%02X ", byteChar));
                intent.putExtra(EXTRA_DATA, new String(data) + "\n" + stringBuilder.toString());
            }
        }
        sendBroadcast(intent);
    }

    public class LocalBinder extends Binder {
        MuseService getService() {
            return MuseService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return mBinder;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        // After using a given device, you should make sure that BluetoothGatt.close() is called
        // such that resources are cleaned up properly.  In this particular example, close() is
        // invoked when the UI is disconnected from the Service.
        //close();
        return super.onUnbind(intent);
    }

    private final IBinder mBinder = new LocalBinder();

    public void setShouldStream(boolean stream){
        shouldStream=stream;
    }

    /**
     * Initializes a reference to the local Bluetooth adapter.
     *
     * @return Return true if the initialization is successful.
     */
    public boolean initialize() {

        // For API level 18 and above, get a reference to BluetoothAdapter through
        // BluetoothManager.
        if (mBluetoothManager == null) {
            mBluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
            if (mBluetoothManager == null) {
                Log.e(TAG, "Unable to initialize BluetoothManager.");
                return false;
            }
        }

        mBluetoothAdapter = mBluetoothManager.getAdapter();
        if (mBluetoothAdapter == null) {
            Log.e(TAG, "Unable to obtain a BluetoothAdapter.");
            return false;
        }

        return true;
    }

    /**
     * Connects to the GATT server hosted on the Bluetooth LE device.
     *
     * @param address The device address of the destination device.
     *
     * @return Return true if the connection is initiated successfully. The connection result
     *         is reported asynchronously through the
     *         {@code BluetoothGattCallback#onConnectionStateChange(android.bluetooth.BluetoothGatt, int, int)}
     *         callback.
     */
    public boolean connect(final String address) {
        Boolean result;

        if (mBluetoothAdapter == null || address == null) {
            Log.w(TAG, "BluetoothAdapter not initialized or unspecified address.");
            return false;
        }

        result = oldConn(address); //first try to connect with an old connection

        if (result.equals(true)){
            return true;
        }

        final BluetoothDevice device = mBluetoothAdapter.getRemoteDevice(address);
        if (device == null) {
            Log.w(TAG, "Device not found.  Unable to connect.");
            return false;
        }

        // We want to directly connect to the device, so we are setting the autoConnect
        // parameter to false.
        mBluetoothGatt = device.connectGatt(this, false, mGattCallback);
        Log.d(TAG, "Trying to create a new connection.");
        mBluetoothDeviceAddress = address;
        mConnectionState = STATE_CONNECTING;
        attempts = 0; //set attempts to 0 so the callback will keep retrying connection (3 times)
        tryStill = true;

        return true;
    }

    public boolean oldConn(final String address){
        // Previously connected device.  Try to reconnect.
        if (mBluetoothDeviceAddress != null && address.equals(mBluetoothDeviceAddress)
                && mBluetoothGatt != null) {
            Log.d(TAG, "Trying to use an existing mBluetoothGatt for connection.");
            if (mBluetoothGatt.connect()) {
                mConnectionState = STATE_CONNECTING;
                return true;
            } else {
                return false;
            }
        }
        return false;
    }

    public void museSetup(){


        //we have to setup the muse notifications and proper preset
        List serve = getSupportedGattServices();
        Log.d("UUID", "starting muse setup");
        for (int i = 0; i < serve.size(); i++){
            BluetoothGattService currServe = (BluetoothGattService) serve.get(i);
            discoverCharacteristics(currServe);
            ArrayList chars = giveCharacteristics(currServe);
            for (int j = 0; j < chars.size(); j++){
                BluetoothGattCharacteristic currChar = (BluetoothGattCharacteristic) chars.get(j);
                for (int k = 0; k < elecChars.length; k++){
                    if (elecChars[k][0].equals(currChar.getUuid().toString())) {
                        mBluetoothGatt.setCharacteristicNotification(currChar, true); //enable on android
                        BluetoothGattDescriptor descriptor = currChar.getDescriptor(UUID.fromString(BluetoothScanner.CLIENT_CHARACTERISTIC_CONFIG));
                        while (lock == true) {
                            //spinning block
                        }
                        descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                        lock = true;
                        Log.d("SUCCESS", "subscribe result: " + Boolean.toString(mBluetoothGatt.writeDescriptor(descriptor))); //enable on muse
                        Log.d("UUID", "subscribed to: " + currChar.getUuid().toString());
                    }
                }
                if (charStreamUUID.equals(currChar.getUuid().toString())){
                    //write presets to this guy
                    Log.d("UUID", "Writing presets to muse on uuid: " + currChar.getUuid().toString());
                    byte[] preset1 = new byte[]{(byte) 0x02, (byte) 0x64, (byte) 0x0a};
                    byte[] preset2 = new byte[]{(byte) 0x04, (byte) 0x70, (byte) 0x32, (byte) 0x30, (byte) 0x0a};
                    BluetoothGattDescriptor descriptor = currChar.getDescriptor(UUID.fromString(BluetoothScanner.CLIENT_CHARACTERISTIC_CONFIG));
                    lock = true;
                    currChar.setValue(preset2);
                    Log.d("SUCCESS", "charStream: " + Boolean.toString(mBluetoothGatt.writeCharacteristic(currChar))); //write preset1 to muse
                    while (lock == true) {
                        //spinning block
                    }
                    currChar.setValue(preset1);
                    lock = true;
                    Log.d("SUCCESS", "charStream: " + Boolean.toString(mBluetoothGatt.writeCharacteristic(currChar))); //write preset2 to muse
                }
            }
        }


    }

    /**
     * Disconnects an existing connection or cancel a pending connection. The disconnection result
     * is reported asynchronously through the
     * {@code BluetoothGattCallback#onConnectionStateChange(android.bluetooth.BluetoothGatt, int, int)}
     * callback.
     */
    public void disconnect() {
        tryStill = false;
        if (mBluetoothAdapter == null || mBluetoothGatt == null) {
            Log.w(TAG, "BluetoothAdapter not initialized");
            return;
        }
        close();
    }

    /**
     * After using a given BLE device, the app must call this method to ensure resources are
     * released properly.
     */
    public void close() {
        if (mBluetoothGatt == null) {
            return;
        }
        mBluetoothGatt.disconnect();
        mBluetoothGatt.close();
        mBluetoothGatt = null;
        udpSocket.close();
    }

    /**
     * Request a read on a given {@code BluetoothGattCharacteristic}. The read result is reported
     * asynchronously through the {@code BluetoothGattCallback#onCharacteristicRead(android.bluetooth.BluetoothGatt, android.bluetooth.BluetoothGattCharacteristic, int)}
     * callback.
     *
     * @param characteristic The characteristic to read from.
     */
    public void readCharacteristic(BluetoothGattCharacteristic characteristic) {
        if (mBluetoothAdapter == null || mBluetoothGatt == null) {
            Log.w(TAG, "BluetoothAdapter not initialized");
            return;
        }
        mBluetoothGatt.readCharacteristic(characteristic);
    }

//    /**
//     * Enables or disables notification on a give characteristic.
//     *
//     * @param characteristic Characteristic to act on.
//     * @param enabled If true, enable notification.  False otherwise.
//     */
//    public void setCharacteristicNotification(BluetoothGattCharacteristic characteristic,
//                                              boolean enabled) {
//        if (mBluetoothAdapter == null || mBluetoothGatt == null) {
//            Log.w(TAG, "BluetoothAdapter not initialized");
//            return;
//        }
//        mBluetoothGatt.setCharacteristicNotification(characteristic, enabled);
//
//        // This is specific to Heart Rate Measurement.
//        if (UUID_HEART_RATE_MEASUREMENT.equals(characteristic.getUuid())) {
//            BluetoothGattDescriptor descriptor = characteristic.getDescriptor(
//                    UUID.fromString(SampleGattAttributes.CLIENT_CHARACTERISTIC_CONFIG));
//            descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
//            mBluetoothGatt.writeDescriptor(descriptor);
//        }
//    }

    /*public void setupMuse() {
        if (mBluetoothAdapter == null || mBluetoothGatt == null) {
            Log.w(TAG, "BluetoothAdapter not initialized");
            return;
        }
        mBluetoothGatt.setCharacteristicNotification(characteristic, enabled); //enable on android
        mBluetoothGatt.writeDescriptor(descriptor); //enable on muse

    }*/

    /**
     * Retrieves a list of supported GATT services on the connected device. This should be
     * invoked only after {@code BluetoothGatt#discoverServices()} completes successfully.
     *
     * @return A {@code List} of supported services.
     */
    public List<BluetoothGattService> getSupportedGattServices() {
        if (mBluetoothGatt == null) {
            Log.d("UUID", "it was null");
            return null;
        }

        return mBluetoothGatt.getServices();
    }

    private void discoverCharacteristics(BluetoothGattService service) {
        for (BluetoothGattCharacteristic gattCharacteristic : service.getCharacteristics()) {
            Log.d(TAG, "Discovered UUID: " + gattCharacteristic.getUuid());
        }

    }
    private ArrayList<BluetoothGattCharacteristic> giveCharacteristics(BluetoothGattService service) {
        ArrayList<BluetoothGattCharacteristic> chars = new ArrayList<BluetoothGattCharacteristic>();
        for (BluetoothGattCharacteristic gattCharacteristic : service.getCharacteristics()) {
            Log.d(TAG, "Discovered UUID: " + gattCharacteristic.getUuid());
            chars.add(gattCharacteristic);
        }

        return chars;
    }
}
