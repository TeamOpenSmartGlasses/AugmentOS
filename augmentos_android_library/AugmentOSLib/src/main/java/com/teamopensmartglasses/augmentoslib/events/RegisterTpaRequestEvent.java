package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.AugmentOSCommand;
import com.teamopensmartglasses.augmentoslib.ThirdPartyApp;

import java.io.Serializable;

public class RegisterTpaRequestEvent implements Serializable {
    public ThirdPartyApp thirdPartyApp;
    public static final String eventId = "registerTpaRequestEvent";

    public RegisterTpaRequestEvent(ThirdPartyApp thirdPartyApp){
        this.thirdPartyApp = thirdPartyApp;
    }

    public static String getEventId(){
        return("registerCommandRequestEvent");
    }
}
