package com.wearableintelligencesystem.androidsmartglasses.sensors;

import java.nio.ByteBuffer;

public interface AudioChunkCallback{
    void onSuccess(ByteBuffer chunk);
}
