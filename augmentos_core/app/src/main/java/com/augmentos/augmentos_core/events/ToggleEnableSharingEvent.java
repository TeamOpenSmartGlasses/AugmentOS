package com.augmentos.augmentos_core.events;

public class ToggleEnableSharingEvent {
    public boolean enabled;

    public ToggleEnableSharingEvent(Boolean newEnabled){
        enabled = newEnabled;
    }
}
