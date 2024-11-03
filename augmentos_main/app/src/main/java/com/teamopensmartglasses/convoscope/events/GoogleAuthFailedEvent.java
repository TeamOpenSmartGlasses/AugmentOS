package com.teamopensmartglasses.convoscope.events;

public class GoogleAuthFailedEvent {

    public String reason;
    public GoogleAuthFailedEvent(String newReason){this.reason = newReason;}
}
