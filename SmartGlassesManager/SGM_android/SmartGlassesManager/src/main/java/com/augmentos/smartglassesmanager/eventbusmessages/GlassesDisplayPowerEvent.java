package com.augmentos.smartglassesmanager.eventbusmessages;

public class GlassesDisplayPowerEvent {
    public boolean turnedOn;
    public GlassesDisplayPowerEvent(boolean turnedOn){
        this.turnedOn = turnedOn;
    }
}
