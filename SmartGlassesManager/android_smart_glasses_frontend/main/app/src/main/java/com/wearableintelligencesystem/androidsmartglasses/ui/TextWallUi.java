package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.os.Bundle;
import android.os.Handler;
import android.text.method.ScrollingMovementMethod;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.squareup.picasso.Callback;
import com.squareup.picasso.OkHttp3Downloader;
import com.squareup.picasso.Picasso;
import com.wearableintelligencesystem.androidsmartglasses.R;

public class TextWallUi extends ASGFragment {
    private final String TAG = "WearableAi_TextWallUi";

    private String text;

    //referenceCard ui
    TextView textViewCardText;

    public TextWallUi() {
        fragmentLabel = "TextWall";
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "onDestroy called");
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        Log.d(TAG, "onDestroyView called");
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        Log.d(TAG, "TEXT WALL ON CREATE VIEW");
        return inflater.inflate(R.layout.text_wall_card, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        Log.d(TAG, "REFERENCE ON VIEW CREATED");
        super.onCreate(savedInstanceState);
        super.onViewCreated(view, savedInstanceState);

        //get the passed in arguments
        Handler h = new Handler();

        h.postDelayed(new Runnable() {
            public void run() {
                text = getArguments().getString("text", null);
                Log.d(TAG, "text wall text: " + text);

                //get the views
                textViewCardText = (TextView) getActivity().findViewById(R.id.text_wall_card_text);

                //set the text
                textViewCardText.setText(text);
            }
        }, 10);


    }
}
