package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.ASPClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.MainActivity;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class CommandResolveUi extends ASGFragment {
    private final String TAG = "WearableAi_CommandResolveUi";

    private TextView voiceResponseTextView;

    public CommandResolveUi() {
        fragmentLabel = "Command Resolved";
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.command_resolve_fragment, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.onViewCreated(view, savedInstanceState);

        boolean success = getArguments().getBoolean("success", false);
        String message = getArguments().getString("message", null);

        TextView successTextView = view.findViewById(R.id.success_message);
        voiceResponseTextView = view.findViewById(R.id.text_response_text_view);
        TextView commandResponseStringTextView = view.findViewById(R.id.command_response_description);
        commandResponseStringTextView.setText(message);

        ImageView successImageView = view.findViewById(R.id.command_success_icon);

        if(success){
            successImageView.setImageResource(R.drawable.ic_command_success);
            successTextView.setText("Success");
        }
        else{
            successImageView.setImageResource(R.drawable.ic_command_failed);
            successTextView.setText("Failed");
        }
    }

    @Override
    protected void onBroadcastReceive(Context context, Intent intent){
        String voiceResponse = intent.getStringExtra(MainActivity.VOICE_TEXT_RESPONSE_TEXT);
        updateVoiceResponse(voiceResponse);
    }

    private void updateVoiceResponse(String voiceResponse) {
        voiceResponseTextView.setText(voiceResponse);
    }

    @Override
    public IntentFilter makeComputeUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(MainActivity.VOICE_TEXT_RESPONSE);

        return intentFilter;
    }
}




