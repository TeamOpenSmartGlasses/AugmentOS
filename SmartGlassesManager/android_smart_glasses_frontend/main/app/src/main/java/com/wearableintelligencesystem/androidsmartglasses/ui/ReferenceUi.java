package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
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

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.squareup.picasso.Callback;
import com.squareup.picasso.OkHttp3Downloader;
import com.squareup.picasso.Picasso;
import com.wearableintelligencesystem.androidsmartglasses.ASPClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ReferenceUi extends ASGFragment {
    private final String TAG = "WearableAi_ReferenceUi";

    private String title;
    private String body;
    private String imgUrl;

    //referenceCard ui
    TextView referenceCardResultTitle;
    TextView referenceCardResultSummary;
    ImageView referenceCardResultImage;

    public ReferenceUi() {
        fragmentLabel = "Reference";
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
        Log.d(TAG, "REFERENCE ON CREATE VIEW");
        return inflater.inflate(R.layout.reference_card, container, false);
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
                title = getArguments().getString("title", null);
                body = getArguments().getString("body", null);
                imgUrl = getArguments().getString("img_url", null);
                Log.d(TAG, "moi: " + title);
                Log.d(TAG, "moi: " + body);

                //get the views
                referenceCardResultTitle = (TextView) getActivity().findViewById(R.id.reference_card_result_title);
                referenceCardResultSummary = (TextView) getActivity().findViewById(R.id.reference_card_result_summary);
                referenceCardResultImage = (ImageView) getActivity().findViewById(R.id.reference_card_result_image);

                //set the text
                referenceCardResultTitle.setText(title);
                referenceCardResultSummary.setText(body);
                referenceCardResultSummary.setMovementMethod(new ScrollingMovementMethod());
                referenceCardResultSummary.setSelected(true);
                //        //pull the image from web and display
                if (imgUrl != null) {
                    Picasso.Builder builder = new Picasso.Builder(getActivity());
                    builder.downloader(new OkHttp3Downloader(getActivity()));
                    builder.build()
                            .load(imgUrl.trim())
                            .resize(400,0)
                            .into(referenceCardResultImage, new Callback() {

                                @Override
                                public void onSuccess() {
                                    Log.d(TAG, "Picasso Image load success");
                                }

                                @Override
                                public void onError(Exception e) {
                                    Log.e("Picasso", "Image load failed");
                                }
                            });
                }
            }
        }, 10);


    }
}
