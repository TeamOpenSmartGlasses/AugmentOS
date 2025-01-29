package com.augmentos.smartglassesmanager.eventbusmessages;

public class SetSensingEnabledEvent {

    public boolean enabled;

    public SetSensingEnabledEvent(boolean newEnabled){
        this.enabled = newEnabled;
    }
}
