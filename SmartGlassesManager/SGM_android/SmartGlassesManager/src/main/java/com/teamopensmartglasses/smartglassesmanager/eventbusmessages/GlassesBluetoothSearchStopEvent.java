package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

public class GlassesBluetoothSearchStopEvent {
    public String modelName;

    public GlassesBluetoothSearchStopEvent(String modelName){
        this.modelName = modelName;
    }
}
