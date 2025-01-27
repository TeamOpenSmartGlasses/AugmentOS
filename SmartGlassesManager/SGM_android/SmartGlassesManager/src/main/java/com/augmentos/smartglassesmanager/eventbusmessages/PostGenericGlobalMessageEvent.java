package com.augmentos.smartglassesmanager.eventbusmessages;

public class PostGenericGlobalMessageEvent {
    public String message;

    public PostGenericGlobalMessageEvent(String newMessage){
        this.message = newMessage;
    }
}
