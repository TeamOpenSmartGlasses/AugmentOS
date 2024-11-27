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
package com.activelook.activelooksdk.core.debug;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.os.AsyncTask;
import android.util.Log;

import androidx.core.util.Consumer;

import com.activelook.activelooksdk.SerializedGlasses;
import com.activelook.activelooksdk.DiscoveredGlasses;
import com.activelook.activelooksdk.Glasses;
import com.activelook.activelooksdk.Sdk;

import java.util.concurrent.atomic.AtomicBoolean;

class SdkImpl implements Sdk {

    private final AtomicBoolean isScanning = new AtomicBoolean(false);

    @Override
    public void startScan(Consumer<DiscoveredGlasses> onDiscoverGlasses) {
        this.isScanning.set(true);
        AsyncTask.execute(() -> {
            int i = 0;
            while (SdkImpl.this.isScanning.get()) {
                i++;
                String manu = String.format("Manufacturer %d", i);
                String name = String.format("Name %d", i);
                String addr = String.format("Address %d", i);
                onDiscoverGlasses.accept(new DiscoveredGlassesImpl(manu, name, addr));
                try {
                    //noinspection BusyWait
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    Log.e("SCAN", "Sleep error", e);
                }
            }
        });
    }

    @Override
    public void stopScan() {
        this.isScanning.set(false);
    }

    @Override
    public boolean isScanning() {
        return this.isScanning.get();
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
    public void connect(SerializedGlasses serializedGlasses, Consumer<Glasses> onConnected, Consumer<DiscoveredGlasses> onConnectionFail, Consumer<Glasses> onDisconnected) {

    }

    /**
     * Cancel previously initiated glasses connection.
     *
     * @param discoveredGlasses The glasses we are connecting to
     */
    @Override
    public void cancelConnection(DiscoveredGlasses discoveredGlasses) {

    }

    /**
     * Cancel previously initiated glasses connection.
     *
     * @param serializedGlasses The glasses we are connecting to
     */
    @Override
    public void cancelConnection(SerializedGlasses serializedGlasses) {

    }

    @Override
    public Context getContext() {
        return null;
    }

    @Override
    public BroadcastReceiver getBroadcastReceiver() {
        return null;
    }

}
