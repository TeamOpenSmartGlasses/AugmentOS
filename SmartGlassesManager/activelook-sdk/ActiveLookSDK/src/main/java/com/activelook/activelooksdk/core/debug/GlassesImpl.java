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

import android.os.Parcel;
import android.util.Log;

import androidx.core.util.Consumer;

import com.activelook.activelooksdk.Glasses;
import com.activelook.activelooksdk.SerializedGlasses;
import com.activelook.activelooksdk.core.AbstractGlasses;
import com.activelook.activelooksdk.types.DeviceInformation;
import com.activelook.activelooksdk.types.FlowControlStatus;

class GlassesImpl extends AbstractGlasses implements Glasses {

    public static final Creator<GlassesImpl> CREATOR = new Creator<GlassesImpl>() {
        @Override
        public GlassesImpl createFromParcel(Parcel source) {
            return new GlassesImpl(source);
        }

        @Override
        public GlassesImpl[] newArray(int size) {
            return new GlassesImpl[size];
        }
    };
    private DiscoveredGlassesImpl connectedFrom;

    GlassesImpl(DiscoveredGlassesImpl discoveredGlasses, Consumer<Glasses> onConnected) {
        super();
        this.connectedFrom = discoveredGlasses;
        onConnected.accept(this);
    }

    protected GlassesImpl(Parcel in) {
        this.connectedFrom = in.readParcelable(DiscoveredGlassesImpl.class.getClassLoader());
    }

    @Override
    public String getManufacturer() {
        return this.connectedFrom.getManufacturer();
    }

    @Override
    public String getName() {
        return this.connectedFrom.getName();
    }

    @Override
    public String getAddress() {
        return this.connectedFrom.getAddress();
    }

    /**
     * Get a serialized representation of this glasses for persistence storage
     */
    @Override
    public SerializedGlasses getSerializedGlasses() {
        return new SerializedGlasses() {
            @Override
            public String getAddress() {
                return GlassesImpl.this.getAddress();
            }

            @Override
            public String getManufacturer() {
                return GlassesImpl.this.getManufacturer();
            }

            @Override
            public String getName() {
                return GlassesImpl.this.getName();
            }
        };
    }

    @Override
    public boolean isFirmwareAtLeast(String version) {
        return true;
    }

    @Override
    public int compareFirmwareVersion(String version) {
        return 1;
    }

    @Override
    public void disconnect() {
    }

    @Override
    public void setOnDisconnected(Consumer<Glasses> onDisconnected) {
    }

    @Override
    public DeviceInformation getDeviceInformation() {
        return null;
    }

    @Override
    public void subscribeToBatteryLevelNotifications(Consumer<Integer> onEvent) {
    }

    @Override
    public void subscribeToFlowControlNotifications(Consumer<FlowControlStatus> onEvent) {
    }

    @Override
    public void subscribeToSensorInterfaceNotifications(Runnable onEvent) {
    }

    @Override
    public void writeBytes(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        String prefix = "[ ";
        for (byte aByte : bytes) {
            result.append(String.format("%s0x%02X", prefix, aByte));
            prefix = ", ";
        }
        Log.w("DebugGlasses", String.format("writeCommand(%s ])", result.toString()));
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeParcelable(this.connectedFrom, flags);
    }

    public void readFromParcel(Parcel source) {
        this.connectedFrom = source.readParcelable(DiscoveredGlassesImpl.class.getClassLoader());
    }

}
