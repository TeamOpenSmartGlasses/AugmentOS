package com.teamopensmartglasses.augmentoslib.events;

import com.teamopensmartglasses.augmentoslib.AugmentOSCommand;

import java.io.Serializable;
import java.util.UUID;

public class KillTpaEvent implements Serializable {
    public UUID uuid;
    public static final String eventId = "killTpaEvent";

    public KillTpaEvent(AugmentOSCommand command){
        this.uuid = command.getId();
    }

    public KillTpaEvent(UUID uuid) {
        this.uuid = uuid;
    }

}
