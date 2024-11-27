/*

Copyright 2021 Microoled
Licensed under the Apache License, Version 2.0 (the “License”);
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an “AS IS” BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
package com.activelook.activelooksdk.core;

import android.graphics.Bitmap;
import android.util.Log;

import androidx.core.util.Consumer;

import com.activelook.activelooksdk.Glasses;
import com.activelook.activelooksdk.types.Configuration;
import com.activelook.activelooksdk.types.ConfigurationDescription;
import com.activelook.activelooksdk.types.ConfigurationElementsInfo;
import com.activelook.activelooksdk.types.DemoPattern;
import com.activelook.activelooksdk.types.FontData;
import com.activelook.activelooksdk.types.FontInfo;
import com.activelook.activelooksdk.types.FreeSpace;
import com.activelook.activelooksdk.types.GaugeInfo;
import com.activelook.activelooksdk.types.GlassesSettings;
import com.activelook.activelooksdk.types.GlassesVersion;
import com.activelook.activelooksdk.types.Image1bppData;
import com.activelook.activelooksdk.types.ImageConverter;
import com.activelook.activelooksdk.types.ImageData;
import com.activelook.activelooksdk.types.ImageInfo;
import com.activelook.activelooksdk.types.ImgStreamFormat;
import com.activelook.activelooksdk.types.LayoutParameters;
import com.activelook.activelooksdk.types.LedState;
import com.activelook.activelooksdk.types.PageInfo;
import com.activelook.activelooksdk.types.Rotation;
import com.activelook.activelooksdk.types.Utils;
import com.activelook.activelooksdk.types.ImgSaveFormat;
import com.activelook.activelooksdk.types.holdFlushAction;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public abstract class AbstractGlasses implements Glasses {

    /*
     * General commands ids
     */
    static final byte ID_power = (byte) 0x00;
    static final byte ID_clear = (byte) 0x01;
    static final byte ID_grey = (byte) 0x02;
    static final byte ID_demo = (byte) 0x03;
    static final byte ID_test = (byte) 0x04;
    static final byte ID_battery = (byte) 0x05;
    static final byte ID_vers = (byte) 0x06;
    static final byte ID_led = (byte) 0x08;
    static final byte ID_shift = (byte) 0x09;
    static final byte ID_settings = (byte) 0x0A;
    /*
     * Display luminance commands ids
     */
    static final byte ID_luma = (byte) 0x10;
    /*
     * Optical sensor commands ids
     */
    static final byte ID_sensor = (byte) 0x20;
    static final byte ID_gesture = (byte) 0x21;
    static final byte ID_als = (byte) 0x22;
    /*
     * Graphics commands ids
     */
    static final byte ID_color = (byte) 0x30;
    static final byte ID_point = (byte) 0x31;
    static final byte ID_line = (byte) 0x32;
    static final byte ID_rect = (byte) 0x33;
    static final byte ID_rectf = (byte) 0x34;
    static final byte ID_circ = (byte) 0x35;
    static final byte ID_circf = (byte) 0x36;
    static final byte ID_txt = (byte) 0x37;
    static final byte ID_polyline = (byte) 0x38;
    static final byte ID_holdFlush = (byte) 0x39;
    /*
     * Images commands ids
     */
    static final byte ID_imgList = (byte) 0x47;
    static final byte ID_imgSave = (byte) 0x41;
    static final byte ID_imgDisplay = (byte) 0x42;
    static final byte ID_imgDelete = (byte) 0x43;
    static final byte ID_imgStream = (byte) 0x44;
    static final byte ID_imgSave1bpp = (byte) 0x45;
    /*
     * Font commands ids
     */
    static final byte ID_fontList = (byte) 0x50;
    static final byte ID_fontSave = (byte) 0x51;
    static final byte ID_fontSelect = (byte) 0x52;
    static final byte ID_fontDelete = (byte) 0x53;
    /*
     * Layout commands ids
     */
    static final byte ID_layoutSave = (byte) 0x60;
    static final byte ID_layoutDelete = (byte) 0x61;
    static final byte ID_layoutDisplay = (byte) 0x62;
    static final byte ID_layoutClear = (byte) 0x63;
    static final byte ID_layoutList = (byte) 0x64;
    static final byte ID_layoutPosition = (byte) 0x65;
    static final byte ID_layoutDisplayExtended = (byte) 0x66;
    static final byte ID_layoutGet = (byte) 0x67;
    static final byte ID_layoutClearExtended = (byte) 0x68;
    static final byte ID_layoutClearAndDisplay = (byte) 0x69;
    static final byte ID_layoutClearAndDisplayExtended = (byte) 0x6A;
    /*
     * Gauge commands ids
     */
    static final byte ID_gaugeDisplay = (byte) 0x70;
    static final byte ID_gaugeSave = (byte) 0x71;
    static final byte ID_gaugeDelete = (byte) 0x72;
    static final byte ID_gaugeList = (byte) 0x73;
    static final byte ID_gaugeGet = (byte) 0x74;
    /*
     * Page commands ids
     */
    static final byte ID_pageSave = (byte) 0x80;
    static final byte ID_pageGet = (byte) 0x81;
    static final byte ID_pageDelete = (byte) 0x82;
    static final byte ID_pageDisplay = (byte) 0x83;
    static final byte ID_pageClear = (byte) 0x84;
    static final byte ID_pageList = (byte) 0x85;
    static final byte ID_pageClearAndDisplay = (byte) 0x86;
    /*
     * Configuration for firmware 1.7 ids
     */
    static final byte ID_tdbg = (byte) 0xA0;
    static final byte ID_WConfigID = (byte) 0xA1;
    static final byte ID_RConfigID = (byte) 0xA2;
    static final byte ID_SetConfigID = (byte) 0xA3;
    /*
     * Statistics commands ids
     */
    static final byte ID_pixelCount = (byte) 0xA5;
    static final byte ID_getChargingCounter = (byte) 0xA7;
    static final byte ID_getChargingTime = (byte) 0xA8;
    static final byte ID_resetChargingParam = (byte) 0xAA;
    /*
     * Configuration commands ids
     */
    static final byte ID_cfgWrite = (byte) 0xD0;
    static final byte ID_cfgRead = (byte) 0xD1;
    static final byte ID_cfgSet = (byte) 0xD2;
    static final byte ID_cfgList = (byte) 0xD3;
    static final byte ID_cfgRename = (byte) 0xD4;
    static final byte ID_cfgDelete = (byte) 0xD5;
    static final byte ID_cfgDeleteLessUsed = (byte) 0xD6;
    static final byte ID_cfgFreeSpace = (byte) 0xD7;
    static final byte ID_cfgGetNb = (byte) 0xD8;
    static final byte ID_shutdown = (byte) 0xE0;
    private final HashMap<QueryId, Consumer<byte[]>> callbacks;
    private QueryId currentQID;

    /*
    Methods for children implementation
     */
    protected AbstractGlasses() {
        this.currentQID = new QueryId();
        this.callbacks = new HashMap<>();
    }

    protected void writeBytes(byte[] bytes) {
    }

    protected final void delegateToCallback(final Command command) {
        final QueryId qid = command.getQueryId();
        if (qid != null) {
            final Consumer<byte[]> callback = this.callbacks.remove(qid);
            if (callback != null) {
                callback.accept(command.getData());
            }
        }
    }

    /*
    Private helpers
     */
    private void registerCallback(QueryId queryId, Consumer<byte[]> callback) {
        this.callbacks.put(queryId, callback);
    }

    private QueryId nextQueryId() {
        final QueryId result = this.currentQID;
        this.currentQID = this.currentQID.next();
        return result;
    }

    private void writeCommand(final Command command) {
        final QueryId qid = this.nextQueryId();
        command.setQueryId(qid);
        this.writeBytes(command.toBytes());
    }

    private void writeCommand(final Command command, final Consumer<byte[]> callback) {
        QueryId qid = this.nextQueryId();
        command.setQueryId(qid);
        this.registerCallback(qid, callback);
        this.writeBytes(command.toBytes());
    }

    /*
    Public defaults
     */
    @Override
    public void loadConfiguration(BufferedReader cfg) throws IOException {
        String line;
        while ((line = cfg.readLine()) != null) {
            this.writeBytes(Utils.hexStringToBytes(line));
        }
    }

    @Override
    public void power(final boolean on) {
        final CommandData data = CommandData.fromBoolean(on);
        this.writeCommand(new Command(ID_power, data));
    }

    @Override
    public void clear() {
        this.writeCommand(new Command(ID_clear));
    }

    @Override
    public void grey(final byte level) {
        final CommandData data = CommandData.fromGreyLevel(level);
        this.writeCommand(new Command(ID_grey, data));
    }

    @Override
    public void demo() {
        this.writeCommand(new Command(ID_demo));
    }

    @Override
    public void demo(final DemoPattern pattern) {
        final CommandData data = CommandData.fromDemoPattern(pattern);
        this.writeCommand(new Command(ID_demo, data));
    }

    @Override
    public void test(final DemoPattern pattern) {
        final CommandData data = CommandData.fromDemoPattern(pattern);
        this.writeCommand(new Command(ID_test, data));
    }

    @Override
    public void battery(final Consumer<Integer> onResult) {
        this.writeCommand(
                new Command(ID_battery),
                bytes -> onResult.accept(CommandData.toBatteryLevel(bytes))
        );
    }

    @Override
    public void vers(final Consumer<GlassesVersion> onResult) {
        this.writeCommand(
                new Command(ID_vers),
                bytes -> onResult.accept(CommandData.toGlassesVersion(bytes))
        );
    }

    @Override
    public void led(final LedState state) {
        final CommandData data = CommandData.fromLedState(state);
        this.writeCommand(new Command(ID_led, data));
    }

    @Override
    public void shift(final short x, final short y) {
        final CommandData data = new CommandData().addInt16(x, y);
        this.writeCommand(new Command(ID_shift, data));
    }

    @Override
    public void settings(final Consumer<GlassesSettings> onResult) {
        this.writeCommand(
                new Command(ID_settings),
                bytes -> onResult.accept(CommandData.toGlassesSettings(bytes))
        );
    }

    @Override
    public void luma(final byte value) {
        final CommandData data = CommandData.fromLuma(value);
        this.writeCommand(new Command(ID_luma, data));
    }

    @Override
    public void sensor(final boolean on) {
        final CommandData data = CommandData.fromBoolean(on);
        this.writeCommand(new Command(ID_sensor, data));
    }

    @Override
    public void gesture(final boolean on) {
        final CommandData data = CommandData.fromBoolean(on);
        this.writeCommand(new Command(ID_gesture, data));
    }

    @Override
    public void als(final boolean on) {
        final CommandData data = CommandData.fromBoolean(on);
        this.writeCommand(new Command(ID_als, data));
    }

    @Override
    public void color(final byte value) {
        final CommandData data = CommandData.fromGreyLevel(value);
        this.writeCommand(new Command(ID_color, data));
    }

    @Override
    public void point(final short x, final short y) {
        final CommandData data = new CommandData().addInt16(x, y);
        this.writeCommand(new Command(ID_point, data));
    }

    @Override
    public void line(final short x1, final short y1, final short x2, final short y2) {
        final CommandData data = new CommandData().addInt16(x1, y1, x2, y2);
        this.writeCommand(new Command(ID_line, data));
    }

    @Override
    public void rect(final short x1, final short y1, final short x2, final short y2) {
        final CommandData data = new CommandData().addInt16(x1, y1, x2, y2);
        this.writeCommand(new Command(ID_rect, data));
    }

    @Override
    public void rectf(final short x1, final short y1, final short x2, final short y2) {
        final CommandData data = new CommandData().addInt16(x1, y1, x2, y2);
        this.writeCommand(new Command(ID_rectf, data));
    }

    @Override
    public void circ(final short x, final short y, final byte r) {
        final CommandData data = new CommandData().addInt16(x, y).addUInt8(r);
        this.writeCommand(new Command(ID_circ, data));
    }

    @Override
    public void circf(final short x, final short y, final byte r) {
        final CommandData data = new CommandData().addInt16(x, y).addUInt8(r);
        this.writeCommand(new Command(ID_circf, data));
    }

    @Override
    public void txt(final short x, final short y, final Rotation r, final byte f, final byte c, final String s) {
        final CommandData data = new CommandData()
                .addInt16(x, y)
                .add(CommandData.fromRotation(r))
                .addUInt8(f, c)
                .addNulTerminatedStrings(s);
        this.writeCommand(new Command(ID_txt, data));
    }

    @Override
    public void polyline(final short[] points) {
        final CommandData data = new CommandData().addInt16(points);
        this.writeCommand(new Command(ID_polyline, data));
    }

    @Override
    public void polyline(final byte thickness, final short[] points) {
        final byte reserved = 0;
        final CommandData data = new CommandData().addUInt8(thickness).addUInt8(reserved).addUInt8(reserved).addInt16(points);
        this.writeCommand(new Command(ID_polyline, data));
    }

    @Override
    public void holdFlush(final holdFlushAction action) {
        final CommandData data = CommandData.fromHoldFLushAction(action);
        this.writeCommand(new Command(ID_holdFlush, data));
    }

    @Override
    public void imgList(final Consumer<List<ImageInfo>> onResult) {
        this.writeCommand(
                new Command(ID_imgList),
                bytes -> onResult.accept(CommandData.toImageInfoList(bytes))
        );
    }

    // TODO @Override
    public void imgSave(final byte id, final int width, final byte[] bytes) {
        final CommandData data = new CommandData()
                .addUInt8(id)
                .addUInt32(bytes.length)
                .addUInt16(width);
        this.writeCommand(new Command(ID_imgSave, data));
        for (final CommandData chunkData : new CommandData(bytes).split(240)) {
            this.writeCommand(new Command(ID_imgSave, chunkData));
        }
    }

    @Override
    public void imgSave(final byte id, final ImageData imgData) {
        this.imgSave(id, imgData.getWidth(), imgData.getBytes());
    }

    @Override
    public void imgSave(final byte id, final Bitmap image, final ImgSaveFormat format) {
        switch(format){
            case MONO_4BPP:
                this.imgSave4bpp(id, image);
            break;
            case MONO_1BPP:
                this.imgSave1bpp(id, image);
            break;
            case MONO_4BPP_HEATSHRINK:
                this.imgSave4bppHeatShrink(id, image);
            break;
            case MONO_4BPP_HEATSHRINK_SAVE_COMP:
                this.imgSave4bppHeatShrinkSaveComp(id, image);
            break;
        }
    }

    // TODO @Override
    public void imgSave4bpp(final byte id, final int width, final int size, final byte[] bytes, final ImgSaveFormat format) {
        final CommandData data = new CommandData()
                .addUInt8(id)
                .addUInt32(size)
                .addUInt16(width)
                .add(CommandData.fromImgSaveFormat(format));
        this.writeCommand(new Command(ID_imgSave, data));
        for (final CommandData chunkData : new CommandData(bytes).split(240)) {
            this.writeCommand(new Command(ID_imgSave, chunkData));
        }
    }

    @Override
    public void imgSave4bpp(final byte id, final Bitmap image){
        final ImgSaveFormat format = ImgSaveFormat.MONO_4BPP;
        final ImageData imgData = ImageConverter.getImageData(image, format);
        this.imgSave4bpp(id, imgData.getWidth(), imgData.getSize(), imgData.getBytes(), format);
    }

    @Override
    public void imgSave4bppHeatShrink(final byte id, final Bitmap image){
        final ImgSaveFormat format = ImgSaveFormat.MONO_4BPP_HEATSHRINK;
        final ImageData imgData = ImageConverter.getImageData(image, format);
        this.imgSave4bpp(id, imgData.getWidth(), imgData.getSize(), imgData.getBytes(), format);
    }

    @Override
    public void imgSave4bppHeatShrinkSaveComp(final byte id, final Bitmap image){
        final ImgSaveFormat format = ImgSaveFormat.MONO_4BPP_HEATSHRINK_SAVE_COMP;
        final ImageData imgData = ImageConverter.getImageData(image, format);
        this.imgSave4bpp(id, imgData.getWidth(), imgData.getSize(), imgData.getBytes(), format);
    }

    // TODO @Override
    public void imgSave1bpp(final byte id, final int width, final int size, final byte[][] bytes, final ImgSaveFormat format) {
        final CommandData data = new CommandData()
        .addUInt8(id)
        .addUInt32(size)
        .addUInt16(width)
        .add(CommandData.fromImgSaveFormat(format));
        this.writeCommand(new Command(ID_imgSave, data));

        byte[] chunkData = new byte[]{};
        final int chunkSize  = 240;

        for (final byte[] line : bytes) {
            if (chunkData.length + line.length <= chunkSize) {
                byte[] result = new byte[chunkData.length+line.length];
                System.arraycopy(chunkData, 0, result, 0, chunkData.length);
                System.arraycopy(line, 0, result, chunkData.length, line.length);
                chunkData = result;
            } else {
                this.writeCommand(new Command(ID_imgSave, new CommandData(chunkData)));
                chunkData = line;
            }
        }
        if (chunkData.length > 0) {
            this.writeCommand(new Command(ID_imgSave,  new CommandData(chunkData)));
        }
    }

    @Override
    public void imgSave1bpp(final byte id, final Bitmap image){
        final ImgSaveFormat format = ImgSaveFormat.MONO_1BPP;
        final Image1bppData imgData = ImageConverter.getImage1bppData(image, format);
        this.imgSave1bpp(id, imgData.getWidth(), imgData.getSize(), imgData.getBytes(), format);
    }

    @Override
    public void imgDisplay(final byte id, final short x, final short y) {
        final CommandData data = new CommandData().addUInt8(id).addInt16(x, y);
        this.writeCommand(new Command(ID_imgDisplay, data));
    }

    @Override
    public void imgDelete(final byte id) {
        final CommandData data = new CommandData().addUInt8(id);
        this.writeCommand(new Command(ID_imgDelete, data));
    }

    @Override
    public void imgDeleteAll() {
        this.imgDelete((byte) 0xFF);
    }

    @Override
    public void imgStream(final Bitmap img, final ImgStreamFormat format, final short x, final short y) {
        switch(format){
            case MONO_1BPP:
                this.imgStream1bpp(img, x, y);
                break;
            case MONO_4BPP_HEATSHRINK:
                this.imgStream4bppHeatShrink(img, x, y);
                break;
        }
    }

    @Override
    public void imgStream1bpp(final Bitmap image, final short x, final short y){
        final ImgStreamFormat format = ImgStreamFormat.MONO_1BPP;
        final Image1bppData imgData = ImageConverter.getImageDataStream1bpp(image, format);
        this.imgStream1bpp(x,y, imgData.getWidth(), imgData.getSize(), imgData.getBytes(), format);
    }

    // TODO @Override
    public void imgStream1bpp(final short x, final short y, final int width, final int size, final byte[][] bytes, final ImgStreamFormat format) {
        final CommandData data = new CommandData()
                .addUInt32(size)
                .addUInt16(width)
                .addInt16(x, y)
                .add(CommandData.fromImgStreamFormat(format));
        this.writeCommand(new Command(ID_imgStream, data));

        byte[] chunkData = new byte[]{};
        final int chunkSize  = 240;

        for (final byte[] line : bytes) {
            if (chunkData.length + line.length <= chunkSize) {
                byte[] result = new byte[chunkData.length+line.length];
                System.arraycopy(chunkData, 0, result, 0, chunkData.length);
                System.arraycopy(line, 0, result, chunkData.length, line.length);
                chunkData = result;
            } else {
                this.writeCommand(new Command(ID_imgStream, new CommandData(chunkData)));
                chunkData = line;
            }
        }
        if (chunkData.length > 0) {
            this.writeCommand(new Command(ID_imgStream,  new CommandData(chunkData)));
        }
    }

    @Override
    public void imgStream4bppHeatShrink(final Bitmap image, final short x, final short y){
        final ImgStreamFormat format = ImgStreamFormat.MONO_4BPP_HEATSHRINK;
        final ImageData imgData = ImageConverter.getImageDataStream4bpp(image, format);
        this.imgStream4bppHeatShrink(x,y, imgData.getWidth(), imgData.getSize(), imgData.getBytes(), format);
    }

    // TODO @Override
    public void imgStream4bppHeatShrink(final short x, final short y, final int width, final int size, final byte[] bytes, final ImgStreamFormat format) {
        final CommandData data = new CommandData()
                .addUInt32(size)
                .addUInt16(width)
                .addInt16(x, y)
                .add(CommandData.fromImgStreamFormat(format));
        this.writeCommand(new Command(ID_imgStream, data));

        for (final CommandData chunkData : new CommandData(bytes).split(240)) {
            this.writeCommand(new Command(ID_imgStream, chunkData));
        }
    }

    @Override
    public void fontList(final Consumer<List<FontInfo>> onResult) {
        this.writeCommand(
                new Command(ID_fontList),
                bytes -> onResult.accept(CommandData.toFontInfoList(bytes))
        );
    }

    // TODO @Override
    public void fontSave(final byte id, final byte[] bytes) {
        final CommandData data = new CommandData()
                .addUInt8(id)
                .addUInt16(bytes.length);
        this.writeCommand(new Command(ID_fontSave, data));
        for (final CommandData chunkData : new CommandData(bytes).split(240)) {
            this.writeCommand(new Command(ID_fontSave, chunkData));
        }
    }

    @Override
    public void fontSave(final byte id, final FontData fntData) {
        this.fontSave(id, fntData.getBytes());
    }

    @Override
    public void fontSelect(final byte id) {
        final CommandData data = new CommandData().addUInt8(id);
        this.writeCommand(new Command(ID_fontSelect, data));
    }

    @Override
    public void fontDelete(final byte id) {
        final CommandData data = new CommandData().addUInt8(id);
        this.writeCommand(new Command(ID_fontDelete, data));
    }

    @Override
    public void fontDeleteAll() {
        this.fontDelete((byte) 0xFF);
    }

    @Override
    public void layoutSave(final LayoutParameters layout) {
        final CommandData data = CommandData.fromLayoutParameters(layout);
        this.writeCommand(new Command(ID_layoutSave, data));
    }

    @Override
    public void layoutDelete(final byte id) {
        final CommandData data = new CommandData().addUInt8(id);
        this.writeCommand(new Command(ID_layoutDelete, data));
    }

    @Override
    public void layoutDeleteAll() {
        this.layoutDelete((byte) 0xFF);
    }

    @Override
    public void layoutDisplay(final byte id, final String text) {
        final CommandData data = new CommandData().addUInt8(id).addNulTerminatedStrings(text);
        this.writeCommand(new Command(ID_layoutDisplay, data));
    }

    @Override
    public void layoutClear(final byte id) {
        final CommandData data = new CommandData().addUInt8(id);
        this.writeCommand(new Command(ID_layoutClear, data));
    }

    @Override
    public void layoutList(final Consumer<List<Integer>> onResult) {
        this.writeCommand(
            new Command(ID_layoutList),
            bytes -> {
                final List<Integer> r = new ArrayList<>();
                for (byte b: bytes) {
                    r.add((int) CommandData.UInt8.asShort(b));
                }
                onResult.accept(r);
            }
        );
    }

    @Override
    public void layoutPosition(final byte id, final short x, final byte y) {
        final CommandData data = new CommandData().addUInt8(id).addUInt16(x).addUInt8(y);
        this.writeCommand(new Command(ID_layoutPosition, data));
    }

    @Override
    public void layoutDisplayExtended(final byte id, final short x, final byte y, final String text) {
        final CommandData data = new CommandData().addUInt8(id).addUInt16(x).addUInt8(y).addNulTerminatedStrings(text);
        this.writeCommand(new Command(ID_layoutDisplayExtended, data));
    }

    @Override
    public void layoutGet(final byte id, final Consumer<LayoutParameters> onResult) {
        final CommandData data = new CommandData().addUInt8(id);
        this.writeCommand(
                new Command(ID_layoutGet, data),
                bytes -> onResult.accept(CommandData.toLayoutParameters(id, bytes))
        );
    }

    @Override
    public void layoutClearExtended(final byte id, final short x, final byte y) {
        final CommandData data = new CommandData().addUInt8(id).addUInt16(x).addUInt8(y);
        this.writeCommand(new Command(ID_layoutClearExtended, data));
    }

    @Override
    public void layoutClearAndDisplay(final byte id, final String text) {
        final CommandData data = new CommandData().addUInt8(id).addNulTerminatedStrings(text);
        this.writeCommand(new Command(ID_layoutClearAndDisplay, data));
    }

    @Override
    public void layoutClearAndDisplayExtended(final byte id, final short x, final byte y, final String text) {
        final CommandData data = new CommandData().addUInt8(id).addUInt16(x).addUInt8(y).addNulTerminatedStrings(text);
        this.writeCommand(new Command(ID_layoutClearAndDisplayExtended, data));
    }

    @Override
    public void gaugeDisplay(final byte id, final byte value) {
        final CommandData data = new CommandData().addUInt8(id).addUInt8(value);
        this.writeCommand(new Command(ID_gaugeDisplay, data));
    }

    @Override
    public void gaugeSave(final byte id,
                          final short x, final short y, final char r, final char rin,
                          final byte start, final byte end, final boolean clockwise) {
        final CommandData data = new CommandData().addUInt8(id)
                .addInt16(x, y).addUInt16(r, rin).addUInt8(start, end)
                .add(CommandData.fromBoolean(clockwise));
        this.writeCommand(new Command(ID_gaugeSave, data));
    }

    @Override
    public void gaugeSave(final byte id, final GaugeInfo gaugeInfo) {
        final CommandData data = new CommandData().addUInt8(id)
                .addInt16(gaugeInfo.getX(), gaugeInfo.getY())
                .addUInt16(gaugeInfo.getR(), gaugeInfo.getRin())
                .addUInt8(gaugeInfo.getStart(), gaugeInfo.getEnd())
                .add(CommandData.fromBoolean(gaugeInfo.isClockwise()));
        this.writeCommand(new Command(ID_gaugeSave, data));
    }

    @Override
    public void gaugeDelete(final byte id) {
        final CommandData data = new CommandData().addUInt8(id);
        this.writeCommand(new Command(ID_gaugeDelete, data));
    }

    @Override
    public void gaugeDeleteAll() {
        this.gaugeDelete((byte) 0xFF);
    }

    @Override
    public void gaugeList(final Consumer<List<Integer>> onResult) {
        this.writeCommand(
                new Command(ID_gaugeList),
                bytes -> {
                    final List<Integer> r = new ArrayList<>();
                    for (byte b: bytes) {
                        r.add((int) CommandData.UInt8.asShort(b));
                    }
                    onResult.accept(r);
                }
        );
    }

    @Override
    public void gaugeGet(final byte id, final Consumer<GaugeInfo> onResult) {
        final CommandData data = new CommandData().addUInt8(id);
        this.writeCommand(
                new Command(ID_gaugeGet, data),
                bytes -> onResult.accept(CommandData.toGaugeInfo(bytes))
        );
    }

    // TODO !!!! HERE
    @Override
    public void pageSave(byte id, byte[] layoutIds, short[] xs, byte [] ys) {
        this.pageSave(new PageInfo(id, layoutIds, xs, ys));
    }

    @Override
    public void pageSave(PageInfo page) {
        this.writeCommand(new Command(ID_pageSave).addData(page.getPayload()));
    }

    @Override
    public void pageGet(byte id, Consumer<PageInfo> onResult) {
        this.writeCommand(new Command(ID_pageGet).addDataByte(id), bytes -> onResult.accept(new PageInfo(bytes)));
    }

    @Override
    public void pageDelete(byte id) {
        this.writeCommand(new Command(ID_pageDelete).addDataByte(id));
    }

    @Override
    public void pageDeleteAll() {
        this.pageDelete((byte) 0xFF);
    }

    @Override
    public void pageDisplay(byte id, String [] texts) {
        final Command command = new Command(ID_pageDisplay).addDataByte(id);
        for(String text: texts) {
            command.addData(text, true);
        }
        this.writeCommand(command);
    }

    @Override
    public void pageClear(byte id) {
        this.writeCommand(new Command(ID_pageClear).addDataByte(id));
    }
    @Override
    public void pageList(Consumer<List<Integer>> onResult) {
        this.writeCommand(
                new Command(ID_pageList),
                bytes -> {
                    final List<Integer> r = new ArrayList<>();
                    for (byte b: bytes) {
                        r.add(b & 0x00FF);
                    }
                    onResult.accept(r);
                }
        );
    }

    @Override
    public void pageClearAndDisplay(byte id, String [] texts) {
        final Command command = new Command(ID_pageClearAndDisplay).addDataByte(id);
        for(String text: texts) {
            command.addData(text, true);
        }
        this.writeCommand(command);
    }

    @Override
    public void pixelCount(final Consumer<Long> onResult) {
        this.writeCommand(
                new Command(ID_pixelCount),
                bytes -> onResult.accept(CommandData.UInt32.asLong(bytes))
        );
    }

    @Override
    public void getChargingCounter(final Consumer<Long> onResult) {
        this.writeCommand(
                new Command(ID_getChargingCounter),
                bytes -> onResult.accept(CommandData.UInt32.asLong(bytes))
        );
    }

    @Override
    public void getChargingTime(final Consumer<Long> onResult) {
        this.writeCommand(
                new Command(ID_getChargingTime),
                bytes -> onResult.accept(CommandData.UInt32.asLong(bytes))
        );
    }

    @Override
    public void resetChargingParam() {
        this.writeCommand(new Command(ID_resetChargingParam));
    }

    @Override
    public void cfgWrite(final String name, final int version, final int password) {
        final CommandData data = new CommandData().addNulTerminatedStrings(name).addUInt32(version, password);
        this.writeCommand(new Command(ID_cfgWrite, data));
    }

    @Override
    public void cfgRead(final String name, final Consumer<ConfigurationElementsInfo> onResult) {
        final CommandData data = new CommandData().addNulTerminatedStrings(name);
        this.writeCommand(
                new Command(ID_cfgRead, data),
                bytes -> onResult.accept(CommandData.toConfigurationElementsInfo(bytes))
        );
    }

    @Override
    public void cfgSet(final String name) {
        final CommandData data = new CommandData().addNulTerminatedStrings(name);
        this.writeCommand(new Command(ID_cfgSet, data));
    }

    @Override
    public void cfgList(final Consumer<List<ConfigurationDescription>> onResult) {
        this.writeCommand(
                new Command(ID_cfgList),
                bytes -> onResult.accept(CommandData.toConfigurationDescriptionList(bytes))
        );
    }

    @Override
    public void cfgRename(final String oldName, final String newName, final int password) {
        final CommandData data = new CommandData().addNulTerminatedStrings(oldName, newName).addUInt32(password);
        this.writeCommand(new Command(ID_cfgRename, data));
    }

    @Override
    public void cfgDelete(final String name) {
        final CommandData data = new CommandData().addNulTerminatedStrings(name);
        this.writeCommand(new Command(ID_cfgDelete, data));
    }

    @Override
    public void cfgDeleteLessUsed() {
        this.writeCommand(new Command(ID_cfgDeleteLessUsed));
    }

    @Override
    public void cfgFreeSpace(final Consumer<FreeSpace> onResult) {
        this.writeCommand(
                new Command(ID_cfgFreeSpace),
                bytes -> onResult.accept(CommandData.toFreeSpace(bytes))
        );
    }
    @Override
    public void cfgGetNb(final Consumer<Integer> onResult) {
        this.writeCommand(
                new Command(ID_getChargingTime),
                bytes -> onResult.accept((int) CommandData.UInt8.asShort(bytes[0]))
        );
    }

    @Override
    public void shutdown() {
        this.writeCommand(new Command(ID_shutdown).addData(new byte [] { (byte) 0x6F, (byte) 0x7F, (byte) 0xC4, (byte) 0xEE}));
    }

    ///////////////////////
    /* Firmware 1.7 only */
    ///////////////////////
    @Override
    public void tdbg() {
        this.writeCommand(new Command(ID_tdbg));
    }

    @Override
    public void WConfigID(Configuration config) {
        this.writeCommand(new Command(ID_WConfigID).addData(config.toBytes()));
    }

    @Override
    public void RConfigID(byte number, Consumer<Configuration> onResult) {
        this.writeCommand(new Command(ID_RConfigID).addData(number), bytes -> onResult.accept(new Configuration(bytes)));
    }

    @Override
    public void SetConfigID(byte id) {
        this.writeCommand(new Command(ID_SetConfigID).addData(id));
    }

}
