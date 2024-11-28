package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.AugmentOSCommand;

import java.io.Serializable;

public class RegisterCommandRequestEvent implements Serializable {
    public AugmentOSCommand command;
    public static final String eventId = "registerCommandRequestEvent";

    public RegisterCommandRequestEvent(AugmentOSCommand command){
        this.command = command;
    }

    public static String getEventId(){
        return("registerCommandRequestEvent");
    }
}
