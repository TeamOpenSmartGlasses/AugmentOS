package com.teamopensmartglasses.convoscope.events;

public class UserIdChangedEvent {
    public String userId;

    public UserIdChangedEvent(String newUserId){
        userId = newUserId;
    }
}
