/*

Copyright 2021 Microoled
Licensed under the Apache License, Version 2.0 (the “License”);
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an “AS IS” BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
package com.activelook.activelooksdk.core.ble;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.util.Pair;
import android.widget.Toast;

import androidx.core.util.Consumer;
import androidx.core.util.Predicate;

import com.activelook.activelooksdk.SerializedGlasses;
import com.activelook.activelooksdk.DiscoveredGlasses;
import com.activelook.activelooksdk.Glasses;
import com.activelook.activelooksdk.Sdk;
import com.activelook.activelooksdk.exceptions.UnsupportedBleException;
import com.activelook.activelooksdk.types.GlassesUpdate;

import java.util.HashMap;

@SuppressLint("MissingPermission")
class SdkImpl implements Sdk {

    private final Context context;
    private final GlassesUpdater updater;
    private final BluetoothManager manager;
    private final BluetoothAdapter adapter;
    private final BluetoothLeScanner scanner;
    private final HashMap<String, GlassesImpl> connectedGlasses = new HashMap<>();
    private final BroadcastReceiver broadcastReceiver;
    private ScanCallback scanCallback;

    SdkImpl(Context context,
            String token,
            Consumer<GlassesUpdate> onUpdateStart,
            Consumer<Pair<GlassesUpdate, Runnable>> onUpdateAvailableCallback,
            Consumer<GlassesUpdate> onUpdateProgress,
            Consumer<GlassesUpdate> onUpdateSuccess,
            Consumer<GlassesUpdate> onUpdateError) throws UnsupportedBleException {
        this.context = context;
        this.updater = new GlassesUpdater(
                context,
                token,
                onUpdateStart,
                onUpdateAvailableCallback,
                onUpdateProgress,
                onUpdateSuccess,
                onUpdateError);
        this.manager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        this.adapter = this.manager.getAdapter();
        if (this.adapter == null) {
            throw new UnsupportedBleException();
        }
        this.broadcastReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                final String action = intent.getAction();
                if (action.equals(BluetoothAdapter.ACTION_STATE_CHANGED)) {
                    final int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                    switch (state) {
                        case BluetoothAdapter.STATE_OFF:
                            break;
                        case BluetoothAdapter.STATE_TURNING_OFF:
                            for(final GlassesImpl g: SdkImpl.this.connectedGlasses.values()) {
                                g.unlockConnection();
                                g.gattCallbacks.gattDelegate.disconnect();
                            }
                            break;
                        case BluetoothAdapter.STATE_ON:
                            if (SdkImpl.this.connectedGlasses.values() != null) {
                                for(final GlassesImpl g: SdkImpl.this.connectedGlasses.values()) {
                                    final BluetoothDevice device = SdkImpl.this.adapter.getRemoteDevice(g.getAddress());
                                    g.reconnect(device);
                                }
                            }
                            break;
                        case BluetoothAdapter.STATE_TURNING_ON:
                            break;
                    }
                }
            }
        };
        this.context.registerReceiver(this.broadcastReceiver, new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED));
        this.scanner = this.adapter.getBluetoothLeScanner();
    }

    public Context getContext() {
        return this.context;
    }

    @Override
    public BroadcastReceiver getBroadcastReceiver() {
        return this.broadcastReceiver;
    }

    private void toast(String text) {
        Toast.makeText(this.context, text, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void startScan(Consumer<DiscoveredGlasses> onDiscoverGlasses) {
        this.scanCallback = new ScanCallbackImpl(onDiscoverGlasses);
        this.scanner.startScan(this.scanCallback);
    }

    @Override
    public void stopScan() {
        this.scanner.stopScan(this.scanCallback);
        this.scanCallback = null;
    }

    @Override
    public boolean isScanning() {
        return this.scanCallback != null;
    }

    /**
     * Connect to glasses and call callback on success.
     *
     * @param serializedGlasses The previously connected glasses representation
     * @param onConnected       Callback to call on success
     * @param onConnectionFail  Callback to call on failure
     * @param onDisconnected    Callback to set for disconnected events.
     */
    @Override
    public void connect(
            final SerializedGlasses serializedGlasses,
            final Consumer<Glasses> onConnected,
            final Consumer<DiscoveredGlasses> onConnectionFail,
            final Consumer<Glasses> onDisconnected) {
        final BluetoothDevice device = this.adapter.getRemoteDevice(serializedGlasses.getAddress());
        final DiscoveredGlasses dg = new DiscoveredGlassesFromSerializedGlassesImpl(serializedGlasses, device);
        dg.connect(onConnected, onConnectionFail, onDisconnected);
    }

    /**
     * Cancel previously initiated glasses connection.
     *
     * @param discoveredGlasses The glasses we are connecting to
     */
    @Override
    public void cancelConnection(DiscoveredGlasses discoveredGlasses) {
        discoveredGlasses.cancelConnection();
    }

    /**
     * Cancel previously initiated glasses connection.
     *
     * @param serializedGlasses The glasses we are connecting to
     */
    @Override
    public void cancelConnection(SerializedGlasses serializedGlasses) {
        final BluetoothDevice device = this.adapter.getRemoteDevice(serializedGlasses.getAddress());
        new DiscoveredGlassesFromSerializedGlassesImpl(serializedGlasses, device).cancelConnection();;
    }

    void registerConnectedGlasses(GlassesImpl bleGlasses) {
        this.connectedGlasses.put(bleGlasses.getAddress(), bleGlasses);
    }

    void unregisterConnectedGlasses(GlassesImpl bleGlasses) {
        this.connectedGlasses.remove(bleGlasses.getAddress());
    }

    GlassesImpl getConnectedBleGlasses(final String address) {
        return this.connectedGlasses.get(address);
    }

    void update(final DiscoveredGlasses discoveredGlasses, final GlassesImpl glasses, final Consumer<Glasses> onConnected, Consumer<DiscoveredGlasses> onConnectionFail) {
        this.updater.update(discoveredGlasses, glasses, onConnected, onConnectionFail);
    }

    @Override
    protected void finalize() throws Throwable {
        this.context.unregisterReceiver(this.broadcastReceiver);
        super.finalize();
    }

}
