package com.teamopensmartglasses.smartglassesmanager.hci;

import java.nio.ByteBuffer;

public interface AudioChunkCallback{
    void onSuccess(ByteBuffer chunk);
}