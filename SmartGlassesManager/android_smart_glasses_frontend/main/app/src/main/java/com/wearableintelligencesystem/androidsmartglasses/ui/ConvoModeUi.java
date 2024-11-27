package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.text.Html;
import android.text.TextUtils;
import android.util.Log;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.ASPClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.MainActivity;
import com.wearableintelligencesystem.androidsmartglasses.archive.GlboxClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ConvoModeUi extends ASGFragment {
    private final String TAG = "WearableAi_ConvoModeUIFragment";

    //convo mode ui
    TextView convoModeContentTextView;

    public ConvoModeUi() {
        fragmentLabel = "ConvoMode";
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.convo_mode_fragment, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.onViewCreated(view, savedInstanceState);

        convoModeContentTextView = (TextView) getActivity().findViewById(R.id.references_text_view);
    }

    @Override
    protected void onBroadcastReceive(Context context, Intent intent){
        try {
            JSONObject data = new JSONObject(intent.getStringExtra(ASPClientSocket.RAW_MESSAGE_JSON_STRING));
            //parse out the name of the mode
            JSONArray refsArr = new JSONArray(data.getString(MessageTypes.REFERENCES));
            Log.d(TAG, "We got references: " + refsArr.toString());
            showPotentialReferences(refsArr);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    @Override
    public IntentFilter makeComputeUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(MessageTypes.REFERENCE_SELECT_REQUEST);

        return intentFilter;
    }

    private void showPotentialReferences(JSONArray refs) {
            String refString = "";

            try {
                for (int i = 0; i < refs.length(); i++) {
                    JSONObject ref = (JSONObject) refs.get(i);
                    refString = refString + ref.getString("selector_char") + " - " + ref.getString("title") + '\n';
                }
            } catch (JSONException e) {
                e.printStackTrace();
                return;
            }
            convoModeContentTextView.setText(refString);
    }

}

