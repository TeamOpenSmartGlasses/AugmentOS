package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

public class FoundGlassesBluetoothDeviceEvent {
    public String modelName;
    public String deviceName;

    public FoundGlassesBluetoothDeviceEvent(String modelName, String deviceName){
        this.modelName = modelName;
        this.deviceName = deviceName;
    }
}
