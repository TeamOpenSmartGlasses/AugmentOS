package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.AugmentOSCommand;

import java.io.Serializable;

public class SubscribeDataStreamRequestEvent implements Serializable {
    public String dataStreamType;
    public static final String eventId = "subscribeDataStreamRequestEvent";

    public SubscribeDataStreamRequestEvent(String dataStreamType){
        this.dataStreamType = dataStreamType;
    }

    public static String getEventId(){
        return("subscribeDataStreamRequestEvent");
    }
}
