package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

public class PostGenericGlobalMessageEvent {
    public String message;

    public PostGenericGlobalMessageEvent(String newMessage){
        this.message = newMessage;
    }
}
