package com.wearableintelligencesystem.androidsmartglasses;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.squareup.picasso.Callback;
import com.squareup.picasso.Picasso;

import android.content.Context;
import android.graphics.Color;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.GridView;
import android.widget.ImageView;
import android.widget.LinearLayout;

public class ImageAdapter extends BaseAdapter {
    public String TAG = "ImageAdapter_WearableAiDisplay";
    private Context mContext;
    public int imageTotal = 50;
    public int selected_position = -1;
    public static String[] mThumbIds = {
            "https://cdn.vox-cdn.com/thumbor/xb-heShdGq4G32_R1-c8E9FpyQw=/0x0:1694x866/1200x800/filters:focal(712x298:982x568)/cdn.vox-cdn.com/uploads/chorus_image/image/63097414/Screen_Shot_2019_02_22_at_3.13.37_PM.0.png",
            "https://cdn.vox-cdn.com/thumbor/xb-heShdGq4G32_R1-c8E9FpyQw=/0x0:1694x866/1200x800/filters:focal(712x298:982x568)/cdn.vox-cdn.com/uploads/chorus_image/image/63097414/Screen_Shot_2019_02_22_at_3.13.37_PM.0.png",
            "https://pyxis.nymag.com/v1/imgs/2cf/110/24734fb560ea12fe59f08772e974a8ac7b-10-elon-musk-60-minutes.rsquare.w700.jpg",
            "https://cdn.vox-cdn.com/thumbor/xb-heShdGq4G32_R1-c8E9FpyQw=/0x0:1694x866/1200x800/filters:focal(712x298:982x568)/cdn.vox-cdn.com/uploads/chorus_image/image/63097414/Screen_Shot_2019_02_22_at_3.13.37_PM.0.png",
            "https://pyxis.nymag.com/v1/imgs/2cf/110/24734fb560ea12fe59f08772e974a8ac7b-10-elon-musk-60-minutes.rsquare.w700.jpg",
            "https://cdn.vox-cdn.com/thumbor/xb-heShdGq4G32_R1-c8E9FpyQw=/0x0:1694x866/1200x800/filters:focal(712x298:982x568)/cdn.vox-cdn.com/uploads/chorus_image/image/63097414/Screen_Shot_2019_02_22_at_3.13.37_PM.0.png",
            "https://pyxis.nymag.com/v1/imgs/2cf/110/24734fb560ea12fe59f08772e974a8ac7b-10-elon-musk-60-minutes.rsquare.w700.jpg",
    };

    public ImageAdapter(Context c) {
        mContext = c;
    }

    public int getCount() {
        return imageTotal;
    }

    @Override
    public String getItem(int position) {
        return mThumbIds[position];
    }

    public long getItemId(int position) {
        return position;
    }

    public View getView(int position, View convertView, ViewGroup parent) {
        ImageView imageView;
        if (convertView == null) {
            imageView = new ImageView(mContext);
            imageView.setScaleType(ImageView.ScaleType.CENTER_CROP);
            imageView.setLayoutParams(new GridView.LayoutParams(156, 146)); //these are specific to the vuzix blade 480p display, will have to make this more responsive as we expand to more hardware - cayden
            imageView.setBackgroundColor(Color.TRANSPARENT);
            imageView.setPadding(3, 3, 3, 3);
        } else {
            imageView = (ImageView) convertView;
        }
        String url = getItem(position);
        Log.d(TAG, "Image URL picasso: " + url);
        Picasso.get() //with(mContext)
                .load(url)
                .placeholder(R.drawable.loader)
                .fit()
                .centerCrop().into(imageView, new Callback() {

            @Override
            public void onSuccess() {
                Log.d(TAG, "IMAGE PULLED SUCCESS");
            }

            @Override
            public void onError(Exception e) {
                Log.d(TAG,"Image load failed");
                e.printStackTrace();
            }
        });
        return imageView;
    }
}