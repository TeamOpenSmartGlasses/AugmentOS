package com.teamopensmartglasses.smartglassesmanager.camera;

import static android.hardware.camera2.CameraDevice.StateCallback;
import static android.hardware.camera2.CameraDevice.TEMPLATE_RECORD;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.SystemClock;
import android.preference.PreferenceManager;
import android.util.Log;
import android.util.Range;
import android.view.Surface;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.arthenica.ffmpegkit.FFmpegKit;
import com.arthenica.ffmpegkit.ReturnCode;
import com.teamopensmartglasses.smartglassesmanager.R;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class CameraRecordingService extends Service {

    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_ID = "CameraRecordingServiceChannel";

    private static final String TAG = "CameraRecordingService";

    private ImageReader imageReader;
    private CameraDevice cameraDevice;
    private CameraCaptureSession captureSession;

    private CaptureRequest.Builder captureRequestBuilder;

    private Surface previewSurface;

    private LocationHelper locationHelper;

    private File tempFileBeingProcessed;

    private CameraManager cameraManager;

    private RecordingState recordingState = RecordingState.NONE;

    private boolean isTorchOn = false;

    private Handler backgroundHandler;


    public boolean isRecording() {
        return recordingState.equals(RecordingState.IN_PROGRESS);
    }

    public boolean isPaused() {
        return recordingState.equals(RecordingState.PAUSED);
    }

    public boolean isWorkingInProgress() { return !recordingState.equals(RecordingState.NONE) || isProcessingWatermark; }

    private boolean isProcessingWatermark = false;

    private long recordingStartTime;

    private SharedPreferencesManager sharedPreferencesManager;

    @Override
    public void onCreate() {
        super.onCreate();

        locationHelper = new LocationHelper(getApplicationContext());

        createNotificationChannel();

        sharedPreferencesManager = SharedPreferencesManager.getInstance(getApplicationContext());

        // Initialize ImageReader for raw frames
        imageReader = ImageReader.newInstance(
                sharedPreferencesManager.getCameraResolution().getWidth(),
                sharedPreferencesManager.getCameraResolution().getHeight(),
                ImageFormat.YUV_420_888,
                2 // Buffer count
        );

        // Listen for new frames
        imageReader.setOnImageAvailableListener(reader -> {
            try (Image image = reader.acquireLatestImage()) {
                if (image == null) return;
                // TODO: Process raw frame data here (convert, share, etc.)
                Log.d(TAG, "got raw frame from background camera");
            }
        }, backgroundHandler);

        cameraManager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);

        HandlerThread backgroundThread = new HandlerThread("CameraBackground");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());

        Log.d(TAG, "Service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Checks if the intent is null
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            if (action != null) {
                switch (intent.getAction()) {
                    case Constants.INTENT_ACTION_START_RECORDING:
                        // Show notification immediately before starting recording
                        setupRecordingInProgressNotification();
                        startRecording();
                        break;
                    case Constants.INTENT_ACTION_PAUSE_RECORDING:
                        pauseRecording();
                        break;
                    case Constants.INTENT_ACTION_RESUME_RECORDING:
                        setupSurfaceTexture(intent);
                        resumeRecording();
                        break;
                    case Constants.INTENT_ACTION_CHANGE_SURFACE:
                        setupSurfaceTexture(intent);
                        createCameraPreviewSession();
                        break;
                    case Constants.INTENT_ACTION_STOP_RECORDING:
                        stopRecording();
                        break;
                    case Constants.BROADCAST_ON_RECORDING_STATE_REQUEST:
                        broadcastOnRecordingStateCallback();

                        if (!isWorkingInProgress()) {
                            stopSelf();
                        }
                        break;
                    case Constants.BROADCAST_ON_TORCH_STATE_REQUEST:
                        if (cameraDevice != null) {
                            try {
                                isTorchOn = !isTorchOn;
                                captureRequestBuilder.set(CaptureRequest.FLASH_MODE,
                                        isTorchOn ? CaptureRequest.FLASH_MODE_TORCH : CaptureRequest.FLASH_MODE_OFF);
                                captureSession.setRepeatingRequest(captureRequestBuilder.build(), null, null);

                                // Broadcast state change
                                Intent torchIntent = new Intent(Constants.BROADCAST_ON_TORCH_STATE_CHANGED);
                                torchIntent.putExtra(Constants.INTENT_EXTRA_TORCH_STATE, isTorchOn);
                                sendBroadcast(torchIntent);

                                Log.d(TAG, "Recording camera torch turned " + (isTorchOn ? "ON" : "OFF"));
                            } catch (CameraAccessException e) {
                                Log.e(TAG, "Error toggling torch during recording: " + e.getMessage());
                            }
                        } else {
                            Log.e(TAG, "Cannot toggle torch - camera not initialized");
                        }
                        break;
                }
            }
        }
        return START_STICKY;
    }

    private void setupSurfaceTexture(Intent intent)
    {
        previewSurface = intent.getParcelableExtra("SURFACE");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();

        Log.d(TAG, "Service destroyed");

        cancelNotification();
        stopRecording();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createCameraPreviewSession() {
        if (captureSession != null) {
            captureSession.close();
            captureSession = null;
        }

        if(cameraDevice == null) {
            openCamera();
            return;
        }

        try {
            // First create the capture request builder
            captureRequestBuilder = cameraDevice.createCaptureRequest(TEMPLATE_RECORD);
            
            // Now we can safely set the flash mode
            captureRequestBuilder.set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_OFF);

            List<Surface> surfaces = new ArrayList<>();

            if(previewSurface != null && previewSurface.isValid()) {
                captureRequestBuilder.addTarget(previewSurface);
                surfaces.add(previewSurface);
            }

            // Attach ImageReader surface for raw frames
            surfaces.add(imageReader.getSurface());
            captureRequestBuilder.addTarget(imageReader.getSurface());

            Range<Integer> fpsRange = Range.create(sharedPreferencesManager.getVideoFrameRate(), 
                                                sharedPreferencesManager.getVideoFrameRate());
            captureRequestBuilder.set(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, fpsRange);
            
            cameraDevice.createCaptureSession(surfaces, new CaptureSessionCallback(), null);
        } catch (CameraAccessException e) {
            Log.e(TAG, "createCameraPreviewSession: Error while creating capture session", e);
        }
    }


    public class CaptureSessionCallback extends CameraCaptureSession.StateCallback {
        @Override
        public void onConfigured(@NonNull CameraCaptureSession cameraCaptureSession) {
            captureSession = cameraCaptureSession;

            try {
                cameraCaptureSession.setRepeatingRequest(captureRequestBuilder.build(), null, null);
            } catch (CameraAccessException | IllegalArgumentException e) {
                Log.e(TAG, "onConfigured: Error setting repeating request", e);
                e.printStackTrace();
            } catch (IllegalStateException e) {
                Log.e(TAG, "onConfigured: Error camera session", e);
                e.printStackTrace();
            }

            if (recordingState.equals(RecordingState.NONE)) {
                recordingStartTime = SystemClock.elapsedRealtime();
                setupRecordingInProgressNotification();
                recordingState = RecordingState.IN_PROGRESS;
                broadcastOnRecordingStarted();
            } else if (recordingState.equals(RecordingState.PAUSED)) {
                setupRecordingInProgressNotification();
                recordingState = RecordingState.IN_PROGRESS;
                broadcastOnRecordingResumed();
            }
        }

        @Override
        public void onConfigureFailed(@NonNull CameraCaptureSession session) {
            Log.e(TAG, "onConfigureFailed: Failed to configure capture session");
        }
    }

    private void broadcastOnRecordingStarted() {
        Intent broadcastIntent = new Intent(Constants.BROADCAST_ON_RECORDING_STARTED);
        broadcastIntent.putExtra(Constants.INTENT_EXTRA_RECORDING_START_TIME, recordingStartTime);
        broadcastIntent.putExtra(Constants.INTENT_EXTRA_RECORDING_STATE, recordingState);
        getApplicationContext().sendBroadcast(broadcastIntent);
    }

    private void broadcastOnRecordingResumed() {
        Intent broadcastIntent = new Intent(Constants.BROADCAST_ON_RECORDING_RESUMED);
        getApplicationContext().sendBroadcast(broadcastIntent);
    }

    private void broadcastOnRecordingPaused() {
        Intent broadcastIntent = new Intent(Constants.BROADCAST_ON_RECORDING_PAUSED);
        getApplicationContext().sendBroadcast(broadcastIntent);
    }

    private void broadcastOnRecordingStopped() {
        Intent broadcastIntent = new Intent(Constants.BROADCAST_ON_RECORDING_STOPPED);
        getApplicationContext().sendBroadcast(broadcastIntent);
    }

    private void broadcastOnRecordingStateCallback() {
        Intent broadcastIntent = new Intent(Constants.BROADCAST_ON_RECORDING_STATE_CALLBACK);
        broadcastIntent.putExtra(Constants.INTENT_EXTRA_RECORDING_STATE, recordingState);
        getApplicationContext().sendBroadcast(broadcastIntent);
    }

    private void openCamera() {
        Log.d(TAG, "openCamera: Opening camera");
        CameraManager manager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
        try {
            // Log available camera IDs
            String[] cameraIds = manager.getCameraIdList();
            Log.d(TAG, "Available camera IDs: " + Arrays.toString(cameraIds));

            // Safely get camera selection
            CameraType cameraType = sharedPreferencesManager.getCameraSelection();
            
            // Find the camera ID based on the camera type
            String selectedCameraId = null;
            for (String cameraId : cameraIds) {
                CameraCharacteristics characteristics = manager.getCameraCharacteristics(cameraId);
                int cameraDirection = characteristics.get(CameraCharacteristics.LENS_FACING);
                
                if ((cameraType == CameraType.FRONT && cameraDirection == CameraCharacteristics.LENS_FACING_FRONT) ||
                    (cameraType == CameraType.BACK && cameraDirection == CameraCharacteristics.LENS_FACING_BACK)) {
                    selectedCameraId = cameraId;
                    break;
                }
            }

            if (selectedCameraId == null) {
                Log.e(TAG, "No camera found for type: " + cameraType);
                stopSelf();
                return;
            }

            manager.openCamera(selectedCameraId, new StateCallback() {
                @Override
                public void onOpened(@NonNull CameraDevice camera) {
                    Log.d(TAG, "onOpened: Camera opened successfully");
                    cameraDevice = camera;
                    createCameraPreviewSession();
                }

                @Override
                public void onDisconnected(@NonNull CameraDevice camera) {
                    Log.w(TAG, "onDisconnected: Camera disconnected");
                    camera.close();
                    cameraDevice = null;
                    stopSelf();
                }

                @Override
                public void onError(@NonNull CameraDevice camera, int error) {
                    Log.e(TAG, "onError: Camera error: " + error);
                    camera.close();
                    cameraDevice = null;
                    stopSelf();
                }
            }, null);
        } catch (CameraAccessException e) {
            Log.e(TAG, "openCamera: Error accessing camera", e);
            stopSelf();
        } catch (SecurityException e) {
            Log.e(TAG, "openCamera: Camera permission denied", e);
            stopSelf();
        } catch (Exception e) {
            Log.e(TAG, "openCamera: Unexpected error", e);
            stopSelf();
        }
    }

    private void startRecording() {
        try {
            sharedPreferencesManager.setRecordingInProgress(true);

            if (!Environment.getExternalStorageState().equals(Environment.MEDIA_MOUNTED)) {
                Log.e(TAG, "startRecording: External storage not available, cannot start recording.");
                return;
            }

            openCamera();
        } catch (Exception e) {
            Log.e(TAG, "Error starting recording", e);
            sharedPreferencesManager.setRecordingInProgress(false);
        }
    }

    private void resumeRecording()
    {
        try {
            sharedPreferencesManager.setRecordingInProgress(true);

            if(cameraDevice != null) {
                setupRecordingInProgressNotification();
                recordingState = RecordingState.IN_PROGRESS;
                broadcastOnRecordingResumed();
            } else {
                openCamera();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error resuming recording", e);
            sharedPreferencesManager.setRecordingInProgress(false);
        }
    }

    private void pauseRecording()
    {
        try {
            sharedPreferencesManager.setRecordingInProgress(false);

            recordingState = RecordingState.PAUSED;

            setupRecordingResumeNotification();

            broadcastOnRecordingPaused();
        } catch (Exception e) {
            Log.e(TAG, "Error pausing recording", e);
        }
    }

    private void stopRecording() {
        try {
            sharedPreferencesManager.setRecordingInProgress(false);

            if (recordingState.equals(RecordingState.NONE)) {
                return;
            }

            Log.d(TAG, "stopRecording: Attempting to stop recording.");

            // 1) Safely stop capture requests before stopping the recorder
            if (captureSession != null) {
                try {
                    captureSession.stopRepeating();
                    // Optionally use captureSession.abortCaptures() if needed
                } catch (CameraAccessException e) {
                    Log.e(TAG, "stopRepeating error: " + e.getMessage());
                }
            }

            // 2) If already paused, resume first (only if we truly are paused)
//            if (mediaRecorder != null) {
//                try {
//                    if (recordingState == RecordingState.PAUSED) {
//                        mediaRecorder.resume();
//                        // Maybe add a small delay to ensure the resume is processed
//                        Thread.sleep(300);
//                    }
//
//                    // 3) Now stop
//                    mediaRecorder.stop();
//                    mediaRecorder.reset();
//                } catch (IllegalStateException e) {
//                    Log.e(TAG, "Error calling mediaRecorder.stop()", e);
//                } catch (InterruptedException e) {
//                    Log.e(TAG, "Thread sleep interrupted", e);
//                } finally {
//                    mediaRecorder.release();
//                    mediaRecorder = null;
//                    stopForeground(true);
//                }
//            }

            // 4) Close the capture session & camera
            if (captureSession != null) {
                captureSession.close();
                captureSession = null;
            }
            if (cameraDevice != null) {
                cameraDevice.close();
                cameraDevice = null;
            }

            // 5) Close the ImageReader so no more raw frames arrive
            if (imageReader != null) {
                imageReader.close();
                imageReader = null;
            }

            // 6) Update state, handle notification, etc.
            recordingState = RecordingState.NONE;
            cancelNotification();

//            processLatestVideoFileWithWatermark();
            broadcastOnRecordingStopped();

            if (!isWorkingInProgress()) {
                stopSelf();
            }

        } catch (Exception e) {
            Log.e(TAG, "Error stopping recording", e);
        }
    }

    private void processLatestVideoFileWithWatermark() {
        isProcessingWatermark = true;
        File latestVideoFile = getLatestVideoFile();
        if (latestVideoFile != null) {
            String inputFilePath = latestVideoFile.getAbsolutePath();
            String originalFileName = latestVideoFile.getName().replace("temp_", "");
            String outputFilePath = latestVideoFile.getParent() + "/FADCAM_" + originalFileName;
            Log.d(TAG, "Watermarking: Input file path: " + inputFilePath);
            Log.d(TAG, "Watermarking: Output file path: " + outputFilePath);

            tempFileBeingProcessed = latestVideoFile;
            addTextWatermarkToVideo(inputFilePath, outputFilePath);
        } else {
            Log.e(TAG, "No video file found.");
        }
        isProcessingWatermark = false;
    }

    private void addTextWatermarkToVideo(String inputFilePath, String outputFilePath) {
        String fontPath = getFilesDir().getAbsolutePath() + "/ubuntu_regular.ttf";
        String watermarkText;
        String watermarkOption = sharedPreferencesManager.getWatermarkOption();

        boolean isLocationEnabled = sharedPreferencesManager.isLocalisationEnabled();
        String locationText = isLocationEnabled ? getLocationData() : "";

        switch (watermarkOption) {
            case "timestamp":
                watermarkText = getCurrentTimestamp() + (isLocationEnabled ? locationText : "");
                break;
            case "no_watermark":
                String ffmpegCommandNoWatermark = String.format("-i %s -codec copy %s", inputFilePath, outputFilePath);
                executeFFmpegCommand(ffmpegCommandNoWatermark);
                return;
            default:
                watermarkText = "Captured by FadCam - " + getCurrentTimestamp() + (isLocationEnabled ? locationText : "");
                break;
        }

        // Convert the watermark text to English numerals
        watermarkText = convertArabicNumeralsToEnglish(watermarkText);

        // Get and convert the font size to English numerals
        int fontSize = getFontSizeBasedOnBitrate();
        String fontSizeStr = convertArabicNumeralsToEnglish(String.valueOf(fontSize));

        Log.d(TAG, "Watermark Text: " + watermarkText);
        Log.d(TAG, "Font Path: " + fontPath);
        Log.d(TAG, "Font Size: " + fontSizeStr);

        int frameRates = sharedPreferencesManager.getVideoFrameRate();
        int bitratesEstimated = Utils.estimateBitrate(sharedPreferencesManager.getCameraResolution(), frameRates);

        String codec = sharedPreferencesManager.getVideoCodec().getFfmpeg();

        // Construct the FFmpeg command
        String ffmpegCommand = String.format(
                "-i %s -r %s -vf \"drawtext=text='%s':x=10:y=10:fontsize=%s:fontcolor=white:fontfile=%s\" -q:v 0 -codec:v %s -b:v %s -codec:a copy %s",
                inputFilePath, frameRates, watermarkText, fontSizeStr, fontPath, codec, bitratesEstimated, outputFilePath
        );

        executeFFmpegCommand(ffmpegCommand);
    }

    private int getFontSizeBasedOnBitrate() {
        int fontSize;
        long videoBitrate = getVideoBitrate(); // Ensure this method retrieves the correct bitrate based on the selected quality

        if (videoBitrate <= 1000000) {
            fontSize = 12; //SD quality
        } else if (videoBitrate == 10000000) {
            fontSize = 24; // FHD quality
        } else {
            fontSize = 16; // HD or higher quality
        }

        Log.d(TAG, "Determined Font Size: " + fontSize);
        return fontSize;
    }

    private int getVideoBitrate() {
        int videoBitrate = Utils.estimateBitrate(sharedPreferencesManager.getCameraResolution(), sharedPreferencesManager.getVideoFrameRate());
        Log.d(TAG, "Selected Video Bitrate: " + videoBitrate + " bps");
        return videoBitrate;
    }

    private void executeFFmpegCommand(String ffmpegCommand) {
        Log.d(TAG, "FFmpeg Command: " + ffmpegCommand);
        FFmpegKit.executeAsync(ffmpegCommand, session -> {
            if (ReturnCode.isSuccess(session.getReturnCode())) {
                Log.d(TAG, "Watermark added successfully.");
                // Start monitoring temp files
                startMonitoring();

                // Notify the adapter to update the thumbnail
                File latestVideo = getLatestVideoFile();
                if (latestVideo != null) {
                    String videoFilePath = latestVideo.getAbsolutePath();
                    updateThumbnailInAdapter(videoFilePath);
                }

                stopSelf();

            } else {
                Log.e(TAG, "Failed to add watermark: " + session.getFailStackTrace());
            }
        });
    }

    private void startMonitoring() {
        final long CHECK_INTERVAL_MS = 1000; // 1 second

        Executors.newSingleThreadScheduledExecutor().scheduleWithFixedDelay(this::checkAndDeleteSpecificTempFile, 0, CHECK_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }

    private void checkAndDeleteSpecificTempFile() {
        if (tempFileBeingProcessed != null) {
            // Construct FADCAM_ filename with the same timestamp
            String outputFilePath = tempFileBeingProcessed.getParent() + "/" + Constants.RECORDING_DIRECTORY + "_" + tempFileBeingProcessed.getName().replace("temp_", "");
            File outputFile = new File(outputFilePath);

            // Check if the FADCAM_ file exists
            if (outputFile.exists()) {
                // Delete temp file
                if (tempFileBeingProcessed.delete()) {
                    Log.d(TAG, "Temp file deleted successfully.");
                } else {
                    Log.e(TAG, "Failed to delete temp file.");
                }
                // Reset tempFileBeingProcessed to null after deletion
                tempFileBeingProcessed = null;
            } else {
                // FADCAM_ file does not exist yet
                Log.d(TAG, "Matching " + Constants.RECORDING_DIRECTORY + "_ file not found. Temp file remains.");
            }
        }
    }

    private String extractTimestamp(String filename) {
        // Assuming filename format is "prefix_TIMESTAMP.mp4"
        // Example: "temp_20240730_01_39_26PM.mp4"
        // Extracting timestamp part: "20240730_01_39_26PM"
        int startIndex = filename.indexOf('_') + 1;
        int endIndex = filename.lastIndexOf('.');
        return filename.substring(startIndex, endIndex);
    }

    private void updateThumbnailInAdapter(String videoFilePath) {
//        if (adapter != null) {
//            adapter.notifyDataSetChanged(); // Notify adapter that data has changed
//        }
    }

    private String getCurrentTimestamp() {
        SimpleDateFormat sdf = new SimpleDateFormat("dd/MMM/yyyy hh-mm a", Locale.ENGLISH);
        return convertArabicNumeralsToEnglish(sdf.format(new Date()));
    }

    private String convertArabicNumeralsToEnglish(String text) {
        if (text == null) return null;
        return text.replaceAll("٠", "0")
                .replaceAll("١", "1")
                .replaceAll("٢", "2")
                .replaceAll("٣", "3")
                .replaceAll("٤", "4")
                .replaceAll("٥", "5")
                .replaceAll("٦", "6")
                .replaceAll("٧", "7")
                .replaceAll("٨", "8")
                .replaceAll("٩", "9");
    }

    private File getLatestVideoFile() {
        File videoDir = new File(getExternalFilesDir(null), Constants.RECORDING_DIRECTORY);
        File[] files = videoDir.listFiles();
        if (files == null || files.length == 0) {
            return null;
        }

        // Sort files by last modified date
        Arrays.sort(files, (f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()));
        return files[0]; // Return the most recently modified file
    }

    private PendingIntent createOpenAppIntent() {
        Log.d(TAG, "createOpenAppIntent");

        Intent openAppIntent = new Intent();
        openAppIntent.setClassName("com.teamopensmartglasses.augmentos_manager",
                "com.teamopensmartglasses.augmentos_manager.MainActivity");
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        return PendingIntent.getActivity(this, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent createStopRecordingIntent() {
        Intent stopIntent = new Intent(this, CameraRecordingService.class);
        stopIntent.setAction(Constants.INTENT_ACTION_STOP_RECORDING);
        return PendingIntent.getService(this, 0, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent createResumeRecordingIntent() {
        Intent stopIntent = new Intent(this, CameraRecordingService.class);
        stopIntent.setAction(Constants.INTENT_ACTION_RESUME_RECORDING);
        return PendingIntent.getService(this, 0, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void setupRecordingInProgressNotification() {

        if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.notification_video_recording))
                .setContentText(getString(R.string.notification_video_recording_progress_description))
                .setSmallIcon(R.drawable.unknown_icon3)
                .setContentIntent(createOpenAppIntent())
                .setAutoCancel(false)
                .addAction(new NotificationCompat.Action(
                        R.drawable.ic_stop,
                        getString(R.string.button_stop),
                        createStopRecordingIntent()))
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if(recordingState.equals(RecordingState.NONE)) {
            startForeground(NOTIFICATION_ID, builder.build());
        } else {
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
            notificationManager.notify(NOTIFICATION_ID, builder.build());
        }
    }

    private void setupRecordingResumeNotification() {

        if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.notification_video_recording))
                .setContentText(getString(R.string.notification_video_recording_paused_description))
                .setSmallIcon(R.drawable.unknown_icon3)
                .setContentIntent(createOpenAppIntent())
                .setAutoCancel(false)
                .addAction(new NotificationCompat.Action(
                        R.drawable.ic_play,
                        getString(R.string.button_resume),
                        createResumeRecordingIntent()))
                .setPriority(NotificationCompat.PRIORITY_LOW);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Recording Service Channel",
                    NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if(manager != null) {
                manager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created");
            } else {
                Log.e(TAG, "NotificationManager is null, unable to create notification channel");
            }
        }
    }

    private void cancelNotification() {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        notificationManager.cancel(NOTIFICATION_ID);
    }

    private String getLocationData() {
        return locationHelper.getLocationData();
    }

}

