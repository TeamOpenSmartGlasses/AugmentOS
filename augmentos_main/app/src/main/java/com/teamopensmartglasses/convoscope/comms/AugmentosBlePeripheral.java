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

import org.json.JSONException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class AugmentosBlePeripheral {

    private static final String TAG = "AugmentOS_BLE";
    private final AugmentOsActionsCallback callback;  // Store the callback reference
    private final AugmentOsManagerMessageParser parser;  // Store the parser instance

    // Define custom Service and Characteristic UUIDs
    private static final UUID SERVICE_UUID = UUID.fromString("12345678-1234-5678-1234-56789abcdef0");
    private static final UUID CHARACTERISTIC_UUID = UUID.fromString("abcdef12-3456-789a-bcde-f01234567890");

    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeAdvertiser bluetoothAdvertiser;
    private BluetoothGattServer gattServer;
    private BluetoothGattCharacteristic characteristic;
    private Context context;
    private BluetoothDevice connectedDevice;
    private AdvertiseCallback advertiseCallback;
    private Integer currentMtuSize = 23;  // Default MTU size
    private Map<BluetoothDevice, ByteArrayOutputStream> deviceBuffers = new HashMap<>();
    private Map<BluetoothDevice, Integer> expectedDataLength = new HashMap<>();

    // Declare this at the class level
    private ByteArrayOutputStream mPartialWriteBuffer = new ByteArrayOutputStream();

    public AugmentosBlePeripheral(Context context, AugmentOsActionsCallback callback) {
        this.context = context;
        this.callback = callback;  // Store callback to delegate commands
        this.parser = new AugmentOsManagerMessageParser(callback);  // Initialize the parser with callback

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
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "Missing BLUETOOTH_ADVERTISE permission");
            return;
        }

        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "Missing BLUETOOTH_CONNECT permission");
            return;
        }

        gattServer = bluetoothManager.openGattServer(context, new BluetoothGattServerCallback() {
            @Override
            public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    Log.d(TAG, "Central connected: " + device.getAddress());
                    // Some error doing Toast here?
                    // Toast.makeText(context.getApplicationContext(), "Central connected: " + device.getAddress(), Toast.LENGTH_LONG);
                    connectedDevice = device; // Store the connected device
                    // sendDataToAugmentOsManager("HELLO THERE :)");
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    Log.d(TAG, "Central disconnected: " + device.getAddress());
                    connectedDevice = null;
                }
            }

            @SuppressLint("MissingPermission")
            @Override
            public void onCharacteristicReadRequest(BluetoothDevice device, int requestId, int offset,
                                                    BluetoothGattCharacteristic characteristic) {
                if (CHARACTERISTIC_UUID.equals(characteristic.getUuid())) {
                    String response = "{\"status\":\"OK\",\"message\":\"Hello from AugmentOS!\"}";
                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, response.getBytes());
                    Log.d(TAG, "Sent data to Central: " + response);
                }
            }

            @SuppressLint("MissingPermission")
            @Override
            public void onCharacteristicWriteRequest(BluetoothDevice device, int requestId,
                                                     BluetoothGattCharacteristic characteristic, boolean preparedWrite,
                                                     boolean responseNeeded, int offset, byte[] value) {
                if (CHARACTERISTIC_UUID.equals(characteristic.getUuid())) {
                    ByteArrayOutputStream buffer = deviceBuffers.get(device);
                    if (buffer == null) {
                        buffer = new ByteArrayOutputStream();
                        deviceBuffers.put(device, buffer);
                    }

                    try {
                        // Append data to buffer
                        buffer.write(value);

                        if (responseNeeded) {
                            gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value);
                        }

                        // Check if we have received all data
                        checkAndProcessData(device);

                    } catch (IOException e) {
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null);
                    }
                } else {
                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null);
                }
            }

            private void checkAndProcessData(BluetoothDevice device) throws UnsupportedEncodingException {
                ByteArrayOutputStream buffer = deviceBuffers.get(device);
                if (buffer != null) {
                    // Implement logic to determine if all data has been received
                    // For example, include total length in the first chunk or use a delimiter

                    // If all data received
                    String completeData = buffer.toString(StandardCharsets.UTF_8.name());

                    // Process the complete data
                    try {
                        parser.parseMessage(completeData);
                    } catch (JSONException e) {
                        Log.e(TAG, "Invalid JSON command: " + e.getMessage());
                    }

                    // Clear buffer after processing
                    buffer.reset();
                    deviceBuffers.remove(device);
                }
            }

            @SuppressLint("MissingPermission")
            @Override
            public void onExecuteWrite(BluetoothDevice device, int requestId, boolean execute) {
                if (execute) {
                    // The central device has requested to execute the prepared writes
                    try {
                        // Convert the accumulated bytes into a string
                        String completeData = mPartialWriteBuffer.toString(StandardCharsets.UTF_8.name());

                        // Clear the buffer for the next write operation
                        mPartialWriteBuffer.reset();

                        // Process the complete data (e.g., parse JSON)
                        parser.parseMessage(completeData);

                        // Send a success response
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null);
                    } catch (JSONException e) {
                        // Handle JSON parsing error
                        Log.e(TAG, "Invalid JSON command onExecuteWrite: " + e.getMessage());
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, 0, null);
                    } catch (UnsupportedEncodingException e) {
                        // Handle encoding error
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, 0, null);
                    }
                } else {
                    // The central device has requested to cancel the prepared writes
                    mPartialWriteBuffer.reset(); // Clear the buffer
                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null);
                }
            }


            @SuppressLint("MissingPermission")
            @Override
            public void onDescriptorWriteRequest (BluetoothDevice device, int requestId, BluetoothGattDescriptor descriptor, boolean preparedWrite, boolean responseNeeded, int offset, byte[] value) {

                connectedDevice = device;  // perhaps add to some kind of collection of devices to update?

                // now tell the connected device that this was all successfull
                gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value);

            }

            @Override
            public void onMtuChanged(BluetoothDevice device, int mtu) {
                super.onMtuChanged(device, mtu);
                Log.d(TAG, "MTU changed to: " + mtu);

                // Update any buffers or settings that depend on the MTU size
                // For example, adjust the maximum chunk size for incoming data
                currentMtuSize = mtu;
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
                BluetoothGattCharacteristic.PROPERTY_READ
                        | BluetoothGattCharacteristic.PROPERTY_WRITE
                        | BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_READ
                        | BluetoothGattCharacteristic.PERMISSION_WRITE
        );


        // Add the descriptor to enable notifications
        BluetoothGattDescriptor descriptor = new BluetoothGattDescriptor(UUID.fromString("00002902-0000-1000-8000-00805F9B34FB"), BluetoothGattDescriptor.PERMISSION_WRITE | BluetoothGattDescriptor.PERMISSION_READ);
//                new BluetoothGattDescriptor(
//                UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"),
//                BluetoothGattDescriptor.PERMISSION_WRITE | BluetoothGattDescriptor.PERMISSION_READ
//        );
        descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
        characteristic.addDescriptor(descriptor);

        gattService.addCharacteristic(characteristic);
        if (gattServer.addService(gattService)) {
            Log.d(TAG, "Service added successfully.");
        } else {
            Log.e(TAG, "Failed to add service to GATT server.");
        }

        // sendDataToAugmentOsManager("HELLO THERE :)");
        Log.d(TAG, "GATT server setup complete");
    }

    @SuppressLint("MissingPermission")
    public void sendDataToAugmentOsManager(String jsonData) {
        Log.d(TAG, "Sending data to augmentos manager");
        if (characteristic == null) {
            Log.e(TAG, "Characteristic not initialized");
            return;
        }
        if (gattServer == null) {
            Log.e(TAG, " GATT server not initialized");
            return;
        }
        if (connectedDevice == null) {
            Log.e(TAG, "Unable to send notification. Connected device is not initialized.");
            return;
        }

        Log.d(TAG, "Attempting to send data to AugmentOS_Manager:\n" + jsonData);

        // Convert the JSON string to bytes
        byte[] dataBytes = jsonData.getBytes(StandardCharsets.UTF_8);

        // Calculate maximum chunk size
        int maxChunkSize = currentMtuSize - 3; // Subtract 3 bytes for ATT protocol overhead

        // Calculate total chunks
        int totalChunks = (int) Math.ceil((double) dataBytes.length / maxChunkSize);

        // Send each chunk
        for (int i = 0; i < totalChunks; i++) {
            int start = i * maxChunkSize;
            int end = Math.min(start + maxChunkSize, dataBytes.length);
            byte[] chunk = Arrays.copyOfRange(dataBytes, start, end);

            // Add metadata (e.g., sequence number, total chunks)
            ByteBuffer buffer = ByteBuffer.allocate(chunk.length + 2);
            buffer.put((byte) i); // Sequence number
            buffer.put((byte) totalChunks); // Total chunks
            buffer.put(chunk);

            // Send the chunk via notification
            sendNotificationWithDelay(buffer.array(), 250);
        }
    }

    private void sendNotificationWithDelay(byte[] data, int delayMillis) {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            sendNotification(data);
        }, delayMillis);
    }


    @SuppressLint("MissingPermission")
    private void sendNotification(byte[] data) {
        if (connectedDevice == null) {
            Log.d(TAG, "Tried to send data via BLE but no device connected");
            return;
        }

        characteristic.setValue(data);
        boolean notificationSent = gattServer.notifyCharacteristicChanged(connectedDevice, characteristic, false);

        if (notificationSent) {
            Log.d(TAG, "Sent notification to AugmentOS_Manager!!!");
        } else {
            Log.e(TAG, "Failed to send notification.");
        }
    }


    // Start advertising the service
    private void startAdvertising() {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "Missing BLUETOOTH_ADVERTISE permission");
            return;
        }

        if (!bluetoothAdapter.isMultipleAdvertisementSupported()) {
            Log.e(TAG, "BLE advertising not supported on this device");
            return;
        }

        bluetoothAdvertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        Log.d(TAG, "START ADVERTISING");
        if (bluetoothAdvertiser == null) {
            Log.e(TAG, "BLE advertising not supported");
            return;
        }

        if (gattServer == null) {
            Log.d(TAG, "GATT SERVER NULL IN STARTADVERTISING");
            return;
        }

        AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .build();

        AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addServiceUuid(new ParcelUuid(SERVICE_UUID))
                .build();

        AdvertiseData scanResponse = new AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .build();

        advertiseCallback = new AdvertiseCallback() {
            @Override
            public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                Log.d(TAG, "BLE advertising started successfully");
            }

            @Override
            public void onStartFailure(int errorCode) {
                String errorMessage;
                switch (errorCode) {
                    case ADVERTISE_FAILED_DATA_TOO_LARGE:
                        errorMessage = "Data too large";
                        break;
                    case ADVERTISE_FAILED_TOO_MANY_ADVERTISERS:
                        errorMessage = "Too many advertisers";
                        break;
                    case ADVERTISE_FAILED_ALREADY_STARTED:
                        errorMessage = "Already started";
                        break;
                    case ADVERTISE_FAILED_INTERNAL_ERROR:
                        errorMessage = "Internal error";
                        break;
                    case ADVERTISE_FAILED_FEATURE_UNSUPPORTED:
                        errorMessage = "Feature unsupported";
                        break;
                    default:
                        errorMessage = "Unknown error";
                }
                Log.e(TAG, "BLE advertising failed: " + errorMessage);
            }
        };

        bluetoothAdvertiser.startAdvertising(settings, data, scanResponse, advertiseCallback);
    }

    // Stop BLE services
    @SuppressLint("MissingPermission")
    public void stop() {
        try {
            context.unregisterReceiver(pairingRequestReceiver);
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "Pairing request receiver was not registered or already unregistered.");
        }

        if (bluetoothAdvertiser != null && advertiseCallback != null) {
            bluetoothAdvertiser.stopAdvertising(advertiseCallback);
            Log.d(TAG, "BLE advertising stopped");
            advertiseCallback = null;
        }

        if (gattServer != null) {
            gattServer.close();
            Log.d(TAG, "GATT server closed");
            gattServer = null;
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

//                if (pairingVariant == BluetoothDevice.PAIRING_VARIANT_PIN ||
//                        pairingVariant == BluetoothDevice.PAIRING_VARIANT_PASSKEY_CONFIRMATION) {
//                    Log.d(TAG, "Automatically confirming pairing...");
//                    if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
//                        // TODO: Consider calling
//                        //    ActivityCompat#requestPermissions
//                        // here to request the missing permissions, and then overriding
//                        //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
//                        //                                          int[] grantResults)
//                        // to handle the case where the user grants the permission. See the documentation
//                        // for ActivityCompat#requestPermissions for more details.
//                        return;
//                    }
//                    //device.setPairingConfirmation(true);
//                    //abortBroadcast();  // Prevents the system dialog from showing
//                }
            }
        }
    };

}