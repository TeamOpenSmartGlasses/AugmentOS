package com.augmentos.augmentos_core.smarterglassesmanager.camera;

import static android.hardware.camera2.CameraDevice.TEMPLATE_RECORD;

import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.media.Image;
import android.media.ImageReader;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import android.util.Log;
import android.util.Range;
import android.view.Surface;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class CameraRecorder {
    private static final String TAG = "CameraRecorder";

    private final Context context;
    private final CameraManager cameraManager;
    private final CameraRecorderCallback callback;

    private CameraDevice cameraDevice;
    private CameraCaptureSession captureSession;
    private CaptureRequest.Builder captureRequestBuilder;
    private ImageReader imageReader;
    private Handler backgroundHandler;
    private boolean isTorchOn = false;
    private long recordingStartTime;
    private RecordingState recordingState = RecordingState.NONE;
    private CameraRecorderCallback cameraRecorderCallback;

    public interface CameraRecorderCallback {
        void onRecordingStarted(long startTime);
        void onRecordingPaused();
        void onRecordingResumed();
        void onRecordingStopped();
        void onCameraError(String errorMessage);
        void onFrameAvailable(byte[] frameData, int width, int height);
    }

    public enum RecordingState {
        NONE, IN_PROGRESS, PAUSED
    }

    public void setCameraRecorderCallback(CameraRecorderCallback cameraRecorderCallback) {
        this.cameraRecorderCallback = cameraRecorderCallback;
    }

    public CameraRecorder(Context context, CameraRecorderCallback callback) {
        this.context = context;
        this.callback = callback;
        this.cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
        initBackgroundHandler();
    }

    private void initBackgroundHandler() {
        HandlerThread backgroundThread = new HandlerThread("CameraBackground");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());
    }

    public boolean isRecording() {
        return recordingState == RecordingState.IN_PROGRESS;
    }

    public boolean isPaused() {
        return recordingState == RecordingState.PAUSED;
    }

    public void startRecording() {
        if (recordingState != RecordingState.NONE) {
            Log.w(TAG, "Recording is already in progress.");
            return;
        }
        openCamera();
    }

    public void stopRecording() {
        try {
            if (recordingState == RecordingState.NONE) return;

            Log.d(TAG, "Stopping recording.");
            if (captureSession != null) {
                captureSession.stopRepeating();
                captureSession.close();
                captureSession = null;
            }
            if (cameraDevice != null) {
                cameraDevice.close();
                cameraDevice = null;
            }
            if (imageReader != null) {
                imageReader.close();
                imageReader = null;
            }

            recordingState = RecordingState.NONE;
            callback.onRecordingStopped();
        } catch (Exception e) {
            Log.e(TAG, "Error stopping recording", e);
        }
    }

    public void pauseRecording() {
        if (recordingState == RecordingState.IN_PROGRESS) {
            recordingState = RecordingState.PAUSED;
            callback.onRecordingPaused();
        }
    }

    public void resumeRecording() {
        if (recordingState == RecordingState.PAUSED) {
            recordingState = RecordingState.IN_PROGRESS;
            callback.onRecordingResumed();
        } else if (cameraDevice == null) {
            openCamera();
        }
    }

    private void openCamera() {
        try {
            if (ActivityCompat.checkSelfPermission(context, android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                callback.onCameraError("Camera permission not granted.");
                return;
            }

            String selectedCameraId = getCameraId();
            if (selectedCameraId == null) {
                callback.onCameraError("No suitable camera found.");
                return;
            }

            cameraManager.openCamera(selectedCameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(@NonNull CameraDevice camera) {
                    cameraDevice = camera;
                    createCameraPreviewSession();
                }

                @Override
                public void onDisconnected(@NonNull CameraDevice camera) {
                    camera.close();
                    cameraDevice = null;
                }

                @Override
                public void onError(@NonNull CameraDevice camera, int error) {
                    camera.close();
                    cameraDevice = null;
                    callback.onCameraError("Camera error: " + error);
                }
            }, backgroundHandler);
        } catch (CameraAccessException e) {
            callback.onCameraError("Error accessing camera: " + e.getMessage());
        }
    }

    private String getCameraId() throws CameraAccessException {
        for (String cameraId : cameraManager.getCameraIdList()) {
            CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(cameraId);
            if (characteristics.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK) {
                return cameraId;
            }
        }
        return null;
    }

    private byte[] convertYUV420ToByteArray(Image image) {
        int width = image.getWidth();
        int height = image.getHeight();
        Image.Plane[] planes = image.getPlanes();

        // YUV420: Y (width * height), U (width/2 * height/2), V (width/2 * height/2)
        int ySize = width * height;
        int uvSize = (width / 2) * (height / 2);
        int size = ySize + (uvSize * 2); // Total YUV size

        byte[] data = new byte[size];

        ByteBuffer bufferY = planes[0].getBuffer();
        ByteBuffer bufferU = planes[1].getBuffer();
        ByteBuffer bufferV = planes[2].getBuffer();

        // Copy Y plane
        bufferY.get(data, 0, ySize);

        // Copy U and V planes (Planar format)
        int uvStride = ySize;
        ByteBuffer rowU = bufferU.duplicate();
        ByteBuffer rowV = bufferV.duplicate();

        for (int row = 0; row < height / 2; row++) {
            int rowOffset = row * (width / 2);
            rowU.position(rowOffset);
            rowV.position(rowOffset);
            rowU.get(data, uvStride + rowOffset * 2, width / 2);
            rowV.get(data, uvStride + rowOffset * 2 + 1, width / 2);
        }

        return data;
    }


    private void createCameraPreviewSession() {
        try {
            captureRequestBuilder = cameraDevice.createCaptureRequest(TEMPLATE_RECORD);
            List<Surface> surfaces = new ArrayList<>();

            // Initialize ImageReader for capturing frames
            imageReader = ImageReader.newInstance(1920, 1080, ImageFormat.YUV_420_888, 2);
            imageReader.setOnImageAvailableListener(reader -> {
                try (Image image = reader.acquireLatestImage()) {
                    if (image == null) return;
                    Log.d(TAG, "Raw frame received.");

                    // Convert YUV_420_888 Image to Byte Array
                    byte[] frameData = convertYUV420ToByteArray(image);

                    // Send frame to the Smart Glasses Service
                    callback.onFrameAvailable(frameData, image.getWidth(), image.getHeight());

                } catch (Exception e) {
                    Log.e(TAG, "Error processing camera frame", e);
                }
            }, backgroundHandler);


            surfaces.add(imageReader.getSurface());
            captureRequestBuilder.addTarget(imageReader.getSurface());

            Range<Integer> fpsRange = Range.create(30, 30);
            captureRequestBuilder.set(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, fpsRange);

            cameraDevice.createCaptureSession(surfaces, new CameraCaptureSession.StateCallback() {
                @Override
                public void onConfigured(@NonNull CameraCaptureSession session) {
                    captureSession = session;
                    try {
                        session.setRepeatingRequest(captureRequestBuilder.build(), null, backgroundHandler);
                        recordingStartTime = SystemClock.elapsedRealtime();
                        recordingState = RecordingState.IN_PROGRESS;
                        callback.onRecordingStarted(recordingStartTime);
                    } catch (CameraAccessException e) {
                        callback.onCameraError("Failed to start preview session.");
                    }
                }

                @Override
                public void onConfigureFailed(@NonNull CameraCaptureSession session) {
                    callback.onCameraError("Camera session configuration failed.");
                }
            }, backgroundHandler);
        } catch (CameraAccessException e) {
            callback.onCameraError("Error creating capture session: " + e.getMessage());
        }
    }

    public void toggleTorch() {
        if (cameraDevice != null) {
            try {
                isTorchOn = !isTorchOn;
                captureRequestBuilder.set(CaptureRequest.FLASH_MODE, isTorchOn ? CaptureRequest.FLASH_MODE_TORCH : CaptureRequest.FLASH_MODE_OFF);
                captureSession.setRepeatingRequest(captureRequestBuilder.build(), null, backgroundHandler);
            } catch (CameraAccessException e) {
                callback.onCameraError("Error toggling torch.");
            }
        }
    }
}
