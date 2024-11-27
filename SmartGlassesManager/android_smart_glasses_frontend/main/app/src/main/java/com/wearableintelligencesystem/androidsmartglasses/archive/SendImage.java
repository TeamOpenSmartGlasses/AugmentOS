package com.wearableintelligencesystem.androidsmartglasses.archive;

import android.os.AsyncTask;
import android.util.Base64;

import com.wearableintelligencesystem.androidsmartglasses.ASPClientSocket;

import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.message.BasicNameValuePair;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

//deprecated, we use sockets instead of http to send stuff... this may be useful in future to send image to backend from moverio
class SendImage extends AsyncTask<byte [], Void, Void> {

    private final String urlServer = "http://192.168.1.165:45678";
    ASPClientSocket clientsocket;

    @Override
    protected Void doInBackground(byte []... data){
        //grab reference to the open socket connection
        uploadImage(data[0]);
        return null;
    }

    private void uploadImage(byte[] data) {
        System.out.println("DATA IN uploadImage start IS : " + data[0] + data[1]);
        System.out.println("DATA IN uploadImage end IS : " + data[data.length - 2] + data[data.length - 1]);
        //convert image to string to send in post json
        String encodedImage = Base64.encodeToString(data, Base64.DEFAULT);

        //get current time that the image is sent
        Date utcDate=new Date(); utcDate.setTime(System.currentTimeMillis()); long currentTime = utcDate.getTime();


        // Create a new HttpClient and Post Header
        HttpClient httpclient = new DefaultHttpClient();
        HttpPost httppost = new HttpPost(urlServer);

        try {
            // Add your data
            List<NameValuePair> nameValuePairs = new ArrayList<NameValuePair>(2);
            nameValuePairs.add(new BasicNameValuePair("timestamp", Long.toString(currentTime)));
            nameValuePairs.add(new BasicNameValuePair("image", encodedImage));
            httppost.setEntity(new UrlEncodedFormEntity(nameValuePairs));

            // Execute HTTP Post Request
            HttpResponse response = httpclient.execute(httppost);

        } catch (ClientProtocolException e) {
            // TODO Auto-generated catch block
        } catch (IOException e) {
            // TODO Auto-generated catch block
        }

    }

}

