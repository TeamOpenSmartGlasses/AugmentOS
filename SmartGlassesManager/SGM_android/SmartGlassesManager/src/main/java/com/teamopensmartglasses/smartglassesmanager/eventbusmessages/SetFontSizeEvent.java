package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

import com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators.SmartGlassesFontSize;

public class SetFontSizeEvent {

    public SmartGlassesFontSize fontSize;

    public SetFontSizeEvent(SmartGlassesFontSize newFontSize){
        this.fontSize = newFontSize;
    }
}
