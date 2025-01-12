package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

public class SetSensingEnabledEvent {

    public boolean enabled;

    public SetSensingEnabledEvent(boolean newEnabled){
        this.enabled = newEnabled;
    }
}
