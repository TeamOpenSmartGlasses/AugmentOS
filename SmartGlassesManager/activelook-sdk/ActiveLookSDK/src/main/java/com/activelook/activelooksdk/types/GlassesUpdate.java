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
package com.activelook.activelooksdk.types;

import com.activelook.activelooksdk.DiscoveredGlasses;

public interface GlassesUpdate {

    DiscoveredGlasses getDiscoveredGlasses();
    State getState();
    double getProgress();
    int getBatteryLevel();
    String getSourceFirmwareVersion();
    String getTargetFirmwareVersion();
    String getSourceConfigurationVersion();
    String getTargetConfigurationVersion();
    enum State {
        // FW_UPDATE_AVAILABLE,
        // CONFIG_UPDATE_AVAILABLE,
        DOWNLOADING_FIRMWARE,
        UPDATING_FIRMWARE,
        DOWNLOADING_CONFIGURATION,
        UPDATING_CONFIGURATION,
        UP_TO_DATE,
        ERROR_UPDATE_FAIL,
        ERROR_UPDATE_FAIL_LOW_BATTERY,
        ERROR_UPDATE_FORBIDDEN,
        ERROR_DOWNGRADE_FORBIDDEN,
    }

}
