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

import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.util.Log;

import androidx.core.util.Consumer;

import com.activelook.activelooksdk.DiscoveredGlasses;

import java.util.ArrayList;
import java.util.List;

class ScanCallbackImpl extends ScanCallback {

    private final Consumer<DiscoveredGlasses> onDiscoverGlasses;
    private final ArrayList<String> results;

    ScanCallbackImpl(Consumer<DiscoveredGlasses> onDiscoverGlasses) {
        super();
        this.onDiscoverGlasses = onDiscoverGlasses;
        this.results = new ArrayList<>();
    }

    @Override
    public void onScanResult(int callbackType, ScanResult result) {
        super.onScanResult(callbackType, result);
        DiscoveredGlassesImpl dGlasses = new DiscoveredGlassesImpl(result);
        if (dGlasses.getManufacturer().endsWith("DAFA")) {
            if (callbackType != ScanSettings.CALLBACK_TYPE_MATCH_LOST) {
                if (!this.results.contains(dGlasses.getAddress())) {
                    this.results.add(dGlasses.getAddress());
                    this.onDiscoverGlasses.accept(dGlasses);
                }
            }
        }
    }

    @Override
    public void onBatchScanResults(List<ScanResult> results) {
        super.onBatchScanResults(results);
    }

    @Override
    public void onScanFailed(int errorCode) {
        super.onScanFailed(errorCode);
        if (errorCode == ScanCallback.SCAN_FAILED_ALREADY_STARTED) {
            Log.d("BleSdk", "onScanFailed(SCAN_FAILED_ALREADY_STARTED)");
        } else {
            Log.d("BleSdk", "onScanFailed(OTHER)");
        }
    }

}
