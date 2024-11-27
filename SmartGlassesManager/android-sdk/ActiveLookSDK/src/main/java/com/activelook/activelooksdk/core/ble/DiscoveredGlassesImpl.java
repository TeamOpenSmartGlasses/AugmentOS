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

import android.bluetooth.le.ScanResult;
import android.os.Parcel;

import androidx.core.util.Consumer;

import com.activelook.activelooksdk.DiscoveredGlasses;
import com.activelook.activelooksdk.Glasses;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

class DiscoveredGlassesImpl implements DiscoveredGlasses {

    public static final Creator<DiscoveredGlassesImpl> CREATOR = new Creator<DiscoveredGlassesImpl>() {
        @Override
        public DiscoveredGlassesImpl createFromParcel(Parcel source) {
            return new DiscoveredGlassesImpl(source);
        }

        @Override
        public DiscoveredGlassesImpl[] newArray(int size) {
            return new DiscoveredGlassesImpl[size];
        }
    };
    protected ScanResult scanResult;
    private Map<Integer, byte[]> hashRecord;

    public DiscoveredGlassesImpl(ScanResult result) {
        this.scanResult = result;
        this.hashRecord = DiscoveredGlassesImpl.mapRecord(this.scanResult.getScanRecord().getBytes());
    }

    protected DiscoveredGlassesImpl(Parcel in) {
        this.scanResult = in.readParcelable(ScanResult.class.getClassLoader());
        int hashRecordSize = in.readInt();
        this.hashRecord = new HashMap<>(hashRecordSize);
        for (int i = 0; i < hashRecordSize; i++) {
            Integer key = (Integer) in.readValue(Integer.class.getClassLoader());
            byte[] value = in.createByteArray();
            this.hashRecord.put(key, value);
        }
    }

    private static final Map<Integer, byte[]> mapRecord(byte[] scanRecord) {
        Map<Integer, byte[]> ret = new HashMap<>();
        int index = 0;
        while (index < scanRecord.length) {
            int length = scanRecord[index++];
            if (length == 0) break;
            int type = scanRecord[index];
            if (type == 0) break;
            ret.put(type, Arrays.copyOfRange(scanRecord, index + 1, index + length));
            index += length;
        }
        return ret;
    }

    private static final String recordToHex(byte[] data) {
        if (data.length == 0) {
            return "";
        }
        String result = "";
        for (byte datum : data) {
            result = String.format("%02X%s", datum, result);
        }
        return result;
    }

    @Override
    public String getManufacturer() {
        if (this.hashRecord.containsKey(-1)) {
            return DiscoveredGlassesImpl.recordToHex(this.hashRecord.get(-1));
        }
        return "";
    }

    @Override
    public String getName() {
        return this.scanResult.getScanRecord().getDeviceName();
    }

    @Override
    public String getAddress() {
        return this.scanResult.getDevice().getAddress();
    }

    @Override
    public void connect(
            Consumer<Glasses> onConnected,
            Consumer<DiscoveredGlasses> onConnectionFail,
            Consumer<Glasses> onDisconnected
    ) {
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
        new GlassesImpl(this, updater, onConnectionFail, onDisconnected);
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
        dest.writeParcelable(this.scanResult, flags);
        dest.writeInt(this.hashRecord.size());
        for (Map.Entry<Integer, byte[]> entry : this.hashRecord.entrySet()) {
            dest.writeValue(entry.getKey());
            dest.writeByteArray(entry.getValue());
        }
    }

    public void readFromParcel(Parcel source) {
        this.scanResult = source.readParcelable(ScanResult.class.getClassLoader());
        int hashRecordSize = source.readInt();
        this.hashRecord = new HashMap<>(hashRecordSize);
        for (int i = 0; i < hashRecordSize; i++) {
            Integer key = (Integer) source.readValue(Integer.class.getClassLoader());
            byte[] value = source.createByteArray();
            this.hashRecord.put(key, value);
        }
    }

}
