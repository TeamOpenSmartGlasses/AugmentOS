/*
 * Copyright (c) 2022 Microoled.
 * Licensed under the Apache License, Version 2.0 (the “License”);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an “AS IS” BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.activelook.activelooksdk.core.ble;

import android.bluetooth.BluetoothDevice;
import android.os.Parcel;

import androidx.core.util.Consumer;

import com.activelook.activelooksdk.DiscoveredGlasses;
import com.activelook.activelooksdk.Glasses;
import com.activelook.activelooksdk.SerializedGlasses;

public class DiscoveredGlassesFromSerializedGlassesImpl implements DiscoveredGlasses {
    private BluetoothDevice device;
    private String manufacturer;
    private String name;
    private String address;

    public DiscoveredGlassesFromSerializedGlassesImpl(final SerializedGlasses serializedGlasses, final BluetoothDevice device) {
        this.device = device;
        this.manufacturer = serializedGlasses.getManufacturer();
        this.name = serializedGlasses.getName();
        this.address = serializedGlasses.getAddress();
    }

    /**
     * Get the manufacturer of the glasses.
     *
     * @return The manufacturer name
     */
    @Override
    public String getManufacturer() {
        return this.manufacturer;
    }

    /**
     * Get the name of the glasses.
     *
     * @return The name
     */
    @Override
    public String getName() {
        return this.name;
    }

    /**
     * Get the address of the glasses.
     *
     * @return The address
     */
    @Override
    public String getAddress() {
        return this.address;
    }

    /**
     * Connect to glasses and call callback on success.
     *
     * @param onConnected      Callback to call on success
     * @param onConnectionFail Callback to call on failure
     * @param onDisconnected   Callback to set for disconnected events.
     */
    @Override
    public void connect(Consumer<Glasses> onConnected, Consumer<DiscoveredGlasses> onConnectionFail, Consumer<Glasses> onDisconnected) {
        final SdkImpl sdk = BleSdkSingleton.getInstance();
        final Consumer<GlassesImpl> updater = g -> {
            g.lockConnection();
            g.setOnDisconnected(g4 -> {
                if (onConnectionFail != null) {
                    onConnectionFail.accept(this);
                }
            });
            sdk.registerConnectedGlasses(g);
            sdk.update(this, g,
                    g2 -> {
                        g.setOnDisconnected(onDisconnected);
                        g.unlockConnection();
                        onConnected.accept(g2);
                    },
                    g3 -> {
                        g.setOnDisconnected(onDisconnected);
                        g.unlockConnection();
                        onConnectionFail.accept(g3);
                    }
            );
        };
        new GlassesImpl(this, this.device, updater, onConnectionFail, onDisconnected);
    }

    /**
     * Cancel previously initiated glasses connection.
     */
    @Override
    public void cancelConnection() {
        final SdkImpl sdk = BleSdkSingleton.getInstance();
        final GlassesImpl glasses = sdk.getConnectedBleGlasses(this.getAddress());
        if (glasses == null) {
            throw new UnsupportedOperationException("Already disconnected.");
        }
        glasses.disconnect();
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeParcelable(this.device, flags);
        dest.writeString(this.manufacturer);
        dest.writeString(this.name);
        dest.writeString(this.address);
    }

    public void readFromParcel(Parcel source) {
        this.device = source.readParcelable(BluetoothDevice.class.getClassLoader());
        this.manufacturer = source.readString();
        this.name = source.readString();
        this.address = source.readString();
    }

    protected DiscoveredGlassesFromSerializedGlassesImpl(Parcel in) {
        this.device = in.readParcelable(BluetoothDevice.class.getClassLoader());
        this.manufacturer = in.readString();
        this.name = in.readString();
        this.address = in.readString();
    }

    public static final Creator<DiscoveredGlassesFromSerializedGlassesImpl> CREATOR = new Creator<DiscoveredGlassesFromSerializedGlassesImpl>() {
        @Override
        public DiscoveredGlassesFromSerializedGlassesImpl createFromParcel(Parcel source) {
            return new DiscoveredGlassesFromSerializedGlassesImpl(source);
        }

        @Override
        public DiscoveredGlassesFromSerializedGlassesImpl[] newArray(int size) {
            return new DiscoveredGlassesFromSerializedGlassesImpl[size];
        }
    };
}
