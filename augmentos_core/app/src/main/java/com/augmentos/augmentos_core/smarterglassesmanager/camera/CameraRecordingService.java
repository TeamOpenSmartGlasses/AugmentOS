package com.augmentos.augmentos_core.smarterglassesmanager.camera;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Point;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.augmentos.augmentos_core.R;
import com.github.pedro.rtplibrary.view.OpenGlView;
import com.github.pedro.rtplibrary.base.Camera2Base;
import com.github.pedro.rtplibrary.rtmp.RtmpCamera2;
import com.github.pedro.rtplibrary.util.FpsListener;
import com.github.pedro.rtplibrary.util.RecordController;
import com.github.pedro.rtplibrary.util.RecordController.Listener;
import com.github.pedro.rtplibrary.util.RecordController.Status;
import com.pedro.rtmp.utils.ConnectCheckerRtmp;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Service for recording + streaming using rtmp-rtsp-stream-client-java
 */
public class CameraRecordingService extends Service implements ConnectCheckerRtmp {

    private static final String TAG = "CameraRecordingService";
    private static final String CHANNEL_ID = "CameraRecordingServiceChannel";
    private static final int NOTIFICATION_ID = 1;

    // Intent actions
    public static final String ACTION_START = "com.example.ACTION_START";      // Start preview only
    public static final String ACTION_STREAM = "com.example.ACTION_STREAM";    // Start streaming
    public static final String ACTION_RECORD = "com.example.ACTION_RECORD";    // Start local recording
    public static final String ACTION_STOP = "com.example.ACTION_STOP";
    public static final String EXTRA_RTMP_URL = "com.example.EXTRA_RTMP_URL";

    // Our RtmpCamera2 instance
    private RtmpCamera2 rtmpCamera2;
    // If you want an OpenGlView for more advanced watermarks or filters, you can place it in a hidden Layout, etc.
    // Here we'll just pass null if we don't need a preview. Or create a dummy:
    private OpenGlView glView;

    private boolean isStreaming = false;
    private boolean isRecording = false;
    private String currentRtmpUrl = "";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service onCreate");
        createNotificationChannel();

        // If you want a preview, you'd typically inflate a layout with an <OpenGlView> or <SurfaceView>.
        // But in a Service scenario, you may have no visible UI. We'll do an "off-screen" approach:
        glView = new OpenGlView(this);
        // Or you can pass null to RtmpCamera2 if you want no preview rendering at all.

        // Create RtmpCamera2 (this automatically sets up Camera2 capturing, encoding, etc.)
        rtmpCamera2 = new RtmpCamera2(glView, this);

        // Optional: Listen to record events
        rtmpCamera2.setRecordControllerListener(new Listener() {
            @Override
            public void onStatusChange(Status status) {
                Log.d(TAG, "Record status changed: " + status);
            }

            @Override
            public void onNewPath(String path) {
                Log.d(TAG, "Recording file saved to: " + path);
            }
        });

        // Prepare default settings if you like (video resolution, fps, bitrate, etc.)
        prepareCameraAndAudio();
    }

    private void prepareCameraAndAudio() {
        // For example, 1280x720, 30fps, ~2 Mbps, frontCamera = false (0 = back, 1 = front)
        // Check the library docs for more advanced config.
        boolean result = rtmpCamera2.prepareVideo(
                1280, 720, 30, 2000 * 1024, // 2Mbps
                false, 2, Camera2Base.CameraFacing.BACK, 0
        );
        if (!result) {
            Log.e(TAG, "prepareVideo failed");
        }
        result = rtmpCamera2.prepareAudio(
                128 * 1024, // audio bitrate
                44100,
                true,   // stereo
                false,  // echo canceller
                false   // noise suppressor
        );
        if (!result) {
            Log.e(TAG, "prepareAudio failed");
        }

        // Start the camera preview; we do not necessarily display it, but the camera is "active" now.
        rtmpCamera2.startPreview();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) {
            return START_STICKY;
        }

        switch (intent.getAction()) {
            case ACTION_START:
                showNotification("Camera Preview Only", "Camera is active, not recording or streaming.");
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
        if (!rtmpCamera2.isRecording() && !rtmpCamera2.isStreaming()) {
            // Only prepare again if you changed parameters or your initial was not prepared
            // rtmpCamera2.prepareVideo(...);
            // rtmpCamera2.prepareAudio(...);
        }

        if (rtmpCamera2.isRecording()) {
            // If you are already recording, you can also stream at the same time
            // (the library handles that with one pipeline).
            Log.d(TAG, "Starting streaming while already recording locally...");
        }

        boolean started = rtmpCamera2.startStream(rtmpUrl);
        if (started) {
            isStreaming = true;
            showNotification("Streaming", "Live stream to: " + rtmpUrl);
        } else {
            Toast.makeText(this, "Stream start failed!", Toast.LENGTH_SHORT).show();
        }
    }

    private void startLocalRecording() {
        if (rtmpCamera2.isRecording()) {
            Log.w(TAG, "Already recording locally!");
            return;
        }
        // Build a file path for the .mp4
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        String filePath = getExternalFilesDir(null) + File.separator + "VID_" + timeStamp + ".mp4";

        // Start recording. The library automatically writes the same encoded frames used for streaming.
        rtmpCamera2.startRecord(filePath);
        isRecording = true;
        showNotification("Recording", "Saving MP4 to " + filePath);
    }

    private void stopAll() {
        Log.d(TAG, "stopAll: Stopping stream & record & preview");
        // Stop streaming if streaming
        if (rtmpCamera2.isStreaming()) {
            rtmpCamera2.stopStream();
            isStreaming = false;
        }
        // Stop recording if recording
        if (rtmpCamera2.isRecording()) {
            rtmpCamera2.stopRecord();
            isRecording = false;
        }
        // Stop camera preview
        if (rtmpCamera2.isOnPreview()) {
            rtmpCamera2.stopPreview();
        }

        showNotification("Stopped", "Camera is not streaming or recording now.");
        // Optionally stopSelf if you want the service to end after stopping everything:
        stopForeground(true);
        stopSelf();
    }

    // Implement ConnectCheckerRtmp methods for feedback on RTMP connection
    @Override
    public void onConnectionStartedRtmp(String rtmpUrl) {
        Log.d(TAG, "onConnectionStartedRtmp: " + rtmpUrl);
    }

    @Override
    public void onConnectionSuccessRtmp() {
        Log.d(TAG, "onConnectionSuccessRtmp");
        Toast.makeText(this, "Stream Connection Successful", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onConnectionFailedRtmp(@NonNull final String reason) {
        Log.e(TAG, "onConnectionFailedRtmp: " + reason);
        // If you want to stop the stream if it fails:
        Handler mainHandler = new Handler(getMainLooper());
        mainHandler.post(() -> {
            rtmpCamera2.stopStream();
            isStreaming = false;
            Toast.makeText(CameraRecordingService.this, "Stream connection failed: " + reason, Toast.LENGTH_LONG).show();
        });
    }

    @Override
    public void onNewBitrateRtmp(long bitrate) {
        Log.d(TAG, "onNewBitrateRtmp: " + bitrate + " bps");
    }

    @Override
    public void onDisconnectRtmp() {
        Log.d(TAG, "onDisconnectRtmp");
        isStreaming = false;
        Toast.makeText(this, "Stream disconnected", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onAuthErrorRtmp() {
        Log.e(TAG, "onAuthErrorRtmp");
        Toast.makeText(this, "Auth error", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onAuthSuccessRtmp() {
        Log.d(TAG, "onAuthSuccessRtmp");
        Toast.makeText(this, "Auth success", Toast.LENGTH_SHORT).show();
    }

    // Notification stuff
    private void showNotification(String title, String message) {
        if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            // if you're on Android 13+ you need to request notifications permission
            return;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.unknown_icon3)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setAutoCancel(false);

        startForeground(NOTIFICATION_ID, builder.build());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelName = "Recording/Streaming Service Channel";
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    channelName,
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
        Log.d(TAG, "Service destroyed, cleaning up...");
        stopAll();  // ensure everything is halted
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
