package com.augmentos.augmentos_core.statushelpers;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class JsonHelper {
    public static Map<String, Object> convertJsonToMap(JSONObject jsonObject) throws JSONException {
        Map<String, Object> map = new HashMap<>();
        Iterator<String> keys = jsonObject.keys();

        while(keys.hasNext()) {
            String key = keys.next();
            Object value = jsonObject.get(key);

            // Handle nested objects
            if (value instanceof JSONObject) {
                map.put(key, convertJsonToMap((JSONObject) value));
            }
            // Handle arrays
            else if (value instanceof JSONArray) {
                map.put(key, convertJsonArrayToList((JSONArray) value));
            }
            // Handle primitive values
            else {
                map.put(key, value);
            }
        }

        return map;
    }

    // Helper method to convert JSONArray to List
    public static List<Object> convertJsonArrayToList(JSONArray jsonArray) throws JSONException {
        List<Object> list = new ArrayList<>();

        for (int i = 0; i < jsonArray.length(); i++) {
            Object value = jsonArray.get(i);
            if (value instanceof JSONObject) {
                list.add(convertJsonToMap((JSONObject) value));
            }
            else if (value instanceof JSONArray) {
                list.add(convertJsonArrayToList((JSONArray) value));
            }
            else {
                list.add(value);
            }
        }

        return list;
    }
}
