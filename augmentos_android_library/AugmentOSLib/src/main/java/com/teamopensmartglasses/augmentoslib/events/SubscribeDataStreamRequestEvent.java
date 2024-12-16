package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.AugmentOSCommand;
import com.teamopensmartglasses.augmentoslib.DataStreamType;

import java.io.Serializable;

public class SubscribeDataStreamRequestEvent implements Serializable {
    public DataStreamType dataStreamType;
    public static final String eventId = "subscribeDataStreamRequestEvent";

    public SubscribeDataStreamRequestEvent(DataStreamType dataStreamType){
        this.dataStreamType = dataStreamType;
    }

    public static String getEventId(){
        return("subscribeDataStreamRequestEvent");
    }
}
