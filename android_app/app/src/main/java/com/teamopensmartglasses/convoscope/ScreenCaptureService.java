package com.teamopensmartglasses.convoscope;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Display;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.net.URISyntaxException;
import java.nio.ByteBuffer;

import android.graphics.Bitmap;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import com.teamopensmartglasses.convoscope.events.NewScreenImageEvent;
import com.teamopensmartglasses.convoscope.events.NewScreenTextEvent;

import org.greenrobot.eventbus.EventBus;

public class ScreenCaptureService extends Service {
    private static final String CHANNEL_ID = "ScreenCaptureServiceChannel";

    public final String TAG = "ScreenCaptureService";
    private MediaProjection mediaProjection;
    private static final long DEBOUNCE_TIME_MS = 1000; // 1 second
    public Boolean textOnly = true;
    private long lastProcessedTime = 0;
    private String lastNewText = "";
    private Bitmap lastNewImage = null;
    ImageReader imageReader;
    @Override
    public void onCreate() {
        super.onCreate();
        //EventBus.getDefault().register(this);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int resultCode = -1;
        Intent data = null;
        if (intent != null && intent.hasExtra("resultCode") && intent.hasExtra("data")) {
            resultCode = intent.getIntExtra("resultCode", Activity.RESULT_CANCELED);
            data = intent.getParcelableExtra("data");

            // Save the data in SharedPreferences
            SharedPreferences prefs = getSharedPreferences("ServicePrefs", MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putInt("resultCode", resultCode);
            editor.putString("data", data.toUri(0));
            editor.apply();
        } else {
            // Attempt to retrieve persisted data
            SharedPreferences prefs = getSharedPreferences("ServicePrefs", MODE_PRIVATE);
            if (prefs.contains("resultCode") && prefs.contains("data")) {
                resultCode = prefs.getInt("resultCode", Activity.RESULT_CANCELED);
                String dataUri = prefs.getString("data", null);
                try {
                    data = Intent.parseUri(dataUri, 0);
                } catch (URISyntaxException e) {
                    throw new RuntimeException(e);
                }
            }
        }

        createNotificationChannel(); // Ensure the channel is created before showing the notification
        Notification notification = createNotification();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(3589, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        } else {
            startForeground(3589, notification);
        }

        if (resultCode == Activity.RESULT_OK && data != null) {
            MediaProjectionManager projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            mediaProjection = projectionManager.getMediaProjection(resultCode, data);
            startCapturing(); // Your method to start capturing
        } else {
            stopSelf(); // Stop the service if permission is not granted
        }
        return START_STICKY;
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Screen Capture Service")
                .setContentText("Capturing screen content.")
                .setSmallIcon(com.teamopensmartglasses.smartglassesmanager.R.drawable.elon)
                .setContentIntent(pendingIntent)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Screen Capture Service";
            String description = "Notifications for Screen Capture Service";
            int importance = NotificationManager.IMPORTANCE_LOW;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void startCapturing() {
        DisplayMetrics metrics = new DisplayMetrics();
        Display display = getSystemService(DisplayManager.class).getDisplay(Display.DEFAULT_DISPLAY);
        ((Display) display).getMetrics(metrics);

        int screenDensity = metrics.densityDpi;
        int screenWidth = metrics.widthPixels;
        int screenHeight = metrics.heightPixels;

        // Setup ImageReader to capture screen
        imageReader = ImageReader.newInstance(screenWidth, screenHeight, PixelFormat.RGBA_8888, 2);
        mediaProjection.createVirtualDisplay("ScreenCapture",
                screenWidth, screenHeight, screenDensity,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(), null, null);

        imageReader.setOnImageAvailableListener(new ImageReader.OnImageAvailableListener() {
            @Override
            public void onImageAvailable(ImageReader reader) {
                Image image = null;
                try {
                    image = reader.acquireLatestImage();
                    if (image != null) {
                        // Process the image here
                        long currentTime = System.currentTimeMillis();
                        if ((currentTime - lastProcessedTime) > DEBOUNCE_TIME_MS) {
                            processImage(image);
                            lastProcessedTime = currentTime;
                        }
                        else {
                            image.close();
                        }
                    }

                }
                catch (Exception e){
                    Log.d(TAG, e.toString());
                }
                finally {
                    if (image != null) {
                        image.close();
                    }
                }
            }
        }, null);
    }

    private void processImage(Image image) {
        Image.Plane[] planes = image.getPlanes();
        ByteBuffer buffer = planes[0].getBuffer();
        int pixelStride = planes[0].getPixelStride();
        int rowStride = planes[0].getRowStride();
        int rowPadding = rowStride - pixelStride * image.getWidth();

        Bitmap bitmap = Bitmap.createBitmap(image.getWidth() + rowPadding / pixelStride, image.getHeight(), Bitmap.Config.ARGB_8888);
        bitmap.copyPixelsFromBuffer(buffer);

        if (textOnly) {
            recognizeTextFromBitmap(bitmap);
        }
        else {
            if (!haveBitmapsChangedSignificantly(bitmap, lastNewImage, 222)) return;
            Log.d(TAG, "Bitmaps are different enough!");
            lastNewImage = bitmap;
            EventBus.getDefault().post(new NewScreenImageEvent(bitmap));
        }
    }

    private void recognizeTextFromBitmap(Bitmap bitmap) {
        // Log.d(TAG, "Got a Bitmap yo");

        // Crop the bitmap to remove the top 25 pixels
        Bitmap croppedBitmap = cropTopPixels(bitmap, 55);

        // Create an InputImage object from a Bitmap
        InputImage image = InputImage.fromBitmap(croppedBitmap, 0);

        // Get an instance of TextRecognizer
        TextRecognizer recognizer = TextRecognition.getClient(new ChineseTextRecognizerOptions.Builder().build());//(TextRecognizerOptions.DEFAULT_OPTIONS);

        // Process the image
        recognizer.process(image)
                .addOnSuccessListener(new OnSuccessListener<Text>() {
                    @Override
                    public void onSuccess(Text visionText) {
                        /// Task completed successfully
                        StringBuilder fullText = new StringBuilder();

                        // Extract text from blocks of recognized text
                        for (Text.TextBlock block : visionText.getTextBlocks()) {
                            for (Text.Line line : block.getLines()) {
                                String lineText = line.getText();
                                fullText.append(lineText).append("\n"); // Append the line text and a newline character
                            }
                        }

                        String processedText = fullText.toString().replaceAll("\\n", "");

                        if (levenshteinDistance(processedText, lastNewText) <= 2) return;

                        Log.d(TAG, "OLD TEXT:\n" + lastNewText);
                        Log.d(TAG, "NEW TEXT:\n" + processedText);

                        lastNewText = processedText;

                        Log.d("TextRecognition", "Recognized text: " + fullText.toString());
                        EventBus.getDefault().post(new NewScreenTextEvent(fullText.toString()));
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
                        // Task failed with an exception
                        Log.e("TextRecognition", "Text recognition error: " + e.getMessage());
                    }
                });
    }

    public int levenshteinDistance(String s1, String s2) {
        int[] costs = new int[s2.length() + 1];
        for (int i = 0; i <= s1.length(); i++) {
            int lastValue = i;
            for (int j = 0; j <= s2.length(); j++) {
                if (i == 0)
                    costs[j] = j;
                else {
                    if (j > 0) {
                        int newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue),
                                    costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0)
                costs[s2.length()] = lastValue;
        }
        return costs[s2.length()];
    }

    public Bitmap cropTopPixels(Bitmap originalBitmap, int pixelsToCrop) {
        // Check if the original bitmap height is greater than the pixels to crop
        if (originalBitmap.getHeight() > pixelsToCrop) {
            // Create a new bitmap without the top pixelsToCrop pixels
            return Bitmap.createBitmap(
                    originalBitmap,
                    0, // Start X
                    pixelsToCrop, // Start Y, skipping the top pixelsToCrop pixels
                    originalBitmap.getWidth(), // Width of the new bitmap
                    originalBitmap.getHeight() - pixelsToCrop // Height of the new bitmap
            );
        } else {
            // Return the original bitmap if it's too small to be cropped
            return originalBitmap;
        }
    }

    public boolean areBitmapsEqual(Bitmap bmp1, Bitmap bmp2) {
        if ((bmp1 == null && bmp2 != null) || (bmp1 != null && bmp2 == null)) return false;

        // Check for equality of sizes
        if (bmp1.getWidth() != bmp2.getWidth() || bmp1.getHeight() != bmp2.getHeight()) {
            return false;
        }

        // Compare pixel by pixel
        for (int y = 0; y < bmp1.getHeight(); y++) {
            for (int x = 0; x < bmp1.getWidth(); x++) {
                if (bmp1.getPixel(x, y) != bmp2.getPixel(x, y)) {
                    return false;
                }
            }
        }

        return true; // Bitmaps are equal
    }

    public boolean haveBitmapsChangedSignificantly(Bitmap bmp1, Bitmap bmp2, int n) {
        if ((bmp1 == null && bmp2 != null) || (bmp1 != null && bmp2 == null)) return true;

        // Check for equality of sizes
        if (bmp1.getWidth() != bmp2.getWidth() || bmp1.getHeight() != bmp2.getHeight()) {
            return false;
        }

        int count = 0;  // Counter for different pixels

        // Compare pixel by pixel
        for (int y = 0; y < bmp1.getHeight(); y++) {
            for (int x = 0; x < bmp1.getWidth(); x++) {
                if (bmp1.getPixel(x, y) != bmp2.getPixel(x, y)) {
                    count++;
                    // If the count of different pixels is more than n, return true early
                    if (count > n) {
                        return true;
                    }
                }
            }
        }

        return false; // Bitmaps have not changed significantly
    }


    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mediaProjection != null) {
            mediaProjection.stop();
            mediaProjection = null;
        }
        if (imageReader != null) {
            imageReader.close(); // Properly close the ImageReader
            imageReader = null;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}