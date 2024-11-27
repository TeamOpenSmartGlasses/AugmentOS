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
package com.activelook.activelooksdk;

import android.os.Parcelable;

import androidx.core.util.Consumer;

/**
 * Representation of a discovered glasses before connection.
 */
public interface DiscoveredGlasses extends Parcelable {

    /**
     * Get the manufacturer of the glasses.
     *
     * @return The manufacturer name
     */
    String getManufacturer();
    /**
     * Get the name of the glasses.
     *
     * @return The name
     */
    String getName();
    /**
     * Get the address of the glasses.
     *
     * @return The address
     */
    String getAddress();
    /**
     * Connect to glasses and call callback on success.
     *
     * @param onConnected      Callback to call on success
     * @param onConnectionFail Callback to call on failure
     * @param onDisconnected   Callback to set for disconnected events.
     */
    void connect(
            Consumer<Glasses> onConnected,
            Consumer<DiscoveredGlasses> onConnectionFail,
            Consumer<Glasses> onDisconnected
    );

    /**
     * Cancel previously initiated glasses connection.
     */
    void cancelConnection();
}
