package com.augmentos.augmentoslib.events;

import com.augmentos.augmentoslib.ThirdPartyApp;

import java.io.Serializable;

public class KillTpaEvent implements Serializable {
    public ThirdPartyApp tpa;
    public static final String eventId = "killTpaEvent";

    public KillTpaEvent(ThirdPartyApp tpa){
        this.tpa = tpa;
    }

}
