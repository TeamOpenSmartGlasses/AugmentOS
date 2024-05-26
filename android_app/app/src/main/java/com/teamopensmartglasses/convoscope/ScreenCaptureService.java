package com.teamopensmartglasses.convoscope;

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
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.hardware.display.DisplayManager;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Display;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.preference.PreferenceManager;

import java.net.URISyntaxException;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import android.view.WindowManager;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions;
import com.teamopensmartglasses.convoscope.events.NewScreenImageEvent;
import com.teamopensmartglasses.convoscope.events.NewScreenTextEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.DisableBleScoAudioEvent;

import org.greenrobot.eventbus.EventBus;

public class ScreenCaptureService extends Service {
    private static final String CHANNEL_ID = "ScreenCaptureServiceChannel";

    public final String TAG = "ScreenCaptureService";
    private MediaProjection mediaProjection;
    ImageReader imageReader;
    private Runnable imageBufferRunnableCode;
    private final Handler imageBufferLoopHandler = new Handler(Looper.getMainLooper());
    Bitmap bitmapBuffer = null;
    private static final long TEXT_DEBOUNCE_TIME_MS = 3000;
    private static final long IMAGE_DEBOUNCE_TIME_MS = 3000;
    public Boolean textOnly = true;
    private long lastProcessedTime = 0;
    private String lastNewText = "";
    private Bitmap lastNewImage = null;

    @Override
    public void onCreate() {
        super.onCreate();
        //EventBus.getDefault().register(this);
        createNotificationChannel();
    }

    public void startImageBufferLoop() {
        imageBufferRunnableCode = new Runnable() {
            @Override
            public void run() {
                if (bitmapBuffer != null) {
                    processBitmap(bitmapBuffer);
                }
                imageBufferLoopHandler.postDelayed(this, textOnly ? TEXT_DEBOUNCE_TIME_MS : IMAGE_DEBOUNCE_TIME_MS);
            }
        };
        imageBufferLoopHandler.post(imageBufferRunnableCode);
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

        this.textOnly = !PreferenceManager.getDefaultSharedPreferences(getApplicationContext()).getBoolean("screen_mirror_image", true);
        startImageBufferLoop();
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
        //turn off BLE SCO audio here via SmartGlassesManager (SGM) to allow user to watch videos, use video camera, etc.
        EventBus.getDefault().post(new DisableBleScoAudioEvent(true));

        //start screen capture
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
                        bitmapBuffer = imageToBitmap(image);
                        image.close();
                    }

                }
                catch (Exception e){
                    Log.d(TAG, e.toString());
                    if (image != null) {
                        image.close();
                    }
                }
                finally {
                    if (image != null) {
                        //image.close();
                    }
                }
            }
        }, null);
    }

    public Bitmap imageToBitmap(Image image){
        Image.Plane[] planes = image.getPlanes();
        ByteBuffer buffer = planes[0].getBuffer();
        int pixelStride = planes[0].getPixelStride();
        int rowStride = planes[0].getRowStride();
        int rowPadding = rowStride - pixelStride * image.getWidth();

        Bitmap bitmap = Bitmap.createBitmap(image.getWidth() + rowPadding / pixelStride, image.getHeight(), Bitmap.Config.ARGB_8888);
        bitmap.copyPixelsFromBuffer(buffer);
        return bitmap;
    }

    private void processBitmap(Bitmap bitmap) {
        boolean newTextOnly = !PreferenceManager.getDefaultSharedPreferences(getApplicationContext()).getBoolean("screen_mirror_image", true);
        textOnly = newTextOnly;
//        if (newTextOnly != textOnly){

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

        // Crop the bitmap to remove the top phone display bar
        Bitmap croppedBitmap = cropTopPixels(bitmap, 100);

        // Create an InputImage object from a Bitmap
        InputImage image = InputImage.fromBitmap(croppedBitmap, 0);

        // Get an instance of TextRecognizer
//        TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
//        TextRecognizer recognizer = TextRecognition.getClient(new ChineseTextRecognizerOptions.Builder().build());//(TextRecognizerOptions.DEFAULT_OPTIONS);
//
//        // Process the image
//        recognizer.process(image)
//                .addOnSuccessListener(new OnSuccessListener<Text>() {
//                    @Override
//                    public void onSuccess(Text visionText) {
//                        StringBuilder fullText = new StringBuilder();
//
//                        // Extract text from blocks of recognized text
//                        for (Text.TextBlock block : visionText.getTextBlocks()) {
//                            for (Text.Line line : block.getLines()) {
//                                String lineText = line.getText();
//                                Rect boundingBox = line.getBoundingBox();
//                                fullText.append(lineText).append("\n"); // Append the line text and a newline character
//
//                                // Log the bounding box information
//                                if (boundingBox != null) {
//                                    Log.d("TextRecognition", "Line text: " + lineText + " Bounding box: " + boundingBox.toShortString());
//                                }
//                            }
//                        }
//
//
//
//                        String processedText = fullText.toString(); //.replaceAll("\\n", "");
//
//                        // Filter some of the lines
//                        List<String> filteredLines = new ArrayList<>();
//                        for (Text.TextBlock block : visionText.getTextBlocks()) {
//                            for (Text.Line line : block.getLines()) {
//                                String lineText = line.getText().trim();
//
////                                // Skip lines that are likely URLs
////                                if (lineText.matches("^\\s*(https?|ftp)://.*$")) {
////                                    continue;
////                                }
//
//                                // Skip lines that are likely URLs
//                                if (lineText.matches("^\\s*((https?|ftps?)://.*|www\\.[\\S]+\\.(com|org|net|edu|ca|uk|au|gov|co|info|biz|io|dev))")) {
//                                    continue;
//                                }
//
//                                // Skip lines that are only numbers and punctuation
//                                if (lineText.matches("^\\s*[^\\p{L}]*\\s*$")) {
//                                    continue;
//                                }
//
//                                // Skip lines that are single characters (and not part of natural language)
//                                if (lineText.length() <= 3) {
//                                    continue;
//                                }
//
//                                // Add line if it passes all filters
//                                filteredLines.add(lineText);
//                            }
//                        }
//
//                        processedText = String.join("\n", filteredLines);
//                        if (levenshteinDistance(processedText, lastNewText) <= 2) return;
//                        Log.d(TAG, "OLD TEXT:\n" + lastNewText);
//                        Log.d(TAG, "NEW TEXT:\n" + processedText);
//                        lastNewText = processedText;
//                        Log.d("TextRecognition", "Recognized text: " + processedText);
//                        EventBus.getDefault().post(new NewScreenTextEvent(processedText));
//
//
////                        if (levenshteinDistance(processedText, lastNewText) <= 2) return;
////
////                        Log.d(TAG, "OLD TEXT:\n" + lastNewText);
////                        Log.d(TAG, "NEW TEXT:\n" + processedText);
//
//                        lastNewText = processedText;
//
//                        Log.d("TextRecognition", "Recognized text: " + fullText.toString());
//
//                        EventBus.getDefault().post(new NewScreenTextEvent(processedText));
//                    }
//                })
//                .addOnFailureListener(new OnFailureListener() {
//                    @Override
//                    public void onFailure(@NonNull Exception e) {
//                        // Task failed with an exception
//                        Log.e("TextRecognition", "Text recognition error: " + e.getMessage());
//                    }
//                });


        // Get an instance of TextRecognizer
        TextRecognizer recognizer = TextRecognition.getClient(new ChineseTextRecognizerOptions.Builder().build());

        // Process the image
        Context context = getApplicationContext();
//        recognizer.process(image)
//                .addOnSuccessListener(new OnSuccessListener<Text>() {
//                    @Override
//                    public void onSuccess(Text visionText) {
//                        // Task completed successfully
//                        StringBuilder fullText = new StringBuilder();
//
//                        // Retrieve the screen height
//                        int screenHeight = getScreenHeight(context);
//                        // Define the ratio (e.g., 0.01 is 1% of the screen height)
//                        float heightRatio = 0.01f;
//                        int heightThreshold = (int) (screenHeight * heightRatio);
//
//                        // Extract text from blocks of recognized text
//                        List<Text.TextBlock> textBlocks = visionText.getTextBlocks();
//                        Log.d(TAG, "Number of text blocks: " + textBlocks.size());
//
//                        for (Text.TextBlock block : textBlocks) {
//                            List<Text.Line> lines = block.getLines();
//                            Log.d(TAG, "Number of lines in block: " + lines.size());
//
//                            for (Text.Line line : lines) {
//                                // Check if the line contains a link
//                                Pattern linkPattern = Pattern.compile(".*(www\\.|http|\\.com|\\.net|\\.org).*", Pattern.CASE_INSENSITIVE); // Regular expression pattern to match links
//
//                                if (linkPattern.matcher(line.getText()).matches()) {
//                                    continue; // Skip this line
//                                }
//
//                                // Check the height of the bounding box
//                                Rect boundingBox = line.getBoundingBox();
//                                if (boundingBox != null) {
//                                    int boxHeight = boundingBox.height();
//                                    Log.d(TAG, "Boxheight of OCR'd text: " + boxHeight);
//
//                                    // Remove lines with bounding box height less than the threshold
//                                    if (boxHeight < heightThreshold) {
//                                        continue;
//                                    }
//                                }
//
//                                String lineText = line.getText();
//                                fullText.append(lineText).append("\n"); // Append the line text and a newline character
//                            }
//                        }
//
//                        String processedText = fullText.toString();
//
//                        if (levenshteinDistance(processedText, lastNewText) <= 2) return;
//
//                        Log.d(TAG, "OLD TEXT:\n" + lastNewText);
//                        Log.d(TAG, "NEW TEXT:\n" + processedText);
//
//                        lastNewText = processedText;
//
//                        Log.d("TextRecognition", "Recognized text: " + fullText.toString());
//
//                        // Post the processed text to the event bus
//                        EventBus.getDefault().post(new NewScreenTextEvent(processedText));
//                        EventBus.getDefault().post(new NewScreenTextEvent(fullText.toString()));
//                    }
//                })
//                .addOnFailureListener(new OnFailureListener() {
//                    @Override
//                    public void onFailure(@NonNull Exception e) {
//                        // Task failed with an exception
//                        Log.e("TextRecognition", "Text recognition error: " + e.getMessage());
//                    }
//                });

        // Process the image
        recognizer.process(image)
                .addOnSuccessListener(new OnSuccessListener<Text>() {
                    @Override
                    public void onSuccess(Text visionText) {
                        // Task completed successfully
                        StringBuilder fullText = new StringBuilder();

                        // Retrieve the screen height
                        int screenHeight = getScreenHeight(context);
                        // Define the ratio (e.g., 0.02 for 2% of the screen height)
                        float textSizeDropHeightRatio = 0.009f;
                        int dropSmallTextHeightThreshold = (int) (screenHeight * textSizeDropHeightRatio);
                        float textHeightSameLineRatio = 0.02f;
                        int sameLineHeightRatioThreshold = (int) (screenHeight * textHeightSameLineRatio);

                        // Extract text from blocks of recognized text
                        List<Text.TextBlock> textBlocks = visionText.getTextBlocks();
                        //Log.d(TAG, "Number of text blocks: " + textBlocks.size());

                        // Collect all lines with their bounding boxes
                        List<Text.Line> allLines = new ArrayList<>();
                        for (Text.TextBlock block : textBlocks) {
                            allLines.addAll(block.getLines());
                        }

                        // Sort lines by their bounding box top coordinate (y)
                        Collections.sort(allLines, new Comparator<Text.Line>() {
                            @Override
                            public int compare(Text.Line line1, Text.Line line2) {
                                return Integer.compare(line1.getBoundingBox().top, line2.getBoundingBox().top);
                            }
                        });

                        // Set max width for characters in glasses display
                        int maxWidthChars = 30;
                        int maxWidthPixels = 640; // Glasses display width in pixels

                        // Regular expression pattern to match links
                        Pattern linkPattern = Pattern.compile(".*(www\\.|http|\\.com|\\.net|\\.org).*", Pattern.CASE_INSENSITIVE);

                        // Map to hold lines grouped by their y-coordinate range
                        Map<Integer, List<String>> groupedLines = new HashMap<>();

                        // Process each line
                        // Log.d(TAG, "LINE TEXT FROM OCR: ____________________________________________________________ ");
                        for (Text.Line line : allLines) {
                            Rect boundingBox = line.getBoundingBox();
                            if (boundingBox != null) {
                                int boxHeight = boundingBox.height();
//                                Log.d(TAG, "Boxheight of OCR'd text: " + boxHeight);

                                // Remove lines with bounding box height less than the threshold
                                if (boxHeight < dropSmallTextHeightThreshold) {
                                    continue;
                                }

                                String lineText = line.getText();

                                // Check if the line contains a link
                                if (linkPattern.matcher(lineText).matches()) {
                                    continue; // Skip this line
                                }

                                // Calculate the starting position based on the bounding box left coordinate (x)
                                int startPos = (boundingBox.left * maxWidthChars) / maxWidthPixels;
                                // Log.d(TAG, "LINE TEXT FROM OCR: " + lineText + ", BB x: " + startPos);

                                // Group lines by their y-coordinate range
                                int yPos = boundingBox.top;
                                int yKey = yPos / sameLineHeightRatioThreshold; // Group lines in the same range

                                // Initialize the list if not present
                                if (!groupedLines.containsKey(yKey)) {
                                    groupedLines.put(yKey, new ArrayList<String>());
                                }

                                // Add the line to the group
                                groupedLines.get(yKey).add(lineText);
                            }
                        }

                        // Build the final text by combining grouped lines
                        for (Map.Entry<Integer, List<String>> entry : groupedLines.entrySet()) {
                            List<String> lines = entry.getValue();
                            if (lines.size() > 1) {
                                for (int i = 0; i < lines.size(); i++) {
                                    fullText.append(lines.get(i));
                                    if (i < lines.size() - 1) {
                                        fullText.append("    "); // few spaces to separate lines on the same level
                                    }
                                }
                            } else {
                                fullText.append(lines.get(0));
                            }
                            fullText.append("\n");
                        }

                        String processedText = fullText.toString();

                        if (levenshteinDistance(processedText, lastNewText) <= 2) return;

                        Log.d(TAG, "OLD TEXT:\n" + lastNewText);
                        Log.d(TAG, "NEW TEXT:\n" + processedText);

                        lastNewText = processedText;

                        Log.d("TextRecognition", "Recognized text: " + fullText.toString());

                        // Post the processed text to the event bus
                        // TODO: WHAT???
                        // EventBus.getDefault().post(new NewScreenTextEvent(processedText));
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


    // Ensure to call this method in the appropriate place in your code
    private int getScreenHeight(Context context) {
        WindowManager windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics displayMetrics = new DisplayMetrics();
        windowManager.getDefaultDisplay().getMetrics(displayMetrics);
        int orientation = context.getResources().getConfiguration().orientation;
        if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
            return displayMetrics.widthPixels;
        } else {
            return displayMetrics.heightPixels;
        }
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