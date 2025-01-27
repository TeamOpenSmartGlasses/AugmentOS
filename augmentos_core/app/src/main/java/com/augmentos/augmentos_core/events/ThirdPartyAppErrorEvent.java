package com.augmentos.augmentos_core.events;

public class ThirdPartyAppErrorEvent {
    public String packageName;
    public String text;

    public ThirdPartyAppErrorEvent(String packageName, String text){
        this.packageName = packageName;
        this.text = text;
    }
}
