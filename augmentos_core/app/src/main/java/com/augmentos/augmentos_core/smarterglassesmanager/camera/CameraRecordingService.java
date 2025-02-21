package com.augmentos.augmentos_core.smarterglassesmanager.camera;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.augmentos.augmentos_core.R;
import com.pedro.encoder.input.video.CameraHelper;
import com.pedro.rtmp.utils.ConnectCheckerRtmp;
import com.pedro.rtplibrary.rtmp.RtmpCamera2.*;
import com.pedro.rtplibrary.rtmp.RtmpCamera2;
import com.pedro.rtplibrary.view.OpenGlView;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Service for recording and streaming using rtmp-rtsp-stream-client-java (2.1.3).
 */
public class CameraRecordingService extends Service implements ConnectCheckerRtmp {

    private static final String TAG = "CameraRecordingService";
    private static final String CHANNEL_ID = "CameraRecordingServiceChannel";
    private static final int NOTIFICATION_ID = 1;

    // Intent action definitions
    public static final String ACTION_START = "com.example.ACTION_START";
    public static final String ACTION_STREAM = "com.example.ACTION_STREAM";
    public static final String ACTION_RECORD = "com.example.ACTION_RECORD";
    public static final String ACTION_STOP = "com.example.ACTION_STOP";
    public static final String EXTRA_RTMP_URL = "com.example.EXTRA_RTMP_URL";

    private RtmpCamera2 rtmpCamera2;
    private OpenGlView glView;

    private boolean isStreaming = false;
    private boolean isRecording = false;
    private String currentRtmpUrl = "";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service onCreate");
        createNotificationChannel();

        // Create an off-screen OpenGlView for preview
        glView = new OpenGlView(this);

        // Initialize RtmpCamera2 with the OpenGlView and set this service as the RTMP connection callback
        rtmpCamera2 = new RtmpCamera2(glView, this);

        // Prepare the camera and audio with desired settings
        prepareCameraAndAudio();
    }

    private void prepareCameraAndAudio() {
        // Prepare video: width, height, fps, bitrate, hardwareRotation, rotation, camera facing
        boolean videoPrepared = rtmpCamera2.prepareVideo(
                1280,            // width
                720,             // height
                30,              // fps
                2000 * 1024,     // bitrate (2 Mbps)
               // false,           // hardwareRotation
                0              // rotation (0, 90, 180, 270)
                //CameraHelper.Facing.BACK
        );
        if (!videoPrepared) {
            Log.e(TAG, "Failed to prepare video");
        }

        // Prepare audio: bitrate, sample rate, stereo, echo canceller, noise suppressor
        boolean audioPrepared = rtmpCamera2.prepareAudio(
                128 * 1024,      // audio bitrate
                44100,           // sample rate
                true,            // stereo
                false,           // echo canceller
                false            // noise suppressor
        );
        if (!audioPrepared) {
            Log.e(TAG, "Failed to prepare audio");
        }

        // Start the camera preview (even if off-screen) so the camera is active
        rtmpCamera2.startPreview();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) {
            return START_STICKY;
        }

        switch (intent.getAction()) {
            case ACTION_START:
                showNotification("Camera Preview", "Camera is active (preview only).");
                break;

            case ACTION_STREAM:
                currentRtmpUrl = intent.getStringExtra(EXTRA_RTMP_URL);
                startStream(currentRtmpUrl);
                break;

            case ACTION_RECORD:
                startLocalRecording();
                break;

            case ACTION_STOP:
                stopAll();
                break;
        }
        return START_STICKY;
    }

    private void startStream(String rtmpUrl) {
        if (rtmpCamera2.isStreaming()) {
            Log.w(TAG, "Already streaming");
            return;
        }
        if (rtmpCamera2.isRecording()) {
            Log.d(TAG, "Starting streaming while recording locally...");
        }
        // startStream now returns void, so handle success/fail in ConnectCheckerRtmp callbacks
        rtmpCamera2.startStream(rtmpUrl);
        isStreaming = true;
        showNotification("Streaming", "Live streaming to: " + rtmpUrl);
    }

    private void startLocalRecording() {
        if (rtmpCamera2.isRecording()) {
            Log.w(TAG, "Already recording locally!");
            return;
        }
        // Create a file path for the recording
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        String filePath = getExternalFilesDir(null) + File.separator + "VID_" + timeStamp + ".mp4";

        try {
            rtmpCamera2.startRecord(filePath);
            isRecording = true;
            showNotification("Recording", "Recording to: " + filePath);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private void stopAll() {
        Log.d(TAG, "Stopping stream, recording, and preview");
        if (rtmpCamera2.isStreaming()) {
            rtmpCamera2.stopStream();
            isStreaming = false;
        }
        if (rtmpCamera2.isRecording()) {
            rtmpCamera2.stopRecord();
            isRecording = false;
        }
        if (rtmpCamera2.isOnPreview()) {
            rtmpCamera2.stopPreview();
        }

        showNotification("Stopped", "Streaming and recording have stopped.");
        stopForeground(true);
        stopSelf();
    }

    // -----------------------------------------------------------------------------------
    // ConnectCheckerRtmp callback methods
    // -----------------------------------------------------------------------------------

    @Override
    public void onConnectionStartedRtmp(@NonNull String rtmpUrl) {
        Log.d(TAG, "RTMP connection started: " + rtmpUrl);
    }

    @Override
    public void onConnectionSuccessRtmp() {
        Log.d(TAG, "RTMP connection successful");
        Toast.makeText(this, "Stream connected", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onConnectionFailedRtmp(@NonNull String reason) {
        Log.e(TAG, "RTMP connection failed: " + reason);
        new Handler(getMainLooper()).post(() -> {
            if (rtmpCamera2.isStreaming()) {
                rtmpCamera2.stopStream();
            }
            isStreaming = false;
            Toast.makeText(CameraRecordingService.this, "Stream failed: " + reason, Toast.LENGTH_LONG).show();
        });
    }

    @Override
    public void onNewBitrateRtmp(long bitrate) {
        Log.d(TAG, "New bitrate: " + bitrate + " bps");
    }

    @Override
    public void onDisconnectRtmp() {
        Log.d(TAG, "RTMP disconnected");
        isStreaming = false;
        Toast.makeText(this, "Stream disconnected", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onAuthErrorRtmp() {
        Log.e(TAG, "RTMP authentication error");
        Toast.makeText(this, "Authentication error", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onAuthSuccessRtmp() {
        Log.d(TAG, "RTMP authentication successful");
        Toast.makeText(this, "Authentication successful", Toast.LENGTH_SHORT).show();
    }

    // -----------------------------------------------------------------------------------
    // Notification handling
    // -----------------------------------------------------------------------------------

    private void showNotification(String title, String message) {
        // If you’re targeting Android 13+ and using POST_NOTIFICATIONS, check permission
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            // Permission not granted; do nothing or handle gracefully
            return;
        }
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.unknown_icon3)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setAutoCancel(false);

        // Start in foreground
        startForeground(NOTIFICATION_ID, builder.build());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Recording/Streaming Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service destroyed, cleaning up");
        stopAll();
        if (rtmpCamera2 != null) {
            rtmpCamera2.stopPreview();
            rtmpCamera2 = null;
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
