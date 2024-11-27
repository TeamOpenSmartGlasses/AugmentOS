package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.text.Editable;
import android.text.Html;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.ASPClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.archive.GlboxClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.w3c.dom.Text;

public class CommandPostUi extends ASGFragment {
    private final String TAG = "WearableAi_CommandPostUi";

    private TextView commandArgsTextView;
    private TextView previousCommandString;

    public CommandPostUi() {
        fragmentLabel = "Command Received";
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.command_post_fragment, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.onViewCreated(view, savedInstanceState);
        previousCommandString = view.findViewById(R.id.main_title);
        setupCommandArgsTextView(view);
        //previousCommandString.setText(getArguments().getString(MessageTypes.INPUT_WAKE_WORD) + " " + getArguments().getString(MessageTypes.INPUT_VOICE_COMMAND_NAME));
        previousCommandString.setText("Command: " + getArguments().getString(MessageTypes.INPUT_VOICE_COMMAND_NAME));
    }

    @Override
    public void onResume(){
        super.onResume();
        getActivity().registerReceiver(voiceArgsReceiver, makeComputeUpdateIntentFilter());
    }

    @Override
    public void onPause(){
        super.onPause();
        getActivity().unregisterReceiver(voiceArgsReceiver);
    }

    private BroadcastReceiver voiceArgsReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            try {
                JSONObject data = new JSONObject(intent.getStringExtra(ASPClientSocket.RAW_MESSAGE_JSON_STRING));
                String typeOf = data.getString(MessageTypes.MESSAGE_TYPE_LOCAL);
                if (typeOf.equals(MessageTypes.VOICE_COMMAND_STREAM_EVENT)) {
                    if (data.getString(MessageTypes.VOICE_COMMAND_STREAM_EVENT_TYPE).equals(MessageTypes.COMMAND_ARGS_EVENT_TYPE)) {
                        String args = data.getString(MessageTypes.INPUT_VOICE_STRING);
                        commandArgsTextView.setText(args);
                    }
                }
            } catch (JSONException e){
                e.printStackTrace();
            }
        }
    };


    private void setupCommandArgsTextView(View view){
        commandArgsTextView = view.findViewById(R.id.command_args);

        commandArgsTextView.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                UiUtils.scrollToBottom(commandArgsTextView);
            }

            @Override
            public void afterTextChanged(Editable s) {

            }
        });
        UiUtils.scrollToBottom(commandArgsTextView);
    }

    public IntentFilter makeComputeUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(MessageTypes.VOICE_COMMAND_STREAM_EVENT);

        return intentFilter;
    }

}