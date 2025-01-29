package com.augmentos.smartglassesmanager.eventbusmessages;

import com.augmentos.smartglassesmanager.smartglassescommunicators.SmartGlassesFontSize;

public class SetFontSizeEvent {

    public SmartGlassesFontSize fontSize;

    public SetFontSizeEvent(SmartGlassesFontSize newFontSize){
        this.fontSize = newFontSize;
    }
}
