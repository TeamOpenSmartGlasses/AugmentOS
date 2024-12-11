package com.teamopensmartglasses.augmentoslib.events;

import java.io.Serializable;

public class CoreToManagerOutputEvent implements Serializable {
    public String jsonData;
    public static final String eventId = "coreSystemMessageOutputEvent";

    public CoreToManagerOutputEvent(String newJsonData){
        this.jsonData = newJsonData;
    }
}