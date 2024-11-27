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

import java.util.UUID;

interface BleUUID {

    /**
     * TODO: Explain more GenericAccessService
     */
    UUID BleNotificationDescriptor =
            UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more GenericAccessService
     */
    UUID GenericAccessService =
            UUID.fromString("00001800-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more DeviceNameCharacteristic
     */
    UUID DeviceNameCharacteristic =
            UUID.fromString("00002a00-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more AppearanceCharacteristic
     */
    UUID AppearanceCharacteristic =
            UUID.fromString("00002a01-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more PeripheralPreferredConnectionParametersCharacteristic
     */
    UUID PeripheralPreferredConnectionParametersCharacteristic =
            UUID.fromString("00002a02-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more DeviceInformationService
     */
    UUID DeviceInformationService =
            UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more ManufacturerNameCharacteristic
     */
    UUID ManufacturerNameCharacteristic =
            UUID.fromString("00002a29-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more ModelNumberCharacteristic
     */
    UUID ModelNumberCharacteristic =
            UUID.fromString("00002a24-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more SerialNumberCharacteristic
     */
    UUID SerialNumberCharacteristic =
            UUID.fromString("00002a25-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more HardwareVersionCharacteristic
     */
    UUID HardwareVersionCharacteristic =
            UUID.fromString("00002a27-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more FirmwareVersionCharacteristic
     */
    UUID FirmwareVersionCharacteristic =
            UUID.fromString("00002a26-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more SoftwareVersionCharacteristic
     */
    UUID SoftwareVersionCharacteristic =
            UUID.fromString("00002a28-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more DeviceInformationCharacteristicsUUIDs
     */
    UUID[] DeviceInformationCharacteristicsUUIDs = new UUID[]{
            ManufacturerNameCharacteristic,
            ModelNumberCharacteristic,
            SerialNumberCharacteristic,
            HardwareVersionCharacteristic,
            FirmwareVersionCharacteristic,
            SoftwareVersionCharacteristic,
    };
    /**
     * TODO: Explain more BatteryService
     */
    UUID BatteryService =
            UUID.fromString("0000180f-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more BatteryLevelCharacteristic
     */
    UUID BatteryLevelCharacteristic =
            UUID.fromString("00002a19-0000-1000-8000-00805f9b34fb");
    /**
     * TODO: Explain more ActiveLookCommandsInterfaceService
     */
    UUID ActiveLookCommandsInterfaceService =
            UUID.fromString("0783b03e-8535-b5a0-7140-a304d2495cb7");
    /**
     * TODO: Explain more ActiveLookTxCharacteristic
     */
    UUID ActiveLookTxCharacteristic =
            UUID.fromString("0783b03e-8535-b5a0-7140-a304d2495cb8");
    /**
     * TODO: Explain more ActiveLookRxCharacteristic
     */
    UUID ActiveLookRxCharacteristic =
            UUID.fromString("0783b03e-8535-b5a0-7140-a304d2495cba");
    /**
     * TODO: Explain more ActiveLookUICharacteristic
     */
    UUID ActiveLookUICharacteristic =
            UUID.fromString("0783b03e-8535-b5a0-7140-a304d2495cbc");
    /**
     * TODO: Explain more ActiveLookFlowControlCharacteristic
     */
    UUID ActiveLookFlowControlCharacteristic =
            UUID.fromString("0783b03e-8535-b5a0-7140-a304d2495cb9");
    /**
     * TODO: Explain more ActiveLookSensorInterfaceCharacteristic
     */
    UUID ActiveLookSensorInterfaceCharacteristic =
            UUID.fromString("0783b03e-8535-b5a0-7140-a304d2495cbb");
    /**
     * TODO: Explain more ActiveLookCharacteristicsUUIDS
     */
    UUID[] ActiveLookCharacteristicsUUIDS = new UUID[]{
            ActiveLookTxCharacteristic,
            ActiveLookRxCharacteristic,
            ActiveLookUICharacteristic,
            ActiveLookFlowControlCharacteristic,
            ActiveLookSensorInterfaceCharacteristic,
    };

}
