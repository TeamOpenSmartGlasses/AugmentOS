package com.teamopensmartglasses.convoscope.comms;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.*;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import java.util.UUID;

public class AugmentosBlePeripheral {

    private static final String TAG = "AugmentOS_BLE";

    // Define custom Service and Characteristic UUIDs
    private static final UUID SERVICE_UUID = UUID.fromString("12345678-1234-5678-1234-56789abcdef0");
    private static final UUID CHARACTERISTIC_UUID = UUID.fromString("abcdef12-3456-789a-bcde-f01234567890");

    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeAdvertiser bluetoothAdvertiser;
    private BluetoothGattServer gattServer;
    private BluetoothGattCharacteristic characteristic;
    private Context context;

    public AugmentosBlePeripheral(Context context) {
        this.context = context;

        if (!context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
            Log.e(TAG, "Device does not support Bluetooth Low Energy");
            return;
        }

        bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager == null) {
            Log.e(TAG, "BluetoothManager is not available");
            return;
        }

        bluetoothAdapter = bluetoothManager.getAdapter();
        if (bluetoothAdapter == null) {
            Log.e(TAG, "BluetoothAdapter is not available");
            return;
        }
    }

    // Start BLE services: GATT server and advertising
    @SuppressLint("MissingPermission")
    public void start() {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            Log.e(TAG, "Bluetooth is not enabled");
            return;
        }

        // Register for pairing request broadcast
        IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_PAIRING_REQUEST);
        context.registerReceiver(pairingRequestReceiver, filter);

        // Set the custom device name
        bluetoothAdapter.setName("AugOS");

        setupGattServer();

        // Add a small delay before starting advertising
        new Handler(Looper.getMainLooper()).postDelayed(this::startAdvertising, 1000);
    }

    // Setup GATT server and handle read/write requests
    private void setupGattServer() {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "Missing BLUETOOTH_CONNECT permission");
            return;
        }

        gattServer = bluetoothManager.openGattServer(context, new BluetoothGattServerCallback() {
            @Override
            public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    Log.d(TAG, "Central connected: " + device.getAddress());
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    Log.d(TAG, "Central disconnected: " + device.getAddress());
                }
            }

            @Override
            public void onCharacteristicReadRequest(BluetoothDevice device, int requestId, int offset,
                                                    BluetoothGattCharacteristic characteristic) {
                if (CHARACTERISTIC_UUID.equals(characteristic.getUuid())) {
                    String response = "{\"status\":\"OK\",\"message\":\"Hello from AugmentOS!\"}";
                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, response.getBytes());
                    Log.d(TAG, "Sent data to Central: " + response);
                }
            }

            @Override
            public void onCharacteristicWriteRequest(BluetoothDevice device, int requestId,
                                                     BluetoothGattCharacteristic characteristic, boolean preparedWrite,
                                                     boolean responseNeeded, int offset, byte[] value) {
                if (CHARACTERISTIC_UUID.equals(characteristic.getUuid())) {
                    String receivedData = new String(value);
                    Log.d(TAG, "Received data from Central: " + receivedData);

                    if (responseNeeded) {
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null);
                    }
                }
            }
        });

        if (gattServer != null) {
            Log.d(TAG, "GATT server opened successfully.");
        } else {
            Log.e(TAG, "Failed to open GATT server.");
            return;
        }

        BluetoothGattService gattService = new BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY);
        characteristic = new BluetoothGattCharacteristic(
                CHARACTERISTIC_UUID,
                BluetoothGattCharacteristic.PROPERTY_READ | BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_READ | BluetoothGattCharacteristic.PERMISSION_WRITE
        );

        gattService.addCharacteristic(characteristic);
        gattServer.addService(gattService);
        Log.d(TAG, "GATT server setup complete");
    }

    @SuppressLint("MissingPermission")
    public void sendDataToAugmentOsManager(String message) {
        if (characteristic == null || gattServer == null) {
            Log.e(TAG, "Characteristic or GATT server not initialized");
            return;
        }

        characteristic.setValue(message.getBytes());
        boolean notified = gattServer.notifyCharacteristicChanged(
                null,  // Send to all connected devices
                characteristic,
                false  // Indication (true) or Notification (false)
        );

        if (notified) {
            Log.d(TAG, "Sent notification to Central: " + message);
        } else {
            Log.e(TAG, "Failed to send notification.");
        }
    }


    // Start advertising the service
    @SuppressLint("MissingPermission")
    private void startAdvertising() {
        bluetoothAdvertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (bluetoothAdvertiser == null) {
            Log.e(TAG, "BLE advertising not supported");
            return;
        }

        AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .build();

        AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .addServiceUuid(new ParcelUuid(SERVICE_UUID))
                .build();

        bluetoothAdvertiser.startAdvertising(settings, data, new AdvertiseCallback() {
            @Override
            public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                Log.d(TAG, "BLE advertising started successfully");
            }

            @Override
            public void onStartFailure(int errorCode) {
                Log.e(TAG, "BLE advertising failed: " + errorCode);
            }
        });
    }

    // Stop BLE services
    @SuppressLint("MissingPermission")
    public void stop() {
        context.unregisterReceiver(pairingRequestReceiver);  // Unregister receiver
        if (bluetoothAdvertiser != null) {
            bluetoothAdvertiser.stopAdvertising(new AdvertiseCallback() {
            });
            Log.d(TAG, "BLE advertising stopped");
        }
        if (gattServer != null) {
            gattServer.close();
            Log.d(TAG, "GATT server closed");
        }
    }

    private final BroadcastReceiver pairingRequestReceiver = new BroadcastReceiver() {
        @SuppressLint("MissingPermission")
        @Override
        public void onReceive(Context context, Intent intent) {
            final String action = intent.getAction();
            if (BluetoothDevice.ACTION_PAIRING_REQUEST.equals(action)) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                int pairingVariant = intent.getIntExtra(BluetoothDevice.EXTRA_PAIRING_VARIANT, BluetoothDevice.ERROR);

                if (pairingVariant == BluetoothDevice.PAIRING_VARIANT_PIN ||
                        pairingVariant == BluetoothDevice.PAIRING_VARIANT_PASSKEY_CONFIRMATION) {
                    Log.d(TAG, "Automatically confirming pairing...");
                    if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                        // TODO: Consider calling
                        //    ActivityCompat#requestPermissions
                        // here to request the missing permissions, and then overriding
                        //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
                        //                                          int[] grantResults)
                        // to handle the case where the user grants the permission. See the documentation
                        // for ActivityCompat#requestPermissions for more details.
                        return;
                    }
                    device.setPairingConfirmation(true);
                    abortBroadcast();  // Prevents the system dialog from showing
                }
            }
        }
    };

}
