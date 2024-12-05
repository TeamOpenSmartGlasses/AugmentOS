package com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.google.gson.Gson;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Semaphore;

public class EvenRealitiesG1SGC extends SmartGlassesCommunicator {
    private static final String TAG = "WearableAi_EvenRealitiesG1SGC";

    private static final UUID UART_SERVICE_UUID = UUID.fromString("6E400001-B5A3-F393-E0A9-E50E24DCCA9E");
    private static final UUID UART_TX_CHAR_UUID = UUID.fromString("6E400002-B5A3-F393-E0A9-E50E24DCCA9E");
    private static final UUID UART_RX_CHAR_UUID = UUID.fromString("6E400003-B5A3-F393-E0A9-E50E24DCCA9E");
    private static final UUID CLIENT_CHARACTERISTIC_CONFIG_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    private Context context;
    private BluetoothGatt leftGlassGatt;
    private BluetoothGatt rightGlassGatt;
    private BluetoothGattCharacteristic leftTxChar;
    private BluetoothGattCharacteristic rightTxChar;
    private BluetoothGattCharacteristic leftRxChar;
    private BluetoothGattCharacteristic rightRxChar;
    private final Handler handler = new Handler();
    private final Semaphore sendSemaphore = new Semaphore(1);
    private boolean isLeftConnected = false;
    private boolean isRightConnected = false;
    private int currentSeq = 0;
    private boolean stopper = false;
    private boolean debugStopper = false;

    private static final long DELAY_BETWEEN_SENDS_MS = 20;
    private static final long HEARTBEAT_INTERVAL_MS = 12000;

    //heartbeat sender
    private Handler heartbeatHandler = new Handler();
    private Runnable heartbeatRunnable;

    //white list sender
    private Handler whiteListHandler = new Handler();
    private boolean whiteListedAlready = false;

    //mic enable Handler
    private Handler micEnableHandler = new Handler();
    private boolean micEnabledAlready = false;

    //notification period sender
    private Handler notificationHandler = new Handler();
    private Runnable notificationRunnable;
    private boolean notifysStarted = false;
    private int notificationNum = 10;

    //pairing logic
    private boolean isLeftPairing = false;
    private boolean isRightPairing = false;
    private boolean isLeftBonded = false;
    private boolean isRightBonded = false;
    private BluetoothDevice leftDevice = null;
    private BluetoothDevice rightDevice = null;

    public EvenRealitiesG1SGC(Context context) {
        super();
        this.context = context;
        mConnectState = 0;
    }

    private final BluetoothGattCallback leftGattCallback = createGattCallback("Left");
    private final BluetoothGattCallback rightGattCallback = createGattCallback("Right");

    private BluetoothGattCallback createGattCallback(String side) {
        return new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    Log.d(TAG, side + " glass connected, discovering services...");
                    gatt.discoverServices();
                    if ("Left".equals(side)) isLeftConnected = true;
                    else isRightConnected = true;
                    updateConnectionState();
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    if ("Left".equals(side)) isLeftConnected = false;
                    else isRightConnected = false;
                    updateConnectionState();
                    Log.d(TAG, side + " glass disconnected");
                }
            }

            @Override
            public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                if (status == BluetoothGatt.GATT_SUCCESS) {

                    gatt.requestMtu(251); // Request a higher MTU size
                    Log.d(TAG, "Requested MTU size: 251");

                    BluetoothGattService uartService = gatt.getService(UART_SERVICE_UUID);

                    if (uartService != null) {
                        BluetoothGattCharacteristic txChar = uartService.getCharacteristic(UART_TX_CHAR_UUID);
                        BluetoothGattCharacteristic rxChar = uartService.getCharacteristic(UART_RX_CHAR_UUID);

                        if (txChar != null) {
                            if ("Left".equals(side)) leftTxChar = txChar;
                            else rightTxChar = txChar;
                            enableNotification(gatt, rxChar, side);
                            txChar.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
                            Log.d(TAG, side + " glass TX characteristic found");
                        }

                        if (rxChar != null) {

                            // Bond the device
                            if (gatt.getDevice().getBondState() != BluetoothDevice.BOND_BONDED) {
                                Log.d(TAG, "Creating bond with device: " + gatt.getDevice().getName());
                                gatt.getDevice().createBond();
                            } else {
                                Log.d(TAG, "Device already bonded: " + gatt.getDevice().getName());
                            }

                            if ("Left".equals(side)) leftRxChar = rxChar;
                            else rightRxChar = rxChar;
                            enableNotification(gatt, rxChar, side);
                            txChar.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
                            Log.d(TAG, side + " glass RX characteristic found");
                        }

                        // Request MTU size
                        gatt.requestMtu(251);
                        Log.d(TAG, "Requested MTU size: 251");

                        //no idea why but it's in the Even app - Cayden
                        Log.d(TAG, "Sending 0xF4 Command");
                        sendDataSequentially(new byte[] {(byte) 0xF4, (byte) 0x01});

                        //below has odd staggered times so they don't happen in sync
                        // Start MIC streaming
                        setMicEnabled(true, 993); // Enable the MIC

                        //enable our AugmentOS notification key
                        sendWhiteListCommand(2038);

                        //start sending notifications
                        startPeriodicNotifications(302);

                        //start heartbeat
                        startHeartbeat(411);
                    } else {
                        Log.e(TAG, side + " glass UART service not found");
                    }
                }
            }

            @Override
            public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    Log.d(TAG, side + " glass write successful");
                } else {
                    Log.e(TAG, side + " glass write failed with status: " + status);
                }
            }

            @Override
            public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (characteristic.getUuid().equals(UART_RX_CHAR_UUID)) {
                        byte[] data = characteristic.getValue();

                        // Handle MIC audio data
                        if (data.length > 0 && (data[0] & 0xFF) == 0xF1) {
                            int seq = data[1] & 0xFF; // Sequence number
                            byte[] audioData = Arrays.copyOfRange(data, 2, data.length); // Extract audio data
                            Log.d(TAG, "Audio data received. Seq: " + seq + ", Data: " + Arrays.toString(audioData) + ", from: " + gatt.getDevice().getName());
                        } else {
                            Log.d(TAG, "Received non-audio response: " + bytesToHex(data) + ", from: " + gatt.getDevice().getName());
                        }

                        // Check if it's a heartbeat response
                        if (data.length > 0 && data[0] == 0x25) {
                            Log.d(TAG, "Heartbeat response received");
                        }
                    }
                });
            }


        };
    }

    private void enableNotification(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, String side) {
        gatt.setCharacteristicNotification(characteristic, true);
        BluetoothGattDescriptor descriptor = characteristic.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG_UUID);
        if (descriptor != null) {
            descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
            boolean result = gatt.writeDescriptor(descriptor);
            if (result) {
                Log.d(TAG, side + " SIDE," + "Descriptor write successful for characteristic: " + characteristic.getUuid());
            } else {
                Log.e(TAG, side + " SIDE," + "Failed to write descriptor for characteristic: " + characteristic.getUuid());
            }
        } else {
            Log.e(TAG, side + " SIDE," + "Descriptor not found for characteristic: " + characteristic.getUuid());
        }
    }

    private void updateConnectionState() {
        if (isLeftConnected && isRightConnected) {
            mConnectState = 2;
            Log.d(TAG, "Both glasses connected");
            connectionEvent(2);
        } else if (isLeftConnected || isRightConnected) {
            mConnectState = 1;
            Log.d(TAG, "One glass connected");
            connectionEvent(1);
        } else {
            mConnectState = 0;
            Log.d(TAG, "No glasses connected");
            connectionEvent(0);
        }
    }

    private final BroadcastReceiver bondingReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (BluetoothDevice.ACTION_BOND_STATE_CHANGED.equals(action)) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                int bondState = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, -1);

                if (bondState == BluetoothDevice.BOND_BONDED) {
                    Log.d(TAG, "Bonded with device: " + device.getName());
                    if (device.getName().contains("_L_")) {
                        isLeftBonded = true;
                        isLeftPairing = false;
                    } else if (device.getName().contains("_R_")) {
                        isRightBonded = true;
                        isRightPairing = false;
                    }

                    // Restart scan for the next device
                    if (!isLeftBonded || !isRightBonded) {
                        Log.d(TAG, "Restarting scan to find remaining device...");
                        startScan(BluetoothAdapter.getDefaultAdapter());
                    } else {
                        Log.d(TAG, "Both devices bonded. Proceeding with connections...");
                        stopScan(BluetoothAdapter.getDefaultAdapter());
                        connectToGatt(leftDevice);
                        connectToGatt(rightDevice);
                    }
                } else if (bondState == BluetoothDevice.BOND_NONE) {
                    Log.d(TAG, "Bonding failed for device: " + device.getName());
                    if (device.getName().contains("_L_")) isLeftPairing = false;
                    if (device.getName().contains("_R_")) isRightPairing = false;

                    // Restart scanning to retry bonding
                    startScan(BluetoothAdapter.getDefaultAdapter());
                }
            }
        }
    };

    private void connectToGatt(BluetoothDevice device) {
        if (device.getName().contains("_L_") && leftGlassGatt == null) {
            leftGlassGatt = device.connectGatt(context, false, leftGattCallback);
        } else if (device.getName().contains("_R_") && rightGlassGatt == null) {
            rightGlassGatt = device.connectGatt(context, false, rightGattCallback);
        }
    }

    private BluetoothAdapter.LeScanCallback leScanCallback = (device, rssi, scanRecord) -> {
        String name = device.getName();

        //check if G1 arm
        if (name == null || !name.contains("G1")) {
            return;
        }

        //figure out which G1 arm it is
        boolean isLeft = name.contains("_L_");
        if (isLeft){
            leftDevice = device;
        } else{
            rightDevice = device;
        }

        //check if we've already bonded/paired
        int bondState = device.getBondState();
        if (bondState != BluetoothDevice.BOND_BONDED) {
            // Stop scan before initiating bond
            stopScan(BluetoothAdapter.getDefaultAdapter());

            if (isLeft && !isLeftPairing && !isLeftBonded) {
                Log.d(TAG, "Bonding with Left Glass...");
                isLeftPairing = true;
                bondDevice(device);
            } else if (!isLeft && !isRightPairing && !isRightBonded) {
                Log.d(TAG, "Bonding with Right Glass...");
                isRightPairing = true;
                bondDevice(device);
            }
        } else { //only runs if we've already setup the bond previously
            // Mark the device as bonded
            if (isLeft) isLeftBonded = true;
            if (!isLeft) isRightBonded = true;

            // Attempt GATT connection only after both sides are bonded
            if (isLeftBonded && isRightBonded) {
                Log.d(TAG, "Both sides bonded. Ready to connect to GATT.");
                stopScan(BluetoothAdapter.getDefaultAdapter());
                attemptGattConnection(leftDevice);
                attemptGattConnection(rightDevice);
            }
        }
    };

    @Override
    public void connectToSmartGlasses() {
        BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();

        // Register bonding receiver
        IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED);
        context.registerReceiver(bondingReceiver, filter);

        // Start scanning for devices
        startScan(bluetoothAdapter);
    }

    private void startScan(BluetoothAdapter bluetoothAdapter) {
        bluetoothAdapter.startLeScan(leScanCallback);
        Log.d(TAG, "Started scanning for devices...");
        handler.postDelayed(() -> stopScan(bluetoothAdapter), 60000); // Stop scan after 60 seconds
    }

    private void stopScan(BluetoothAdapter bluetoothAdapter) {
        bluetoothAdapter.stopLeScan(leScanCallback);
        Log.d(TAG, "Stopped scanning for devices");
    }

    private void bondDevice(BluetoothDevice device) {
        try {
            Log.d(TAG, "Attempting to bond with device: " + device.getName());
            Method method = device.getClass().getMethod("createBond");
            method.invoke(device);
        } catch (Exception e) {
            Log.e(TAG, "Bonding failed: " + e.getMessage());
        }
    }

    private void attemptGattConnection(BluetoothDevice device) {
        if (!isLeftBonded || !isRightBonded) {
            Log.d(TAG, "Cannot connect to GATT: Both devices are not bonded yet");
            return;
        }

        if (device.getName().contains("_L_") && leftGlassGatt == null) {
            Log.d(TAG, "Connecting to GATT for Left Glass...");
            leftGlassGatt = device.connectGatt(context, false, leftGattCallback);
            isLeftConnected = true;
        } else if (device.getName().contains("_R_") && rightGlassGatt == null) {
            Log.d(TAG, "Connecting to GATT for Right Glass...");
            rightGlassGatt = device.connectGatt(context, false, rightGattCallback);
            isRightConnected = true;
        }
    }

    private byte[] createTextPackage(String text, int currentPage, int totalPages, int screenStatus) {
        byte[] textBytes = text.getBytes();
        ByteBuffer buffer = ByteBuffer.allocate(9 + textBytes.length);
        buffer.put((byte) 0x4E);
        buffer.put((byte) (currentSeq++ & 0xFF));
        buffer.put((byte) 1);
        buffer.put((byte) 0);
        buffer.put((byte) screenStatus);
        buffer.put((byte) 0);
        buffer.put((byte) 0);
        buffer.put((byte) currentPage);
        buffer.put((byte) totalPages);
        buffer.put(textBytes);

        return buffer.array();
    }

    private void sendDataSequentially(byte[] data) {
        sendDataSequentially(data, false);
    }

    private void sendDataSequentially(byte[] data, boolean onlyLeft) {
        if (stopper) return;
        stopper = true;

        new Thread(() -> {
            try {
                if (leftGlassGatt != null && leftTxChar != null) {
                    leftTxChar.setValue(data);
                    leftGlassGatt.writeCharacteristic(leftTxChar);
                    Thread.sleep(DELAY_BETWEEN_SENDS_MS);
                }

                if (!onlyLeft && rightGlassGatt != null && rightTxChar != null) {
                    rightTxChar.setValue(data);
                    rightGlassGatt.writeCharacteristic(rightTxChar);
                    Thread.sleep(DELAY_BETWEEN_SENDS_MS);
                }
                stopper = false;
            } catch (InterruptedException e) {
                Log.e(TAG, "Error sending data: " + e.getMessage());
            }
        }).start();
    }

    @Override
    public void displayReferenceCardSimple(String title, String body) {
        displayReferenceCardSimple(title, body, 20);
    }

    private static final int NOTIFICATION = 0x4B; // Notification command
    private String createNotificationJson(String appIdentifier, String title, String subtitle, String message) {
        long currentTime = System.currentTimeMillis() / 1000L; // Unix timestamp in seconds
        String currentDate = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()); // Date format for 'date' field

        NCSNotification ncsNotification = new NCSNotification(
                notificationNum++,  // Increment sequence ID for uniqueness
                1,             // type (e.g., 1 = notification type)
                appIdentifier,
                title,
                subtitle,
                message,
                (int) currentTime,  // Cast long to int to match Python
                currentDate,        // Add the current date to the notification
                "AugmentOS" // display_name
        );

        Notification notification = new Notification(ncsNotification, "Add");

        Gson gson = new Gson();
        return gson.toJson(notification);
    }


    class Notification {
        NCSNotification ncs_notification;
        String type;

        public Notification() {
            // Default constructor
        }

        public Notification(NCSNotification ncs_notification, String type) {
            this.ncs_notification = ncs_notification;
            this.type = type;
        }
    }

    class NCSNotification {
        int msg_id;
        int type;
        String app_identifier;
        String title;
        String subtitle;
        String message;
        int time_s;  // Changed from long to int for consistency
        String date; // Added to match Python's date field
        String display_name;

        public NCSNotification(int msg_id, int type, String app_identifier, String title, String subtitle, String message, int time_s, String date, String display_name) {
            this.msg_id = msg_id;
            this.type = type;
            this.app_identifier = app_identifier;
            this.title = title;
            this.subtitle = subtitle;
            this.message = message;
            this.time_s = time_s;
            this.date = date; // Initialize the date field
            this.display_name = display_name;
        }
    }




    private List<byte[]> createNotificationChunks(String json) {
        final int MAX_CHUNK_SIZE = 176; // 180 - 4 header bytes
        byte[] jsonBytes = json.getBytes(StandardCharsets.UTF_8);
        int totalChunks = (int) Math.ceil((double) jsonBytes.length / MAX_CHUNK_SIZE);

        List<byte[]> chunks = new ArrayList<>();
        for (int i = 0; i < totalChunks; i++) {
            int start = i * MAX_CHUNK_SIZE;
            int end = Math.min(start + MAX_CHUNK_SIZE, jsonBytes.length);
            byte[] payloadChunk = Arrays.copyOfRange(jsonBytes, start, end);

            // Create the header
            byte[] header = new byte[] {
                    (byte) NOTIFICATION,
                    0x00, // notify_id (can be updated as needed)
                    (byte) totalChunks,
                    (byte) i
            };

            // Combine header and payload
            ByteBuffer chunk = ByteBuffer.allocate(header.length + payloadChunk.length);
            chunk.put(header);
            chunk.put(payloadChunk);

            chunks.add(chunk.array());
        }

        return chunks;
    }

    public void displayReferenceCardSimple(String title, String body, int lingerTime) {
//        if (!isConnected()) {
//            Log.d(TAG, "Not connected to glasses");
//            return;
//        }
//        if (debugStopper){
//            return;
//        }
//        debugStopper = true;
//
//        // Create JSON and chunks
////        String json = createNotificationJson("org.telegram.messenger", "Title", "This is sick", "and this is good too");
//        String json = createNotificationJson("org.telegram.messenger", "Test", "message", "Short message");
//        Log.d(TAG, "G1 Generated JSON: " + json);
//        List<byte[]> chunks = createNotificationChunks(json);
//
//        // Log chunks for debugging
//        for (byte[] chunk : chunks) {
//            Log.d(TAG, "Chunk: " + Arrays.toString(chunk));
//        }
//
//        // Send each chunk sequentially
//        for (byte[] chunk : chunks) {
//            sendDataSequentially(chunk);
//        }

        if (!isConnected()) {
            Log.d(TAG, "Cannot send notification: Not connected to glasses");
            return;
        }

        // Example notification data (replace with your actual data)
//        String json = createNotificationJson("com.augment.os", "QuestionAnswerer", "How much caffeine in dark chocolate?", "25 to 50 grams per piece");
        String json = createNotificationJson("com.augment.os", title, "...", body);
        Log.d(TAG, "the JSON to send: " + json);
        List<byte[]> chunks = createNotificationChunks(json);
//        Log.d(TAG, "THE CHUNKS:");
//        Log.d(TAG, chunks.get(0).toString());
//        Log.d(TAG, chunks.get(1).toString());
        for (byte[] chunk : chunks) {
            Log.d(TAG, "Sent chunk to glasses: " + bytesToUtf8(chunk));
        }

        // Send each chunk with a short sleep between each send
        for (byte[] chunk : chunks) {
            sendDataSequentially(chunk);

            // Sleep for 100 milliseconds between sending each chunk
            try {
                Thread.sleep(150);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }

        Log.d(TAG, "Sent simple reference card");
    }

    @Override
    public void destroy() {
        setMicEnabled(false, 0); // Disable the MIC
        if (leftGlassGatt != null) {
            leftGlassGatt.disconnect();
            leftGlassGatt.close();
        }
        if (rightGlassGatt != null) {
            rightGlassGatt.disconnect();
            rightGlassGatt.close();
        }

        // Stop periodic notifications
        stopPeriodicNotifications();

        if (bondingReceiver != null) {
            context.unregisterReceiver(bondingReceiver);
        }

        //stop sending heartbeat
        stopHeartbeat();
    }


    @Override
    public boolean isConnected() {
        return mConnectState == 2;
    }

    // Remaining methods
    @Override
    public void displayCenteredText(String text) {}

    @Override
    public void showNaturalLanguageCommandScreen(String prompt, String naturalLanguageInput) {}

    @Override
    public void updateNaturalLanguageCommandScreen(String naturalLanguageArgs) {}

    @Override
    public void scrollingTextViewIntermediateText(String text) {}

    @Override
    public void scrollingTextViewFinalText(String text) {}

    @Override
    public void stopScrollingTextViewMode() {}

    @Override
    public void displayPromptView(String title, String[] options) {}

    @Override
    public void displayTextLine(String text) {}

    @Override
    public void displayBitmap(Bitmap bmp) {}

    public void blankScreen() {}

    public void displayDoubleTextWall(String textTop, String textBottom) {}

    public void showHomeScreen() {}

    @Override
    public void setFontSize(SmartGlassesFontSize fontSize) {}

    public void displayRowsCard(String[] rowStrings) {}

    public void displayBulletList(String title, String[] bullets) {}

    public void displayReferenceCardImage(String title, String body, String imgUrl) {}

    public void displayTextWall(String a) {}

    public void setFontSizes() {}

    // Heartbeat methods
    private byte[] constructHeartbeat() {
        ByteBuffer buffer = ByteBuffer.allocate(6);
        buffer.put((byte) 0x25);
        buffer.put((byte) 6);
        buffer.put((byte) (currentSeq & 0xFF));
        buffer.put((byte) 0x00);
        buffer.put((byte) 0x04);
        buffer.put((byte) (currentSeq++ & 0xFF));
        return buffer.array();
    }

    private void startHeartbeat(int delay) {
        heartbeatRunnable = new Runnable() {
            @Override
            public void run() {
                sendHeartbeat();
                heartbeatHandler.postDelayed(this, HEARTBEAT_INTERVAL_MS);
            }
        };
        heartbeatHandler.postDelayed(heartbeatRunnable, delay);
    }

    private void sendWhiteListCommand(int delay) {
        if (whiteListedAlready){
            return;
        }
        whiteListedAlready = true;

        Log.d(TAG, "Sending whitelist command");
        whiteListHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                List<byte[]> chunks = getWhitelistChunks();
                for (byte[] chunk : chunks) {
                    Log.d(TAG, "Sending this chunk for white list:" + bytesToUtf8(chunk));
                    sendDataSequentially(chunk, false);

                    // Sleep for 100 milliseconds between sending each chunk
                    try {
                        Thread.sleep(150);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        }, delay);
    }

    private void stopHeartbeat() {
        if (heartbeatHandler != null) {
            heartbeatHandler.removeCallbacks(heartbeatRunnable);
        }
    }

    private void sendHeartbeat() {
        byte[] heartbeatPacket = constructHeartbeat();
        Log.d(TAG, "Sending heartbeat: " + bytesToHex(heartbeatPacket));

        new Thread(() -> {
            try {
                if (leftGlassGatt != null && leftTxChar != null) {
                    leftTxChar.setValue(heartbeatPacket);
                    leftGlassGatt.writeCharacteristic(leftTxChar);
                }
                if (rightGlassGatt != null && rightTxChar != null) {
                    rightTxChar.setValue(heartbeatPacket);
                    rightGlassGatt.writeCharacteristic(rightTxChar);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error sending heartbeat: " + e.getMessage());
            }
        }).start();
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X ", b));
        }
        return sb.toString().trim();
    }

    //microphone stuff
    public void setMicEnabled(boolean enable, int delay) {
        micEnableHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!isConnected()) {
                    Log.d(TAG, "Tryna start mic: Not connected to glasses");
                    return;
                }

                byte command = 0x0E; // Command for MIC control
                byte enableByte = (byte) (enable ? 1 : 0); // 1 to enable, 0 to disable

                ByteBuffer buffer = ByteBuffer.allocate(2);
                buffer.put(command);
                buffer.put(enableByte);

                sendDataSequentially(buffer.array());
                Log.d(TAG, "Sent MIC command: " + bytesToHex(buffer.array()));
            }
        }, delay);
    }

    //notifications
    private void startPeriodicNotifications(int delay) {
        if (notifysStarted){
            return;
        }
        notifysStarted = true;

        notificationRunnable = new Runnable() {
            @Override
            public void run() {
                // Send notification
                sendPeriodicNotification();

                // Schedule the next notification
                notificationHandler.postDelayed(this, 12000);
            }
        };

        // Start the first notification after 5 seconds
        notificationHandler.postDelayed(notificationRunnable, delay);
    }

    private void sendPeriodicNotification() {
        if (!isConnected()) {
            Log.d(TAG, "Cannot send notification: Not connected to glasses");
            return;
        }

        // Example notification data (replace with your actual data)
//        String json = createNotificationJson("com.augment.os", "QuestionAnswerer", "How much caffeine in dark chocolate?", "25 to 50 grams per piece");
        String json = createNotificationJson("com.augment.os", "QuestionAnswerer", "How much caffeine in dark chocolate?", "25 to 50 grams per piece");
        Log.d(TAG, "the JSON to send: " + json);
        List<byte[]> chunks = createNotificationChunks(json);
//        Log.d(TAG, "THE CHUNKS:");
//        Log.d(TAG, chunks.get(0).toString());
//        Log.d(TAG, chunks.get(1).toString());
        for (byte[] chunk : chunks) {
            Log.d(TAG, "Sent chunk to glasses: " + bytesToUtf8(chunk));
        }

        // Send each chunk with a short sleep between each send
        for (byte[] chunk : chunks) {
            sendDataSequentially(chunk);

            // Sleep for 100 milliseconds between sending each chunk
            try {
                Thread.sleep(150);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }

        Log.d(TAG, "Sent periodic notification");
    }

    private static String bytesToUtf8(byte[] bytes) {
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private void stopPeriodicNotifications() {
        if (notificationHandler != null && notificationRunnable != null) {
            notificationHandler.removeCallbacks(notificationRunnable);
            Log.d(TAG, "Stopped periodic notifications");
        }
    }

    // handle white list stuff
    private static final int WHITELIST_CMD = 0x04; // Command ID for whitelist
    public List<byte[]> getWhitelistChunks() {
        // Define the hardcoded whitelist JSON
        List<AppInfo> apps = new ArrayList<>();
        apps.add(new AppInfo("com.augment.os", "AugmentOS"));
        String whitelistJson = createWhitelistJson(apps);

        Log.d(TAG, "Creating chunks for hardcoded whitelist: " + whitelistJson);

        // Convert JSON to bytes and split into chunks
        return createWhitelistChunks(whitelistJson);
    }

    private String createWhitelistJson(List<AppInfo> apps) {
        JSONArray appList = new JSONArray();
        try {
            // Add each app to the list
            for (AppInfo app : apps) {
                JSONObject appJson = new JSONObject();
                appJson.put("id", app.getId());
                appJson.put("name", app.getName());
                appList.put(appJson);
            }

            JSONObject whitelistJson = new JSONObject();
            whitelistJson.put("calendar_enable", false);
            whitelistJson.put("call_enable", false);
            whitelistJson.put("msg_enable", false);
            whitelistJson.put("ios_mail_enable", false);

            JSONObject appObject = new JSONObject();
            appObject.put("list", appList);
            appObject.put("enable", true);

            whitelistJson.put("app", appObject);

            return whitelistJson.toString();
        } catch (JSONException e) {
            Log.e(TAG, "Error creating whitelist JSON: " + e.getMessage());
            return "{}";
        }
    }

    // Simple class to hold app info
    class AppInfo {
        private String id;
        private String name;

        public AppInfo(String id, String name) {
            this.id = id;
            this.name = name;
        }

        public String getId() { return id; }
        public String getName() { return name; }
    }

    // Helper function to split JSON into chunks
    private List<byte[]> createWhitelistChunks(String json) {
        final int MAX_CHUNK_SIZE = 180 - 4; // Reserve space for the header
        byte[] jsonBytes = json.getBytes(StandardCharsets.UTF_8);
        int totalChunks = (int) Math.ceil((double) jsonBytes.length / MAX_CHUNK_SIZE);

        List<byte[]> chunks = new ArrayList<>();
        for (int i = 0; i < totalChunks; i++) {
            int start = i * MAX_CHUNK_SIZE;
            int end = Math.min(start + MAX_CHUNK_SIZE, jsonBytes.length);
            byte[] payloadChunk = Arrays.copyOfRange(jsonBytes, start, end);

            // Create the header: [WHITELIST_CMD, total_chunks, chunk_index]
            byte[] header = new byte[] {
                    (byte) WHITELIST_CMD,  // Command ID
                    (byte) totalChunks,   // Total number of chunks
                    (byte) i              // Current chunk index
            };

            // Combine header and payload
            ByteBuffer buffer = ByteBuffer.allocate(header.length + payloadChunk.length);
            buffer.put(header);
            buffer.put(payloadChunk);

            chunks.add(buffer.array());
        }

        return chunks;
    }

    @Override
    public void displayCustomContent(String content){
        Log.d(TAG, "DISPLAY CUSTOM CONTENT");
    }
}