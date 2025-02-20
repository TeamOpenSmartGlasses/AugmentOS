package com.augmentos.augmentos_core.smarterglassesmanager.camera;


import android.os.MemoryFile;
import android.os.ParcelFileDescriptor;
import java.io.FileDescriptor;
import java.io.IOException;
import java.lang.reflect.Method;

public class MemoryFileUtil {
    public static ParcelFileDescriptor getParcelFileDescriptor(MemoryFile memoryFile) throws IOException {
        try {
            Method method = MemoryFile.class.getDeclaredMethod("getFileDescriptor");
            method.setAccessible(true);
            FileDescriptor fd = (FileDescriptor) method.invoke(memoryFile);
            return ParcelFileDescriptor.dup(fd);
        } catch (Exception e) {
            throw new IOException("Failed to get ParcelFileDescriptor from MemoryFile", e);
        }
    }
}