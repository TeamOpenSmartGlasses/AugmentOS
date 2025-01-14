package com.teamopensmartglasses.augmentoslib.provider;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.UriMatcher;
import android.content.pm.ProviderInfo;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.util.Scanner;

/**
 * A ContentProvider that:
 * 1) Parses tpa_config.json to get all settings (defaultValue, type, etc.).
 * 2) Reads actual user choices from SharedPreferences (augmentos_prefs).
 * 3) Merges them into a single JSON with both defaultValue and currentValue.
 */
public class AugmentOSConfigProvider extends ContentProvider {

    private static final String TAG = "AugmentOSConfigProvider";
    private static final int MATCH_CONFIG = 1;

    // We'll return a single column named "json"
    private static final String[] CURSOR_COLUMNS = {"json"};

    private UriMatcher uriMatcher;

    @Override
    public boolean onCreate() {
        String authority = getAuthority();
        if (authority == null) {
            Log.e(TAG, "No authority found for AugmentOSConfigProvider!");
            return false;
        }

        uriMatcher = new UriMatcher(UriMatcher.NO_MATCH);
        // "content://<authority>/config" => MATCH_CONFIG
        uriMatcher.addURI(authority, "config", MATCH_CONFIG);

        Log.d(TAG, "AugmentOSConfigProvider created with authority: " + authority);
        return true;
    }

    /**
     * Dynamically determine the authority (which includes package name),
     * matching the placeholder in the library's manifest.
     */
    private String getAuthority() {
        if (getContext() == null) return null;

        ProviderInfo info = getContext().getPackageManager().resolveContentProvider(
                getContext().getPackageName() + ".augmentosconfigprovider", 0
        );
        if (info != null) {
            return info.authority;
        }
        return null;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection,
                        String[] selectionArgs, String sortOrder) {

        if (uriMatcher == null) {
            return null;
        }

        int match = uriMatcher.match(uri);
        if (match == MATCH_CONFIG) {
            return getMergedConfigCursor();
        }
        return null;
    }

    /**
     * Build a cursor with a single row that contains the merged JSON
     * (defaults + user currentValue).
     */
    private Cursor getMergedConfigCursor() {
        MatrixCursor cursor = new MatrixCursor(CURSOR_COLUMNS);
        String mergedJson = buildMergedSettingsJson();
        if (mergedJson != null) {
            cursor.addRow(new Object[]{ mergedJson });
        }
        return cursor;
    }

    /**
     * 1) Load the raw tpa_config.json
     * 2) For each setting that has a key, read from SharedPreferences
     * 3) Insert "currentValue" into the JSON item
     * 4) Return entire JSON as a string
     */
    private String buildMergedSettingsJson() {
        try {
            JSONObject root = loadRawConfigAsJson();
            if (root == null) {
                return null;
            }

            // Access TPA's shared prefs
            SharedPreferences prefs = getContext().getSharedPreferences("augmentos_prefs", Context.MODE_PRIVATE);

            JSONArray settingsArr = root.optJSONArray("settings");
            if (settingsArr == null) {
                return root.toString(); // no settings array, just return whatever root has
            }

            for (int i = 0; i < settingsArr.length(); i++) {
                JSONObject item = settingsArr.getJSONObject(i);

                // Skip if no "key", or if it's a "group" or "titleValue"
                String type = item.optString("type", "");
                if (!item.has("key")) {
                    continue;
                }
                if ("group".equals(type) || "titleValue".equals(type)) {
                    // Not stored in prefs. Maybe still we add a "currentValue" = null or skip
                    continue;
                }

                String key = item.getString("key");
                Object defVal = item.opt("defaultValue");

                // We'll build a "get" approach similar to AugmentOSSettingsManager
                if (prefs.contains(key)) {
                    // Has user data
                    item.put("currentValue", getCurrentValueFromPrefs(prefs, key, type, defVal, item));
                } else {
                    // Fallback to default if user hasn't changed it
                    item.put("currentValue", defVal);
                }
            }

            return root.toString();
        } catch (Exception e) {
            Log.e(TAG, "Error building merged JSON", e);
            return null;
        }
    }

    /**
     * Reads from SharedPreferences depending on the 'type'.
     * This replicates the logic from our SettingsManager get methods.
     */
    private Object getCurrentValueFromPrefs(SharedPreferences prefs, String key,
                                            String type, Object defaultVal, JSONObject item) {
        try {
            switch (type) {
                case "toggle":
                    return prefs.getBoolean(key, (defaultVal instanceof Boolean) ? (Boolean) defaultVal : false);

                case "slider": {
                    // Assume an int
                    int defInt = (defaultVal instanceof Number) ? ((Number) defaultVal).intValue() : 0;
                    int storedVal = prefs.getInt(key, defInt);

                    // If you'd like to clamp min/max:
                    Integer minVal = item.has("min") ? item.getInt("min") : null;
                    Integer maxVal = item.has("max") ? item.getInt("max") : null;
                    if (minVal != null && storedVal < minVal) {
                        storedVal = minVal;
                    }
                    if (maxVal != null && storedVal > maxVal) {
                        storedVal = maxVal;
                    }
                    return storedVal;
                }

                case "multiselect": {
                    // Stored as a JSON array string, e.g. '["red","blue"]'
                    String storedArrStr = prefs.getString(key, "[]");
                    return new JSONArray(storedArrStr);
                }

                case "text":
                case "select":
                    // For text, select, etc., store as String
                    return prefs.getString(key, (defaultVal != null) ? defaultVal.toString() : "");

                // Possibly handle more types if you have them
                default:
                    // If unrecognized, treat as string
                    return prefs.getString(key, (defaultVal != null) ? defaultVal.toString() : "");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to read currentValue for type=" + type + " key=" + key, e);
        }
        // fallback
        return defaultVal;
    }

    /**
     * Loads tpa_config.json from res/raw as a JSONObject.
     */
    private JSONObject loadRawConfigAsJson() {
        try {
            Context ctx = getContext();
            if (ctx == null) return null;

            int resId = ctx.getResources().getIdentifier("tpa_config", "raw", ctx.getPackageName());
            if (resId == 0) {
                Log.e(TAG, "No 'tpa_config.json' found in res/raw!");
                return null;
            }
            InputStream inputStream = ctx.getResources().openRawResource(resId);
            if (inputStream == null) return null;

            Scanner s = new Scanner(inputStream).useDelimiter("\\A");
            String jsonString = s.hasNext() ? s.next() : "";
            inputStream.close();

            return new JSONObject(jsonString);
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse tpa_config.json from raw", e);
            return null;
        }
    }

    // --------------------------------------------------------------------
    // REQUIRED OVERRIDES FOR READ-ONLY PROVIDER
    // --------------------------------------------------------------------
    @Override
    public String getType(Uri uri) {
        return null;
    }
    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }
    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }
    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
