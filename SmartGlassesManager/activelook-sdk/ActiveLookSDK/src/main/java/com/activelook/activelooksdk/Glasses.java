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
package com.activelook.activelooksdk;

import android.graphics.Bitmap;
import android.graphics.Point;
import android.os.Parcelable;

import androidx.core.util.Consumer;

import com.activelook.activelooksdk.types.Configuration;
import com.activelook.activelooksdk.types.ConfigurationDescription;
import com.activelook.activelooksdk.types.ConfigurationElementsInfo;
import com.activelook.activelooksdk.types.DemoPattern;
import com.activelook.activelooksdk.types.DeviceInformation;
import com.activelook.activelooksdk.types.FlowControlStatus;
import com.activelook.activelooksdk.types.FontData;
import com.activelook.activelooksdk.types.FontInfo;
import com.activelook.activelooksdk.types.FreeSpace;
import com.activelook.activelooksdk.types.GaugeInfo;
import com.activelook.activelooksdk.types.GlassesSettings;
import com.activelook.activelooksdk.types.GlassesVersion;
import com.activelook.activelooksdk.types.Image1bppData;
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
import java.util.List;

public interface Glasses extends Parcelable {

    /**
     * Get the manufacturer of the glasses.
     *
     * @return The manufacturer name
     */
    String getManufacturer();
    /**
     * Get the name of the glasses.
     *
     * @return The name
     */
    String getName();
    /**
     * Get the address of the glasses.
     *
     * @return The address
     */
    String getAddress();
    /**
     * Get a serialized representation of this glasses for persistence storage
     */
    SerializedGlasses getSerializedGlasses();

    /**
     * Check if the glasses firmware is at least of the one provvided.
     *
     * @param version the version to compare the firmware version to.
     * @return true if the argument version is lower or equal to the glasses firmware version and false otherwise.
     */
    boolean isFirmwareAtLeast(String version);
    /**
     * Compare the glasses firmware version with the version
     *
     * @param version the version to compare the firmware version to.
     * @return the value 0 if the argument version is equal to the glasses firmware version; a value less than 0 if
     * the glasses firmware version is lower than the version argument; and a value greater than 0 if the glasses
     * firmware version is greater than the version argument.
     */
    int compareFirmwareVersion(String version);
    /**
     * Disconnect.
     */
    void disconnect();
    /**
     * Set callback for disconnected event.
     *
     * @param onDisconnected the callback to call when disconnected
     */
    void setOnDisconnected(Consumer<Glasses> onDisconnected);
    /**
     * Get the device public information.
     *
     * @return The device information
     */
    DeviceInformation getDeviceInformation();
    /**
     * Set the callback to call on battery level notifications.
     *
     * @param onEvent The callback to call on BatteryLevel notifications
     */
    void subscribeToBatteryLevelNotifications(Consumer<Integer> onEvent);
    /**
     * Set the callback to call on flow control notifications.
     *
     * @param onEvent The callback to call on FlowControl notifications
     */
    void subscribeToFlowControlNotifications(Consumer<FlowControlStatus> onEvent);
    /**
     * Set the callback to call on sensor interface notifications.
     *
     * @param onEvent The callback to call on SensorInterface notifications
     */
    void subscribeToSensorInterfaceNotifications(Runnable onEvent);
    /**
     * Unset the callback to call on battery level notifications.
     */
    default void unsubscribeToBatteryLevelNotifications() {
        this.subscribeToBatteryLevelNotifications(null);
    }
    /**
     * Unset the callback to call on flow control notifications.
     */
    default void unsubscribeToFlowControlNotifications() {
        this.subscribeToFlowControlNotifications(null);
    }
    /**
     * Unset the callback to call on sensor interface notifications.
     */
    default void unsubscribeToSensorInterfaceNotifications() {
        this.subscribeToSensorInterfaceNotifications(null);
    }

    /**
     * Load a configuration into the glasses.
     *
     * @param cfg The reader from which to read configuration.
     *
     * @throws IOException if the cfg cannot be read.
     */
    void loadConfiguration(BufferedReader cfg) throws IOException;
    /**
     * Turn glasses power on of off.
     *
     * @param on Turn on or off
     */
    void power(boolean on);
    /**
     * Clear glasses screen
     */
    void clear();
    /**
     * Set glasses screen to a grey level.
     *
     * @param level The grey level to set. It must be between 0x00 and 0x0F.
     * @see Utils#greyLevel(int)
     */
    void grey(byte level);
    /**
     * Send demo command.
     * {@link Deprecated}
     */
    void demo();
    /**
     * Send the firmware 4.0.0 demo command with parameter which was the test.
     *
     * @param pattern The pattern to display in the glasses.
     */
    void demo(DemoPattern pattern);
    /**
     * Send the test command to the glasses.
     *
     * @param pattern The pattern to display in the glasses.
     * {@link Deprecated}
     */
    void test(DemoPattern pattern);
    /**
     * Ask glasses battery level and run the callback with results.
     *
     * @param onResult Callback on to call on returned value with an iteger between 0 and 100.
     */
    void battery(Consumer<Integer> onResult);
    /**
     * Ask glasses for its version and run the callback with results.
     *
     * @param onResult Callback on to call on returned value.
     */
    void vers(Consumer<GlassesVersion> onResult);
    /**
     * Set glasses led mode
     *
     * @param state The mode to set
     */
    void led(LedState state);
    /**
     * Shift next graphical commands with this offsets.
     *
     * @param x The horizontal offset
     * @param y The vertical offset
     */
    void shift(short x, short y);
    /**
     * Ask glasses for its settings and run the callback with results.
     *
     * @param onResult Callback on to call on returned value.
     */
    void settings(Consumer<GlassesSettings> onResult);
    /**
     * Set the display luminance to the corresponding level (0 to 15)
     *
     * @param value The luminance
     */
    void luma(byte value);
    /**
     * Turn on/off the auto-brightness adjustment and gesture detection.
     *
     * @param enable Set on or off.
     */
    void sensor(boolean enable);
    /**
     * Turn on/off only the gesture detection.
     *
     * @param enable Set on or off.
     */
    void gesture(boolean enable);
    /**
     * Turn on/off only the auto brightness adjustment.
     *
     * @param enable Set on or off.
     */
    void als(boolean enable);
    /**
     * Sets the grey level (0 to 15) used to draw the next graphical element.
     *
     * @param value The selected color.
     */
    void color(byte value);
    /**
     * Set a pixel on at the corresponding coordinates.
     *
     * @param x The x coordinate of the point.
     * @param y The y coordinate of the point.
     */
    void point(short x, short y);
    /**
     * Draw a line at the corresponding coordinates.
     *
     * @param x1 The x coordinate of the starting point of the line.
     * @param y1 The y coordinate of the starting point of the line.
     * @param x2 The x coordinate of the ending point of the line.
     * @param y2 The y coordinate of the ending point of the line.
     */
    void line(short x1, short y1, short x2, short y2);
    /**
     * Draw an empty rectangle at the corresponding coordinates.
     *
     * @param x1 The x coordinate of the top left corner of the rectangle.
     * @param y1 The y coordinate of the top left corner of the rectangle.
     * @param x2 The x coordinate of the bottom right corner of the rectangle.
     * @param y2 The y coordinate of the bottom right corner of the rectangle.
     */
    void rect(short x1, short y1, short x2, short y2);
    /**
     * Draw a full rectangle at the corresponding coordinates.
     *
     * @param x1 The x coordinate of the top left corner of the rectangle.
     * @param y1 The y coordinate of the top left corner of the rectangle.
     * @param x2 The x coordinate of the bottom right corner of the rectangle.
     * @param y2 The y coordinate of the bottom right corner of the rectangle.
     */
    void rectf(short x1, short y1, short x2, short y2);
    /**
     * Draw an empty circle at the corresponding coordinates.
     *
     * @param x The x coordinate of the cirle center.
     * @param y The y coordinate of the cirle center.
     * @param r The radius of the circle.
     */
    void circ(short x, short y, byte r);
    /**
     * Draw a full circle at the corresponding coordinates.
     *
     * @param x The x coordinate of the cirle center.
     * @param y The y coordinate of the cirle center.
     * @param r The radius of the circle.
     */
    void circf(short x, short y, byte r);
    /**
     * Write text string at coordinates (x, y) with rotation, font size, and color.
     *
     * @param x The x coordinate for the text.
     * @param y The y coordinate for the text.
     * @param r The rotation of the text.
     * @param f The font size of the text.
     * @param c The color of the text.
     * @param s The text.
     */
    void txt(short x, short y, Rotation r, byte f, byte c, String s);
    /**
     * Draw multiple connected lines at the corresponding coordinates.
     *
     * @param xys Array of [x0, y1, x1, y1, ..., xn, yn]
     */
    void polyline(short[] xys);
    /**
     * Draw multiple connected lines at the corresponding coordinates. Thickness is set for all lines.
     *
     * @param thickness Polyline thickness
     * @param xys Array of [x0, y1, x1, y1, ..., xn, yn]
     */
    void polyline(byte thickness, short[] xys);
    /**
     * Hold or flush the graphic engine.
     * When held, new display commands are stored in memory and are displayed when the graphic engine is flushed.
     * This allows stacking multiple graphic operations and displaying them simultaneously without screen flickering.
     * Warning: Clear is not held by the graphic engine, a white rectangle can be used instead.
     *
     * @param action hold or flush display
     */
    void holdFlush(holdFlushAction action);
    /**
     * Give the list of bitmap saved into the device.
     *
     * @param onResult Callback on to call on returned value.
     */
    void imgList(Consumer<List<ImageInfo>> onResult);
    /**
     * Save 4bpp bitmap of size bytes and width pixels.
     * 
     * @param id   The image id in the configuration.
     * @param data 4bpp Image data configuration object.
     * {@link Deprecated}
     */
    void imgSave(byte id, ImageData data);
    /**
     * Save bitmap in the chosen format
     * @param id   The image id in the configuration.
     * @param img  The image to store in the configuration .
     * @param format The image format 
     */
    void imgSave(byte id, Bitmap img, ImgSaveFormat format);
    /**
     * Save 4bpp bitmap.
     * @param id   The image id in the configuration.
     * @param img  The image to store in the configuration .
     */     
    void imgSave4bpp(byte id, Bitmap img);
    /**
     * Save 1bpp bitmap.
     * @param id   The image id in the configuration.
     * @param img  The image to store in the configuration .
     */
    void imgSave1bpp(byte id, Bitmap img);
    /**
     * Save 4bpp bitmap with Heatshrink compression, decompressed into 4bpp by the firmware before saving
     * @param id   The image id in the configuration.
     * @param img  The image to store in the configuration .
     */
    void imgSave4bppHeatShrink(byte id, Bitmap img);
    /**
     * Save 4bpp bitmap with Heatshrink compression, stored compressed, decompressed into 4bpp before display
     * @param id   The image id in the configuration.
     * @param img  The image to store in the configuration .
     */
    void imgSave4bppHeatShrinkSaveComp(byte id, Bitmap img);
    /**
     * Display image id to the corresponding coordinates.
     *
     * @param id The id of the image to display.
     * @param x  The x coordinate for the image.
     * @param y  The y coordinate for the image.
     */
    void imgDisplay(byte id, short x, short y);
    /**
     * Erase all bitmaps with numbers &ge; id.
     *
     * @param id The id from which to delete images.
     */
    void imgDelete(byte id);
    /**
     * Erase all bitmaps.
     */
    void imgDeleteAll();
    /**
     * Stream bitmap image on display without saving it in memory.
     *
     * @param img  The image to store in the configuration.
     * @param format The image format
     * @param x    The x coordinate for the image.
     * @param y    The y coordinate for the image.
     */
    void imgStream(Bitmap img, ImgStreamFormat format, final short x, final short y);
    /**
     * Stream 1bpp bitmap image on display without saving it in memory.
     *
     * @param img  The image to store in the configuration.
     * @param x    The x coordinate for the image.
     * @param y    The y coordinate for the image.
     */
    void imgStream1bpp(Bitmap img, final short x, final short y);
    /**
     * Save 4bpp bitmap with Heatshrink compression, decompressed into 4bpp by the firmware before saving
     *
     * @param img  The image to store in the configuration.
     * @param x    The x coordinate for the image.
     * @param y    The y coordinate for the image.
     */
    void imgStream4bppHeatShrink(Bitmap img, final short x, final short y);
    /**
     * Give the list of font saved into the device with their size.
     *
     * @param onResult Callback on to call on returned value.
     */
    void fontList(Consumer<List<FontInfo>> onResult);
    /**
     * Save font nb of size Bytes.
     *
     * @param id   The id of the font.
     * @param data The font configuration object.
     */
    void fontSave(byte id, FontData data);
    /**
     * Selects font which will be used for followings txt commands.
     *
     * @param id The id of the font.
     */
    void fontSelect(byte id);
    /**
     * Erase font from flash if present.
     *
     * @param id The id of the font.
     */
    void fontDelete(byte id);
    /**
     * Erase all fonts.
     */
    void fontDeleteAll();
    /**
     * Save a layout (Min 17 hexadecimal parameters).
     *
     * @param layout The layout configuration object.
     */
    void layoutSave(LayoutParameters layout);
    /**
     * Erase corresponding layout.
     *
     * @param id The id of the layout.
     */
    void layoutDelete(byte id);
    /**
     * Erase all layout.
     */
    void layoutDeleteAll();
    /**
     * Display text value with layout # Id parameters.
     *
     * @param id   The id of the layout.
     * @param text The text to display for this layout.
     */
    void layoutDisplay(byte id, String text);
    /**
     * Clears screen of the corresponding layout area.
     *
     * @param id The id of the layout.
     */
    void layoutClear(byte id);
    /**
     * Get the list of layout ids.
     *
     * @param onResult The callback handling result.
     */
    void layoutList(Consumer<List<Integer>> onResult);
    /**
     * Redefine the position of a layout. Position is saved.
     *
     * @param id The id of the layout.
     * @param x  The x coordinate for the layout.
     * @param y  The y coordinate for the layout.
     */
    void layoutPosition(byte id, short x, byte y);
    /**
     * Display text value with layout at position x y. Position is not saved.
     *
     * @param id   The id of the layout.
     * @param x    The x coordinate for the layout.
     * @param y    The y coordinate for the layout.
     * @param text The text to display for this layout.
     */
    void layoutDisplayExtended(byte id, short x, byte y, String text);
    /**
     * Get a layout parameter.
     *
     * @param id   The id of the layout.
     * @param onResult The callback handling result.
     */
    void layoutGet(byte id, Consumer<LayoutParameters> onResult);
    /**
     * Clears screen of the corresponding layout area
     *
     * @param id   The id of the layout.
     * @param x    The x coordinate for the layout.
     * @param y    The y coordinate for the layout.
     */
    void layoutClearExtended(byte id, short x, byte y);
    /**
     * Clear area and display text with layout # Id parameters
     *
     * @param id   The id of the layout.
     * @param text The text to display for this layout.
     */
    void layoutClearAndDisplay(byte id, String text);
    /**
     * Clear area and display # Text with layout # Id at position # X # Y The position is not saved
     *
     * @param id   The id of the layout.
     * @param x    The x coordinate for the layout.
     * @param y    The y coordinate for the layout.
     * @param text The text to display for this layout.
     */
    void layoutClearAndDisplayExtended(byte id, short x, byte y, String text);
    /**
     * Display value (in percentage) of the gauge ([1…4]).
     *
     * @param id    Id of the gauge to display.
     * @param value Value in percentage for the gauge.
     */
    void gaugeDisplay(byte id, byte value);
    /**
     * Save the parameters for the gauge id.
     *
     * @param id        The id of the gauge.
     * @param x         The x coordinate of the center of the gauge.
     * @param y         The y coordinate of the center of the gauge.
     * @param r         The radius of the outer circle of the gauge.
     * @param rin       The radius of the inner circle of the gauge.
     * @param start     The start angle of the gauge.
     * @param end       The end angle of the gauge.
     * @param clockwise The orientation of the gauge.
     */
    void gaugeSave(byte id, short x, short y, char r, char rin, byte start, byte end, boolean clockwise);
    void gaugeSave(byte id, GaugeInfo gaugeInfo);
    void gaugeDelete(byte id);
    void gaugeDeleteAll();
    void gaugeList(Consumer<List<Integer>> onResult);
    void gaugeGet(byte id, Consumer<GaugeInfo> onResult);
    /**
     * Save parameters for a given page.
     *
     * @param id        The id of the page to save.
     * @param layoutIds The ids of the layouts included in the page.
     * @param xs        The x position of the layouts included in the page.
     * @param ys        The y position of the layouts included in the page.
     */
    void pageSave(byte id, byte[] layoutIds, short[] xs, byte[] ys);
    void pageSave(PageInfo page);
    /**
     * Reads saved parameter of a page or all pages.
     *
     * @param id       The id of the page to get.
     * @param onResult Callback on to call on returned value.
     */
    void pageGet(byte id, Consumer<PageInfo> onResult);
    /**
     * Erase a page.
     *
     * @param id Id of the page to delete.
     */
    void pageDelete(byte id);
    void pageDeleteAll();
    void pageDisplay(byte id, String[] texts);
    void pageClear(byte id);
    void pageList(Consumer<List<Integer>> onResult);    
    void pageClearAndDisplay(byte id, String[] texts);
    /**
     * Get number of pixel activated on display.
     *
     * @param onResult Callback on to call on returned integer value.
     */
    void pixelCount(Consumer<Long> onResult);
    /**
     * Get total number of charging cycle.
     *
     * @param onResult Callback on to call on returned integer value.
     */
    void getChargingCounter(Consumer<Long> onResult);
    /**
     * Get total number of charging minute.
     *
     * @param onResult Callback on to call on returned integer value.
     */
    void getChargingTime(Consumer<Long> onResult);
    /**
     * Reset charging counter and charging time value in Param.
     */
    void resetChargingParam();
    ///////////////////////
    /* Firmware 1.8 only */
    ///////////////////////
    void cfgWrite(String name, int version, int password);
    void cfgRead(String name, Consumer<ConfigurationElementsInfo> onResult);
    void cfgSet(String name);
    void cfgList(Consumer<List<ConfigurationDescription>> onResult);
    void cfgRename(String oldName, String newName, int password);
    void cfgDelete(String name);
    void cfgDeleteLessUsed();
    void cfgFreeSpace(Consumer<FreeSpace> onResult);
    void cfgGetNb(Consumer<Integer> onResult);
    void shutdown();
    ///////////////////////
    /* Firmware 1.7 only */
    ///////////////////////
    /**
     * Task debugging
     */
    void tdbg();
    /**
     * Write config, Config Id is used to track which config is in the device.
     *
     * @param config The configuration to write.
     */
    void WConfigID(Configuration config);
    /**
     * Read a configuration.
     *
     * @param number   The configuration id to read.
     * @param onResult Callback on to call on returned configuration.
     */
    void RConfigID(byte number, Consumer<Configuration> onResult);
    /**
     * Set current config to display BMP, layout and font.
     *
     * @param number The configuration number to select.
     */
    void SetConfigID(byte number);
    /////////////////////////
    /* Overloading helpers */
    /////////////////////////
    /**
     * Shift next graphical commands with this offsets.
     *
     * @param point The offset.
     */
    default void shift(Point point) {
        this.shift(Utils.toSignedCoordinate(point.x), Utils.toSignedCoordinate(point.y));
    }
    /**
     * Set a pixel on at the corresponding coordinates.
     *
     * @param point The coordinate of the point.
     */
    default void point(Point point) {
        this.point(Utils.toSignedCoordinate(point.x), Utils.toSignedCoordinate(point.y));
    }
    /**
     * Draw a line at the corresponding coordinates.
     *
     * @param p1 The coordinate of the starting point of the line.
     * @param p2 The coordinate of the ending point of the line.
     */
    default void line(Point p1, Point p2) {
        this.line(
                Utils.toSignedCoordinate(p1.x), Utils.toSignedCoordinate(p1.y),
                Utils.toSignedCoordinate(p2.x), Utils.toSignedCoordinate(p2.y)
        );
    }
    /**
     * Draw an empty rectangle at the corresponding coordinates.
     *
     * @param p1 The coordinate of the top left corner of the rectangle.
     * @param p2 The coordinate of the bottom right corner of the rectangle.
     */
    default void rect(Point p1, Point p2) {
        this.rect(
                Utils.toSignedCoordinate(p1.x), Utils.toSignedCoordinate(p1.y),
                Utils.toSignedCoordinate(p2.x), Utils.toSignedCoordinate(p2.y)
        );
    }
    /**
     * Draw a full rectangle at the corresponding coordinates.
     *
     * @param p1 The coordinate of the top left corner of the rectangle.
     * @param p2 The coordinate of the bottom right corner of the rectangle.
     */
    default void rectf(Point p1, Point p2) {
        this.rectf(
                Utils.toSignedCoordinate(p1.x), Utils.toSignedCoordinate(p1.y),
                Utils.toSignedCoordinate(p2.x), Utils.toSignedCoordinate(p2.y)
        );
    }
    /**
     * Draw an empty circle at the corresponding coordinates.
     *
     * @param p The coordinate of the cirle center.
     * @param r The radius of the circle.
     */
    default void circ(Point p, byte r) {
        this.circ(Utils.toSignedCoordinate(p.x), Utils.toSignedCoordinate(p.y), r);
    }
    /**
     * Draw a full circle at the corresponding coordinates.
     *
     * @param p The coordinate of the cirle center.
     * @param r The radius of the circle.
     */
    default void circf(Point p, byte r) {
        this.circf(Utils.toSignedCoordinate(p.x), Utils.toSignedCoordinate(p.y), r);
    }
    /**
     * Write text string at coordinates(x0,y0) with rotation, font size, and color.
     *
     * @param p The coordinate for the text.
     * @param r The rotation of the text.
     * @param f The font size of the text.
     * @param c The color of the text.
     * @param s The text.
     */
    default void txt(Point p, Rotation r, byte f, byte c, String s) {
        this.txt(Utils.toSignedCoordinate(p.x), Utils.toSignedCoordinate(p.y), r, f, c, s);
    }
    /**
     * Draw a multiple connected lines at the corresponding coordinates.
     *
     * @param points List of points.
     */
    default void polyline(List<Point> points) {
        short[] xys = new short[points.size() * 2];
        int i = 0;
        for (Point p : points) {
            xys[i++] = (short) p.x;
            xys[i++] = (short) p.y;
        }
        this.polyline(xys);
    }
    /**
     * Draw multiple connected lines at the corresponding coordinates. Thickness is set for all lines.
     *
     * @param thickness Polyline thickness
     * @param points List of points.
     */
    default void polyline(byte thickness, List<Point> points) {
        short[] xys = new short[points.size() * 2];
        int i = 0;
        for (Point p : points) {
            xys[i++] = (short) p.x;
            xys[i++] = (short) p.y;
        }
        this.polyline(thickness, xys);
    }

}
