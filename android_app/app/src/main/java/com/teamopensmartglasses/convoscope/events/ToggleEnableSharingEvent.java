package com.teamopensmartglasses.convoscope.events;

public class ToggleEnableSharingEvent {
    public boolean enabled;

    public ToggleEnableSharingEvent(Boolean newEnabled){
        enabled = newEnabled;
    }
}
