package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

public class GoogleAudioChunkNewEvent {
    public byte [] thisChunk;

    public GoogleAudioChunkNewEvent(byte [] thisChunk){
        this.thisChunk = thisChunk;
    }
}
