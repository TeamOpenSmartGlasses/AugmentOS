package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.AugmentOSCommand;
import com.teamopensmartglasses.augmentoslib.ThirdPartyApp;

import java.io.Serializable;
import java.util.UUID;

public class KillTpaEvent implements Serializable {
    public ThirdPartyApp tpa;
    public static final String eventId = "killTpaEvent";

    public KillTpaEvent(ThirdPartyApp tpa){
        this.tpa = tpa;
    }

}
