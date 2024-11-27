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

import androidx.core.util.Consumer;

import com.activelook.activelooksdk.DiscoveredGlasses;
import com.activelook.activelooksdk.Glasses;

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
    private String manufacturer;
    private String name;
    private String address;

    DiscoveredGlassesImpl(String manufacturer, String name, String address) {
        super();
        this.manufacturer = manufacturer;
        this.name = name;
        this.address = address;
    }

    protected DiscoveredGlassesImpl(Parcel in) {
        this.manufacturer = in.readString();
        this.name = in.readString();
        this.address = in.readString();
    }

    @Override
    public String getManufacturer() {
        return this.manufacturer;
    }

    @Override
    public String getName() {
        return this.name;
    }

    @Override
    public String getAddress() {
        return this.address;
    }

    @Override
    public void connect(
            Consumer<Glasses> onConnected,
            Consumer<DiscoveredGlasses> onConnectionFail,
            Consumer<Glasses> onDisconnected
    ) {
        new GlassesImpl(this, onConnected);
    }

    /**
     * Cancel previously initiated glasses connection.
     */
    @Override
    public void cancelConnection() {
        throw new UnsupportedOperationException("Already connected");
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeString(this.manufacturer);
        dest.writeString(this.name);
        dest.writeString(this.address);
    }

    public void readFromParcel(Parcel source) {
        this.manufacturer = source.readString();
        this.name = source.readString();
        this.address = source.readString();
    }

}
