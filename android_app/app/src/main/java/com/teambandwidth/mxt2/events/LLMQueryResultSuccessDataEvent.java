package com.teambandwidth.mxt2.events;

public class LLMQueryResultSuccessDataEvent {
    public String response;

    public LLMQueryResultSuccessDataEvent(String response){
        this.response = response;
    }
}
