package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.GridView;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.ImageAdapter;
import com.wearableintelligencesystem.androidsmartglasses.MainActivity;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class SelectableImageGridUi extends ASGFragment {
    private final String TAG = "WearableAi_SelectableImageGrid";

    //visual search gridview ui
    GridView gridviewImages;
    ImageAdapter gridViewImageAdapter;
    List<String> imageNames;
    int imageDisplayLimit = 18;

    //store information from visual search response
    List<String> thumbnailImages;

    public SelectableImageGridUi() {
        fragmentLabel = "Image Grid";
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.image_gridview, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.onViewCreated(view, savedInstanceState);

        try {
            JSONArray data = new JSONArray(getArguments().getString("images", null));
            showImages(data);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    private void selectImage(){
        int pos = gridviewImages.getSelectedItemPosition();
        String name = imageNames.get(pos);
        Toast.makeText(mainActivity, name, Toast.LENGTH_LONG).show();
    }

    public void showImages(JSONArray data){
        thumbnailImages = new ArrayList<String>();
        imageNames = new ArrayList<String>();
        try {
            for (int i = 0; ((i < data.length()) && (i < imageDisplayLimit)); i++) {
                //get thumnail image urls
                String thumbnailUrl = data.getJSONObject(i).getString("thumbnailUrl");
                thumbnailImages.add(thumbnailUrl);

                //get names of items
                String name = data.getJSONObject(i).getString("name");
                imageNames.add(name);
                Log.d(TAG, "GOT IMAGE: " + name);
            }

        } catch (JSONException e) {
            Log.d(TAG, e.toString());
        }

        gridviewImages = (GridView) getActivity().findViewById(R.id.gridview);
        gridViewImageAdapter = new ImageAdapter(getActivity());
        String[] simpleThumbArray = new String[thumbnailImages.size()];
        thumbnailImages.toArray(simpleThumbArray);
        gridViewImageAdapter.imageTotal = simpleThumbArray.length;
        gridViewImageAdapter.mThumbIds = simpleThumbArray;
        gridviewImages.setDrawSelectorOnTop(false);
        gridviewImages.setSelector(R.drawable.selector_image_gridview);
        gridviewImages.setAdapter(gridViewImageAdapter);
        gridviewImages.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            public void onItemClick(AdapterView<?> parent, View v,
                                    int position, long id) {
                Log.d(TAG, "Selected position: " + position);
                selectImage();
                gridViewImageAdapter.notifyDataSetChanged();
            }
        });
    }
}


