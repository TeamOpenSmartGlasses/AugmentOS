package com.augmentos.smartglassesmanager.utils;


import android.content.Context;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class G1FontLoader {

    private static final String FONT_FILE_NAME = "g1_fonts.json";
    private Map<Character, FontGlyph> fontMap = new HashMap<>();

    public G1FontLoader(Context context) {
        loadFontData(context);
    }

    private void loadFontData(Context context) {
        try {
            // Read JSON file from assets
            InputStream is = context.getAssets().open(FONT_FILE_NAME);
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            is.close();

            // Convert to String and parse JSON
            String json = new String(buffer, StandardCharsets.UTF_8);
            JSONObject fontJson = new JSONObject(json);
            JSONArray glyphsArray = fontJson.getJSONArray("glyphs");

            // Extract glyphs into a HashMap
            for (int i = 0; i < glyphsArray.length(); i++) {
                JSONObject glyph = glyphsArray.getJSONObject(i);
                char character = (char) glyph.getInt("code_point");
                int width = glyph.getInt("width");
                int height = glyph.getInt("height");

                fontMap.put(character, new FontGlyph(character, width, height));
            }

            Log.d("G1FontLoader", "Font data loaded successfully!");

        } catch (Exception e) {
            e.printStackTrace();
            Log.e("G1FontLoader", "Error loading " + FONT_FILE_NAME);
        }
    }

    public FontGlyph getGlyph(char character) {
        return fontMap.getOrDefault(character, new FontGlyph(character, 6, 26)); // Default to width/height = 0 if missing
    }

    public static class FontGlyph {
        public char character;
        public int width;
        public int height;

        public FontGlyph(char character, int width, int height) {
            this.character = character;
            this.width = width;
            this.height = height;
        }
    }
}
