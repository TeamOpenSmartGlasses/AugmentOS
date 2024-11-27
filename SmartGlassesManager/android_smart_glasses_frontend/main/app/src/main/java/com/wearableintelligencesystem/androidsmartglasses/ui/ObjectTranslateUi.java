package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.ASPClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.w3c.dom.Text;

import java.util.List;

public class ObjectTranslateUi extends ASGFragment {
    private final String TAG = "WearableAi_ObjectTranslateUi";

    private TextView languageName;
    private TextView nameOfObjectinSourceLanguage;
    private TextView nameOfObjectInTargetLanguage;

    public ObjectTranslateUi() {
        fragmentLabel = "Object Translate";
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.object_translate_mode_view, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.onViewCreated(view, savedInstanceState);

        nameOfObjectinSourceLanguage = (TextView) view.findViewById(R.id.nameOfObjectinSourceLanguage);
        nameOfObjectInTargetLanguage = (TextView) view.findViewById(R.id.nameOfObjectinTargetLanguage);
        languageName = (TextView) view.findViewById(R.id.languageName);
    }


    @Override
    protected void onBroadcastReceive(Context context, Intent intent){
        Log.d("hereee", "kjbnkjb");
        final String action = intent.getAction();
            try {
                JSONObject data = new JSONObject(intent.getStringExtra(ASPClientSocket.RAW_MESSAGE_JSON_STRING));
                String typeOf = data.getString(MessageTypes.MESSAGE_TYPE_LOCAL);
                //preview object translation result data
                if (typeOf.equals(MessageTypes.OBJECT_TRANSLATION_RESULT)) {
                    showObjectTranslationResults((new JSONObject(data.getString(MessageTypes.OBJECT_TRANSLATION_RESULT_DATA))));
                }
            } catch (JSONException e){
                e.printStackTrace();
            }
    }

    @Override
    public void onPause(){
        super.onPause();
    }

    @Override
    public void onResume(){
        super.onResume();
    }

    private void showObjectTranslationResults(JSONObject objectTranslatedData){
        //show the reference
        try {
            nameOfObjectinSourceLanguage.setText(objectTranslatedData.getString("source"));
            nameOfObjectInTargetLanguage.setText(objectTranslatedData.getString("target"));
            //languageName.setText(objectTranslatedData.getString("French"));
        } catch (JSONException e) {
            e.printStackTrace();
        }

    }

    @Override
    public IntentFilter makeComputeUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(ASPClientSocket.ACTION_UI_DATA);

        return intentFilter;
    }
}

