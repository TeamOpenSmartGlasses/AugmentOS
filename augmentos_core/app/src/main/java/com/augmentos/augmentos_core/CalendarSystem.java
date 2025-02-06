package com.augmentos.augmentos_core;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.util.Log;
import androidx.core.content.ContextCompat;
import android.Manifest;
import android.content.pm.PackageManager;

/**
 * CalendarSystem wraps interactions with the Android Calendar Provider.
 * It offers methods to query for calendar events—specifically the next upcoming event.
 */
public class CalendarSystem {

    private static final String TAG = "CalendarSystem";
    private static CalendarSystem instance;
    private final Context context;

    private CalendarSystem(Context context) {
        this.context = context.getApplicationContext();
    }

    public static synchronized CalendarSystem getInstance(Context context) {
        if (instance == null) {
            instance = new CalendarSystem(context);
        }
        return instance;
    }

    /**
     * Checks if the necessary calendar permissions (read, write) are granted.
     *
     * @return true if both permissions are granted.
     */
    private boolean hasCalendarPermissions() {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR)
                == PackageManager.PERMISSION_GRANTED &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_CALENDAR)
                        == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Retrieves the next upcoming event from the device's calendar.
     *
     * @return a CalendarItem representing the next upcoming event or null if none found.
     */
    public CalendarItem getNextUpcomingEvent() {
        if (!hasCalendarPermissions()) {
            Log.w(TAG, "Calendar permissions are not granted.");
            return null;
        }

        ContentResolver contentResolver = context.getContentResolver();
        String selection = CalendarContract.Events.DTSTART + " >= ?";
        String[] selectionArgs = new String[]{ String.valueOf(System.currentTimeMillis()) };
        String sortOrder = CalendarContract.Events.DTSTART + " ASC LIMIT 1";
        Uri eventsUri = CalendarContract.Events.CONTENT_URI;

        Cursor cursor = contentResolver.query(eventsUri, null, selection, selectionArgs, sortOrder);
        CalendarItem nextEvent = null;

        if (cursor != null) {
            if (cursor.moveToFirst()) {
                // Extract event details from the cursor
                long eventId = cursor.getLong(cursor.getColumnIndexOrThrow(CalendarContract.Events._ID));
                String title = cursor.getString(cursor.getColumnIndexOrThrow(CalendarContract.Events.TITLE));
                long dtStart = cursor.getLong(cursor.getColumnIndexOrThrow(CalendarContract.Events.DTSTART));
                long dtEnd = cursor.getLong(cursor.getColumnIndexOrThrow(CalendarContract.Events.DTEND));
                String timeZone = cursor.getString(cursor.getColumnIndexOrThrow(CalendarContract.Events.EVENT_TIMEZONE));

                nextEvent = new CalendarItem(eventId, title, dtStart, dtEnd, timeZone);
                Log.d(TAG, "Next event: " + nextEvent.toString());
            } else {
                Log.d(TAG, "No upcoming calendar events found.");
            }
            cursor.close();
        } else {
            Log.e(TAG, "Query to calendar content provider failed.");
        }

        return nextEvent;
    }
}