package com.caydenpierce.contextualsearchengine.events;

public class LLMQueryResultSuccessDataEvent {
    public String response;

    public LLMQueryResultSuccessDataEvent(String response){
        this.response = response;
    }
}
