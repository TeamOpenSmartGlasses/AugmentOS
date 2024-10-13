package com.teamopensmartglasses.convoscope.comms;

// In AugmentOS_Main (puck)

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothGattServer;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.content.Intent;
import android.os.IBinder;
import android.os.ParcelUuid;
import android.util.Log;

import java.util.UUID;


import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.os.Handler;
import android.util.Log;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.UUID;
import android.app.Service;

public class BluetoothService {
    private static final String TAG = "BluetoothService";
    private static final String NAME = "AugmentOS";
    private static final UUID MY_UUID = UUID.fromString("fa87c0d0-afac-11de-8a39-0800200c9a66");

    private final BluetoothAdapter bluetoothAdapter;
    private final Handler handler;
    private BluetoothServerSocket serverSocket;

    public BluetoothService(BluetoothAdapter bluetoothAdapter, Handler handler) {
        this.bluetoothAdapter = bluetoothAdapter;
        this.handler = handler;
    }

    public void startBluetoothServer() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                BluetoothSocket socket = null;
                try {
                    serverSocket = bluetoothAdapter.listenUsingRfcommWithServiceRecord(NAME, MY_UUID);
                    Log.d(TAG, "Bluetooth server started. Waiting for connections...");
                    socket = serverSocket.accept();
                } catch (IOException e) {
                    Log.e(TAG, "Error starting Bluetooth server", e);
                }

                if (socket != null) {
                    manageConnectedSocket(socket);
                }
            }
        }).start();
    }

    private void manageConnectedSocket(BluetoothSocket socket) {
        Log.d(TAG, "Bluetooth connection established");
        InputStream inStream;
        OutputStream outStream;

        try {
            inStream = socket.getInputStream();
            outStream = socket.getOutputStream();

            byte[] buffer = new byte[1024];
            int bytes;

            while (true) {
                bytes = inStream.read(buffer);
                String incomingMessage = new String(buffer, 0, bytes);
                Log.d(TAG, "Received message: " + incomingMessage);

                // Send a response
                String response = "Message received!";
                outStream.write(response.getBytes());
            }
        } catch (IOException e) {
            Log.e(TAG, "Error managing Bluetooth connection", e);
        }
    }

    public void stopBluetoothServer() {
        try {
            if (serverSocket != null) {
                serverSocket.close();
            }
        } catch (IOException e) {
            Log.e(TAG, "Error closing Bluetooth server", e);
        }
    }
}