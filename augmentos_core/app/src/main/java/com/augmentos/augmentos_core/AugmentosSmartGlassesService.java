package com.augmentos.augmentos_core;

import android.graphics.ImageFormat;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.MemoryFile;
import android.os.ParcelFileDescriptor;
import android.os.RemoteException;
import android.util.Log;

import com.augmentos.augmentos_core.events.AugmentosSmartGlassesDisconnectedEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.camera.CameraRecorder;
import com.augmentos.augmentos_core.smarterglassesmanager.camera.MemoryFileUtil;
import com.augmentos.augmentos_core.ui.AugmentosCoreUi;
import com.augmentos.augmentoslib.events.DiarizationOutputEvent;
import com.augmentos.augmentos_core.smarterglassesmanager.eventbusmessages.SmartGlassesConnectionStateChangedEvent;
import com.augmentos.augmentoslib.events.SmartRingButtonOutputEvent;
import com.augmentos.augmentoslib.events.SpeechRecOutputEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;

import com.augmentos.augmentos_core.smarterglassesmanager.smartglassesconnection.SmartGlassesAndroidService;
import com.augmentos.augmentos_core.smarterglassesmanager.smartglassescommunicators.SmartGlassesFontSize;
import com.augmentos.augmentos_core.smarterglassesmanager.speechrecognition.ASR_FRAMEWORKS;
import com.augmentos.augmentos_core.smarterglassesmanager.supportedglasses.SmartGlassesDevice;
import com.augmentos.augmentos_core.smarterglassesmanager.utils.SmartGlassesConnectionState;

public class AugmentosSmartGlassesService extends SmartGlassesAndroidService {
    public final String TAG = "AugmentOS_AugmentOSService";

    private final IBinder binder = new LocalBinder();

    String authToken = "";

    ArrayList<String> responsesBuffer;
    ArrayList<String> responsesToShare;
    private final Handler csePollLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable cseRunnableCode;
    private final Handler displayPollLoopHandler = new Handler(Looper.getMainLooper());

    private long currTime = 0;
    private long lastPressed = 0;
    private long lastTapped = 0;

    // Double clicking constants
    private final long doublePressTimeConst = 420;
    private final long doubleTapTimeConst = 600;
    public WindowManagerWithTimeouts windowManager;

    private CameraRecorder cameraRecorder;

    public AugmentosSmartGlassesService() {
        super(AugmentosCoreUi.class,
                "augmentos_app",
                3589,
                "AugmentOS SGM",
                "AugmentOS SmartGlassesManager", R.drawable.ic_launcher_foreground);
    }

    @Override
    public void onCreate() {
        //setup keys/settings before super
        saveChosenAsrFramework(this, ASR_FRAMEWORKS.AUGMENTOS_ASR_FRAMEWORK);

        super.onCreate();

        //setup event bus subscribers
        this.setupEventBusSubscribers();

        windowManager = new WindowManagerWithTimeouts(
                19, // globalTimeoutSeconds
                () -> {
                    sendHomeScreen();
                } // what to do when globally timed out
        );

        //start background camera
        cameraRecorder = new CameraRecorder(this, this);
        recordNSeconds(10);

    }

    @Override
    protected void onGlassesConnectionStateChanged(SmartGlassesDevice device, SmartGlassesConnectionState connectionState) {
        Log.d(TAG, "Glasses connected successfully: " + device.deviceModelName);
        setFontSize(SmartGlassesFontSize.MEDIUM);
        EventBus.getDefault().post(new SmartGlassesConnectionStateChangedEvent(device, connectionState));
    }

    @Override
    public void onDestroy(){
        EventBus.getDefault().post(new AugmentosSmartGlassesDisconnectedEvent());
        EventBus.getDefault().unregister(this);

        //if (windowManager != null) windowManager.stopQueue();
        if (windowManager != null) windowManager.shutdown();

        super.onDestroy();
    }

    @Subscribe
    public void onSmartRingButtonEvent(SmartRingButtonOutputEvent event) {
        int buttonId = event.buttonId;
        long time = event.timestamp;
        boolean isDown = event.isDown;

        if(!isDown || buttonId != 1) return;
        Log.d(TAG,"DETECTED BUTTON PRESS W BUTTON ID: " + buttonId);
        currTime = System.currentTimeMillis();

        //Detect double presses
        if(isDown && currTime - lastPressed < doublePressTimeConst) {
            Log.d(TAG, "Double tap - CurrTime-lastPressed: "+ (currTime-lastPressed));
        }

        if(isDown) {
            lastPressed = System.currentTimeMillis();
        }
    }

    @Subscribe
    public void onDiarizeData(DiarizationOutputEvent event) {
    }

    @Subscribe
    public void onTranscript(SpeechRecOutputEvent event) {

    }

//    private void sendFrameToCore(byte[] frameData, int width, int height) {
//        if (coreService == null) {
//            Log.e(TAG, "Core service is not bound!");
//            return;
//        }
//
//        try {
//            int bufferSize = frameData.length; // YUV420 estimated size should be correct
//            MemoryFile memoryFile = new MemoryFile("frameBuffer", bufferSize);
//            memoryFile.allowPurging(false); // Prevent unexpected memory release
//
//            // Write frame data correctly
//            OutputStream outputStream = memoryFile.getOutputStream();
//            outputStream.write(frameData);
//            outputStream.flush();
//            outputStream.close();
//
//            // Get file descriptor correctly
//            ParcelFileDescriptor pfd = MemoryFileUtil.getParcelFileDescriptor(memoryFile);
//
//            Log.d(TAG, "Sending frame to core: " + width + "x" + height);
//
//            // Send to core service
//            coreService.receiveSharedMemory(pfd, width, height, ImageFormat.YUV_420_888);
//
//            Log.d(TAG, "Frame send complete");
//
//            memoryFile.close(); // Clean up memory file after sending
//        } catch (IOException | RemoteException e) {
//            Log.e(TAG, "Error sending frame to core service", e);
//        } catch (IOException e) {
//            throw new RuntimeException(e);
//        }
//    }
//
//    private ParcelFileDescriptor getParcelFileDescriptor(MemoryFile memoryFile) throws IOException {
//        try {
//            Method method = MemoryFile.class.getDeclaredMethod("getFileDescriptor");
//            method.setAccessible(true);
//            FileDescriptor fd = (FileDescriptor) method.invoke(memoryFile);
//            return ParcelFileDescriptor.dup(fd);
//        } catch (Exception e) {
//            throw new IOException("Failed to get ParcelFileDescriptor from MemoryFile", e);
//        }
//    }
//
//    private FileOutputStream getMemoryFileOutputStream(MemoryFile memoryFile) throws IOException {
//        try {
//            Method method = MemoryFile.class.getDeclaredMethod("getFileDescriptor");
//            method.setAccessible(true);
//            FileDescriptor fd = (FileDescriptor) method.invoke(memoryFile);
//            return new FileOutputStream(fd);
//        } catch (Exception e) {
//            throw new IOException("Failed to get FileOutputStream from MemoryFile", e);
//        }
//    }
    //background camera stuff - designed for ASG running core locally
    private final Handler handler = new Handler(Looper.getMainLooper());

    private void recordNSeconds(int n) {
        Log.d(TAG, "Do record video in background for n seconds");

        startRecording();

        handler.postDelayed(() -> {
            stopRecording();
        }, n * 1000);
    }

    public void startRecording() {
        cameraRecorder.startRecording();
    }

    public void stopRecording() {
        cameraRecorder.stopRecording();
    }

    public void pauseRecording() {
        cameraRecorder.pauseRecording();
    }

    public void resumeRecording() {
        cameraRecorder.resumeRecording();
    }

    public void toggleTorch() {
        cameraRecorder.toggleTorch();
    }

    @Override
    public void onRecordingStarted(long startTime) {
        Log.d("AugmentosService", "Recording started at: " + startTime);
    }

    @Override
    public void onRecordingPaused() {
        Log.d("AugmentosService", "Recording paused.");
    }

    @Override
    public void onRecordingResumed() {
        Log.d("AugmentosService", "Recording resumed.");
    }

    @Override
    public void onRecordingStopped() {
        Log.d("AugmentosService", "Recording stopped.");
    }

    @Override
    public void onCameraError(String errorMessage) {
        Log.e("AugmentosService", "Camera error: " + errorMessage);
    }

    @Override
    public void onFrameAvailable(byte[] frameData, int width, int height) {
        Log.d(TAG, "SmartGlassesService received frame: " + width + "x" + height);
        sendFrameToCore(frameData, width, height);
    }

    public WindowManagerWithTimeouts getWindowManager() {
        return windowManager;
    }

    public void clearScreen() {
     sendHomeScreen();
    }
}
