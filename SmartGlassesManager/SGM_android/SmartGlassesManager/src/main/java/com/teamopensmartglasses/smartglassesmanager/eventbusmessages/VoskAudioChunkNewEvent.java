package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

public class VoskAudioChunkNewEvent {
    public byte [] thisChunk;

    public VoskAudioChunkNewEvent(byte [] thisChunk){
        this.thisChunk = thisChunk;
    }
}
