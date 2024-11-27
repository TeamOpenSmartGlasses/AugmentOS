package com.activelook.debugapp;

import static com.activelook.activelooksdk.types.ImgSaveFormat.MONO_1BPP;
import static com.activelook.activelooksdk.types.ImgSaveFormat.MONO_4BPP;
import static com.activelook.activelooksdk.types.ImgSaveFormat.MONO_4BPP_HEATSHRINK;
import static com.activelook.activelooksdk.types.ImgSaveFormat.MONO_4BPP_HEATSHRINK_SAVE_COMP;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import android.Manifest;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Point;
import android.os.Bundle;
import android.util.Log;

import com.activelook.activelooksdk.DiscoveredGlasses;
import com.activelook.activelooksdk.Glasses;
import com.activelook.activelooksdk.Sdk;
import com.activelook.activelooksdk.types.ConfigurationDescription;
import com.activelook.activelooksdk.types.DemoPattern;
import com.activelook.activelooksdk.types.FontData;
import com.activelook.activelooksdk.types.FontInfo;
import com.activelook.activelooksdk.types.GaugeInfo;
import com.activelook.activelooksdk.types.Image1bppData;
import com.activelook.activelooksdk.types.ImageData;
import com.activelook.activelooksdk.types.ImageInfo;
import com.activelook.activelooksdk.types.ImgSaveFormat;
import com.activelook.activelooksdk.types.ImgStreamFormat;
import com.activelook.activelooksdk.types.LayoutParameters;
import com.activelook.activelooksdk.types.LedState;
import com.activelook.activelooksdk.types.Rotation;
import com.activelook.activelooksdk.types.holdFlushAction;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.concurrent.atomic.AtomicBoolean;

public class DebugActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_debug);
        runOnUiThread(() -> {
            Log.d("ANDROID", "Permissions");
            ActivityCompat.requestPermissions(DebugActivity.this, new String[] {
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.INTERNET,
                    Manifest.permission.WAKE_LOCK,
                    Manifest.permission.BLUETOOTH,
                    Manifest.permission.BLUETOOTH_ADMIN,
                    Manifest.permission.BLUETOOTH_CONNECT,
                    Manifest.permission.BLUETOOTH_SCAN
            }, 0);
            Log.d("SDK", "Init");
            Sdk.init(
                    DebugActivity.this,
                    "",
                    gu -> Log.d("GLASSES_UPDATE", String.format("onUpdateStart               : %s", gu)),
                    gu_f -> {
                          Log.d("GLASSES_UPDATE", String.format("onUpdateAvailableCallback   : %s", gu_f.first));
                          gu_f.second.run();
                    },
                    gu -> Log.d("GLASSES_UPDATE", String.format("onUpdateProgress            : %s", gu)),
                    gu -> Log.d("GLASSES_UPDATE", String.format("onUpdateSuccess             : %s", gu)),
                    gu -> Log.d("GLASSES_UPDATE", String.format("onUpdateError               : %s", gu))
           );
            this.connectOneGlasses();
        });
    }

    private void connectOneGlasses() {
        Log.d("SDK", "Scan");
        final AtomicBoolean search = new AtomicBoolean(true);
        Sdk.getInstance().startScan(dg -> {
            if (search.getAndSet(false)) {
                Sdk.getInstance().stopScan();
                Log.d("DISCOVER", String.format("Glasses connecting: %s", dg.getAddress()));
                Log.d("CONNECT", "Glasses connecting");
                dg.connect(
                        g -> DebugActivity.this.onGlassesConnected(g),
                        g -> DebugActivity.this.onGlassesConnectionFail(g),
                        g -> DebugActivity.this.onGlassesDisconnected(g)
                );
                Log.d("CONNECT", "Glasses connected");
            }
        });
    }

    private void onGlassesConnectionFail(final DiscoveredGlasses g) {
        Log.e("ERROR", String.format("Glasses could not be connected %s", g));
        this.connectOneGlasses();
    }

    private void onGlassesDisconnected(final Glasses g) {
        Log.d("DISCONNECT", String.format("Glasses have been disconnected %s", g));
        this.connectOneGlasses();
    }

    private void loopCfgRead(final int i, final Glasses g) {
        if (i > 0) {
            g.cfgRead("ALooK", info -> {
                Log.i("Loop", String.format("%d", i));
            });
            this.loopCfgRead(i-1, g);
        }
    }

    private void onGlassesConnected(final Glasses g) {
        // this.loopCfgRead(10, g);

        g.subscribeToBatteryLevelNotifications(level -> Log.i("BATTERY", String.format("Glasses battery level %d", level)));
        g.subscribeToSensorInterfaceNotifications(() -> Log.i("SWIPE", String.format("Glasses swipe")));
        g.subscribeToFlowControlNotifications(fc -> Log.e("FLOW CONTROL", String.format("Glasses flow control %s", fc.name())));

        try {
            g.cfgWrite("ALooKK", 1, 0xDEADBEEF);
            g.cfgDelete("ALooKK");
            // g.cfgWrite("ALooKK", 2, 0xDEADBEEF);
            // g.cfgWrite("ALooK", 3, 0xDEADBEEF);
            // FFD00013414C6F6F4B0000000000DEADBEEFAA
            // FFD00013414C6F6F4B0000000006DEADBEEFAA

            for (int i=0; i<1; i++) {
                g.clear();
            }

            for (int i=0; i<0; i++) {
                Log.i("LOAD CONFIG", String.format("NB %d", i));
                g.loadConfiguration(new BufferedReader(new InputStreamReader(getAssets().open("cfg-4.2.1.7-ALooKK.txt"))));
            }

            g.cfgList(l -> {
                // try {
                //     g.loadConfiguration(new BufferedReader(new InputStreamReader(getAssets().open("cfg-4.2.1.6-ALooK.txt"))));
                // } catch (IOException e) {
                //     e.printStackTrace();
                // }
                Log.i("CFG LIST", String.format("NB %d", l.size()));
                for (final ConfigurationDescription cfg : l) {
                    Log.i("CFG LIST", String.format("-> %s", cfg));
                    g.cfgRead(cfg.getName(), cfgi -> {
                        Log.i("CFG INFO", String.format("-> %s %s", cfg.getName(), cfgi));
                        if (l.indexOf(cfg) == l.size() - 1) {
                            Log.i("END", "...DEBUG DONE");
                            g.disconnect();
                        }
                    });
                }
            });
        } catch (IOException e) {
            e.printStackTrace();
        }

        // g.cfgWrite("DebugApp", 1, 42);
        // g.cfgSet("DebugApp");

        // this.runTests01(g);
        // this.runTestsLayout(g);
        // this.runTestsGauge(g);
        // this.runTestsPage(g);
        // this.runTestsStats(g);
        // this.runTestsConfig(g);
    }

    private void runTestsConfig(final Glasses g) {
        g.cfgRead("DebugApp", c -> {
            Log.i("CONFIG DEBUG", String.format("%s", c));
            Log.i("CONFIG DEBUG", String.format("getVersion  %d", c.getVersion()));
            Log.i("CONFIG DEBUG", String.format("getNbImg    %d", c.getNbImg()));
            Log.i("CONFIG DEBUG", String.format("getNbLayout %d", c.getNbLayout()));
            Log.i("CONFIG DEBUG", String.format("getNbFont   %d", c.getNbFont()));
            Log.i("CONFIG DEBUG", String.format("getNbPage   %d", c.getNbPage()));
            Log.i("CONFIG DEBUG", String.format("getNbGauge  %d", c.getNbGauge()));
        });
        g.cfgRename("DebugApp", "DebugConfig", 42);
        g.cfgRename("DebugConfig", "DebugApp", 42);
        g.cfgList(l -> {
            Log.i("CFG LIST", String.format("NB %d", l.size()));
            for (final ConfigurationDescription cfg : l) {
                Log.i("CFG LIST", String.format("-> %s", cfg));
                g.cfgRead(cfg.getName(), cfgi -> {
                    Log.i("CFG INFO", String.format("-> %s %s", cfg.getName(), cfgi));
                });
            }
        });
        // g.cfgDelete("DebugApp"); Not working
        // g.cfgDeleteLessUsed(); Not working
        g.cfgGetNb(c -> Log.i("CFG INFO", String.format("Nb %d", c)));
        g.cfgFreeSpace(fs -> {
            Log.i("CFG FREE SPACE", String.format("%s", fs));
            Log.i("CFG FREE SPACE", String.format("-> TotalSize %d", fs.getTotalSize()));
            Log.i("CFG FREE SPACE", String.format("-> FreeSpace %d", fs.getFreeSpace()));
        });
    }

    private void runTestsStats(final Glasses g) {
        g.pixelCount(c -> Log.i("STAT", String.format("Pixel count %d", c)));
        g.getChargingCounter(c -> Log.i("STAT", String.format("Charging counter %d", c)));
        g.getChargingTime(t -> Log.i("STAT", String.format("Charging time %d", t)));
        g.resetChargingParam();
        g.getChargingCounter(c -> Log.i("STAT", String.format("Charging counter %d", c)));
        g.getChargingTime(t -> Log.i("STAT", String.format("Charging time %d", t)));
    }

    private void runTestsPage(final Glasses g) {
        // TODO
    }

    private void runTestsGauge(final Glasses g) {
        byte id = 0x0B;
        final GaugeInfo gauge1 = new GaugeInfo((short) 151, (short) 127, 110, 75, (short) 3, (short) 14, true);
        g.gaugeSave(id, gauge1);
        for (byte b=0; b<=100; b+=20) {
            g.gaugeDisplay(id, b); // VERY LONG TOO PROCESS
        }
        g.gaugeList(l -> {
            Log.i("GAUGE LIST", String.format("NB %d", l.size()));
            for (final int ii: l) {
                Log.i("GAUGE LIST", String.format("-> %d", ii));
                g.gaugeGet((byte) ii, gg -> {
                    Log.i("GAUGE LIST", String.format("-> get %s", gg));
                    Log.i("GAUGE LIST", String.format("-> get (%d, %d)", gg.getX(), gg.getY()));
                });
            }
            g.gaugeDeleteAll();
        });
    }

    private void runTestsLayout(final Glasses g) {
        final LayoutParameters layout1 = new LayoutParameters(
                (byte) 0x0A,
                (short) 0, (byte) 0, (short) 303, (byte) 0xFF,
                (byte) 0x0F, (byte) 0x06, (byte) 0x01, true,
                (short) 127, (byte) 0x7F, Rotation.TOP_LR,true);
        final LayoutParameters layout2 = new LayoutParameters(
                (byte) 0x31,
                (short) 100, (byte) 100, (short) 100, (byte) 100,
                (byte) 0x0F, (byte) 0x06, (byte) 0x00, true,
                (short) 50, (byte) 50, Rotation.TOP_LR,false)
                .addSubCommandLine((short) 100, (short) 100, (short) 200, (short) 200);

// with the clipping region (0;0)/(303;255),
// forecolor 15, back color 0, font 1,
// display the argument value as text at (EE,30) with direction 4 and opacity on
// 0A | 0000 | 1E CD | 00 | 97E6 | 0F 00 01 01006 | EE3 | 04 | 01

        g.layoutSave(layout1);
        // g.layoutSave(layout2);

        g.layoutDisplay((byte) 0x30, "0000000000");
        g.layoutClear((byte) 0x30);

        g.layoutDisplayExtended((byte) 0x30, (short) 200, (byte) 127, "0000000000");

        g.layoutPosition((byte) 0x30, (short) 100, (byte) 64);
        g.layoutDisplay((byte) 0x30, "0000000000");
        g.layoutClear((byte) 0x30);

        // g.layoutDisplay((byte) 0x31, "1111111111");

        g.layoutList(l -> {
            Log.i("LAYOUT LIST", String.format("NB %d", l.size()));
            for (final int ii: l) {
                Log.i("LAYOUT LIST", String.format("-> %d", ii));
                g.layoutDisplay((byte) ii, String.format("L %d", ii));
                g.layoutGet((byte) ii, ly -> {
                    Log.i("LAYOUT LIST", String.format("-> get %s", ly));
                });
            }
            g.layoutDeleteAll();
        });
    }

    private void runTests01(final Glasses g) throws IOException {
        Log.i("GLASSES", String.format("Manufacturer %s", g.getManufacturer()));
        Log.i("GLASSES", String.format("Name %s", g.getName()));
        Log.i("GLASSES", String.format("Address %s", g.getAddress()));
        Log.i("GLASSES", String.format("isFirmwareAtLeast %s %s", "4.0.0", g.isFirmwareAtLeast("4.0.0") ? "yes" : "no"));
        Log.i("GLASSES", String.format("compareFirmwareVersion %s %d", "4.0.0", g.compareFirmwareVersion("4.0.0")));
        Log.i("GLASSES", String.format("DeviceInformation %s", g.getDeviceInformation()));
        Log.i("GLASSES", String.format("DeviceInformation manufacturerName %s", g.getDeviceInformation().getManufacturerName()));
        Log.i("GLASSES", String.format("DeviceInformation modelNumber      %s", g.getDeviceInformation().getModelNumber()));
        Log.i("GLASSES", String.format("DeviceInformation serialNumber     %s", g.getDeviceInformation().getSerialNumber()));
        Log.i("GLASSES", String.format("DeviceInformation hardwareVersion  %s", g.getDeviceInformation().getHardwareVersion()));
        Log.i("GLASSES", String.format("DeviceInformation firmwareVersion  %s", g.getDeviceInformation().getFirmwareVersion()));
        Log.i("GLASSES", String.format("DeviceInformation softwareVersion  %s", g.getDeviceInformation().getSoftwareVersion()));
        g.power(true);
        g.clear();
        g.grey((byte) 15);
        g.power(false);
        g.grey((byte) 7);
        g.power(true);
        g.grey((byte) 10);
        g.clear();

        g.demo(DemoPattern.CROSS);
        g.clear();

        g.battery(level -> Log.i("BATTERY", String.format("Glasses battery level cmd %d", level)));
        g.vers(v -> {
            Log.i("VERSION", String.format("Cmd vers %s", v));
            Log.i("VERSION", String.format("Cmd vers getMajor   %d", v.getMajor()));
            Log.i("VERSION", String.format("Cmd vers getMinor   %d", v.getMinor()));
            Log.i("VERSION", String.format("Cmd vers getPatch   %d", v.getPatch()));
            Log.i("VERSION", String.format("Cmd vers getExtra   %s", v.getExtra()));
            Log.i("VERSION", String.format("Cmd vers getYear    %d", v.getYear()));
            Log.i("VERSION", String.format("Cmd vers getWeek    %d", v.getWeek()));
            Log.i("VERSION", String.format("Cmd vers getSerial  %d", v.getSerial()));
        });

        g.led(LedState.ON);
        g.led(LedState.BLINK);
        g.led(LedState.OFF);
        g.led(LedState.TOGGLE);

        g.shift((short) 100, (short) 100);
        g.luma((byte) 5);
        g.sensor(true);
        g.gesture(false);
        g.als(true);
        g.settings(s -> {
            Log.i("SETTINGS", String.format("Cmd settings %s", s));
            Log.i("SETTINGS", String.format("Cmd settings getGlobalXShift %d", s.getGlobalXShift()));
            Log.i("SETTINGS", String.format("Cmd settings getGlobalYShift %d", s.getGlobalYShift()));
            Log.i("SETTINGS", String.format("Cmd settings getLuma         %d", s.getLuma()));
            Log.i("SETTINGS", String.format("Cmd settings isAlsEnable     %s", s.isAlsEnable() ? "yes" : "no"));
            Log.i("SETTINGS", String.format("Cmd settings isGestureEnable %s", s.isGestureEnable() ? "yes" : "no"));
        });
        g.color((byte) 10);
        g.line(new Point(0, 0), new Point(100, 100));
        g.line(new Point(0, 100), new Point(100, 0));

        g.shift((short) 0, (short) 0);
        g.sensor(false);
        g.gesture(true);
        g.als(false);
        g.luma((byte) 15);
        g.settings(s -> {
            Log.i("SETTINGS", String.format("Cmd settings %s", s));
            Log.i("SETTINGS", String.format("Cmd settings getGlobalXShift %d", s.getGlobalXShift()));
            Log.i("SETTINGS", String.format("Cmd settings getGlobalYShift %d", s.getGlobalYShift()));
            Log.i("SETTINGS", String.format("Cmd settings getLuma         %d", s.getLuma()));
            Log.i("SETTINGS", String.format("Cmd settings isAlsEnable     %s", s.isAlsEnable() ? "yes" : "no"));
            Log.i("SETTINGS", String.format("Cmd settings isGestureEnable %s", s.isGestureEnable() ? "yes" : "no"));
        });
        g.color((byte) 15);
        g.line(new Point(0, 0), new Point(100, 100));
        g.line(new Point(0, 100), new Point(100, 0));

        g.clear();

        g.holdFlush(holdFlushAction.HOLD);
        g.color((byte) 8);
        g.rect(new Point(0, 0), new Point(100, 100));
        g.rectf(new Point(10, 10), new Point(90, 90));
        g.color((byte) 15);
        g.circ(new Point(150, 50), (byte) 50);
        g.circf(new Point(150, 50), (byte) 30);

        g.txt(new Point(200, 150), Rotation.TOP_LR, (byte) 0x00, (byte) 0xFF, "Mon Super Test");

        g.polyline(new short [] {
                150, 200, 200, 250, 200, 200, 250, 250, 150, 200
        });
        g.holdFlush(holdFlushAction.FLUSH);

        g.imgList(l -> {
            Log.i("IMG LIST", String.format("NB %d", l.size()));
            for (final ImageInfo ii: l) {
                Log.i("IMG LIST", String.format("-> %s", ii));
                Log.i("IMG LIST", String.format("-> getId %d", ii.getId()));
                Log.i("IMG LIST", String.format("-> getWidth %d", ii.getWidth()));
                Log.i("IMG LIST", String.format("-> getHeight %d", ii.getHeight()));
                g.imgDisplay((byte) ii.getId(), (short) 250, (short) 50);
            }
        });

        InputStream img1InputStream = getAssets().open("40_chrono_40x40.png");
        Bitmap img1 = BitmapFactory.decodeStream(img1InputStream);  

        InputStream img2InputStream = getAssets().open("66_congrats_80x79.PNG");
        Bitmap img2 = BitmapFactory.decodeStream(img2InputStream);  

        g.cfgWrite("DebugApp", 1, 42);

        g.imgSave((byte) 0x01, img1, MONO_4BPP);
        g.imgSave((byte) 0x02, img2, MONO_1BPP);
        g.imgSave((byte) 0x03, img1, MONO_4BPP_HEATSHRINK);
        g.imgSave((byte) 0x04, img2, MONO_4BPP_HEATSHRINK_SAVE_COMP);
        g.imgStream(img1, ImgStreamFormat.MONO_1BPP, (short) 30, (short) 30);
        g.imgStream(img2, ImgStreamFormat.MONO_4BPP_HEATSHRINK, (short) 50, (short) 30);

        g.imgList(l -> {
            Log.i("IMG LIST", String.format("NB %d", l.size()));
            for (final ImageInfo ii: l) {
                Log.i("IMG LIST", String.format("-> %s", ii));
                Log.i("IMG LIST", String.format("-> getId %d", ii.getId()));
                Log.i("IMG LIST", String.format("-> getWidth %d", ii.getWidth()));
                Log.i("IMG LIST", String.format("-> getHeight %d", ii.getHeight()));
                g.imgDisplay((byte) ii.getId(), (short) 250, (short) 50);
            }
            g.imgDeleteAll();
            g.imgList(le -> {
                Log.i("IMG LIST", String.format("NB after delete all %d", le.size()));
            });
        });

        final FontData font1 = new FontData(new byte[]{
                (byte) 0x02, (byte) 0x16, (byte) 0x00, (byte) 0x30, (byte) 0x00, (byte) 0x39, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x1F, (byte) 0x00, (byte) 0x35, (byte) 0x00, (byte) 0x4C, (byte) 0x00, (byte) 0x64, (byte) 0x00, (byte) 0x7D, (byte) 0x00, (byte) 0x94, (byte) 0x00, (byte) 0xAF, (byte) 0x00, (byte) 0xC4, (byte) 0x00, (byte) 0xE0, (byte) 0x1F, (byte) 0x0D, (byte) 0x00, (byte) 0x0A, (byte) 0x25, (byte) 0x77, (byte) 0x59, (byte) 0x34, (byte) 0x33, (byte) 0x34, (byte) 0x34, (byte) 0x24,
                (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x33, (byte) 0x49, (byte) 0x57, (byte) 0x75, (byte) 0x40, (byte) 0x16, (byte) 0x0D, (byte) 0x00, (byte) 0x0A, (byte) 0x52, (byte) 0x85, (byte) 0x67, (byte) 0x67, (byte) 0x61, (byte) 0x24, (byte) 0x94, (byte) 0x94, (byte) 0x94, (byte) 0x94, (byte) 0x94, (byte) 0x94, (byte) 0x94, (byte) 0x94, (byte) 0x94,
                (byte) 0x94, (byte) 0x94, (byte) 0x40, (byte) 0x17, (byte) 0x0D, (byte) 0x00, (byte) 0x0A, (byte) 0x25, (byte) 0x68, (byte) 0x4A, (byte) 0x34, (byte) 0x24, (byte) 0x33, (byte) 0x43, (byte) 0xA3, (byte) 0x94, (byte) 0x94, (byte) 0x84, (byte) 0x84, (byte) 0x84, (byte) 0x84, (byte) 0x84, (byte) 0x8B, (byte) 0x2B, (byte) 0x2B, (byte) 0x10, (byte) 0x18, (byte) 0x0D, (byte) 0x00, (byte) 0x0A, (byte) 0x16, (byte) 0x69, (byte) 0x3A, (byte) 0x34, (byte) 0x34, (byte) 0x94, (byte) 0x84, (byte) 0x66,
                (byte) 0x76, (byte) 0x77, (byte) 0xA4, (byte) 0x94, (byte) 0x23, (byte) 0x44, (byte) 0x24, (byte) 0x34, (byte) 0x2A, (byte) 0x48, (byte) 0x75, (byte) 0x40, (byte) 0x19, (byte) 0x0D, (byte) 0x00, (byte) 0x0A, (byte) 0x54, (byte) 0x85, (byte) 0x76, (byte) 0x76, (byte) 0x67, (byte) 0x67, (byte) 0x53, (byte) 0x14, (byte) 0x43, (byte) 0x24, (byte) 0x43, (byte) 0x24, (byte) 0x33, (byte) 0x34, (byte) 0x3B, (byte) 0x2B, (byte) 0x2B, (byte) 0x84, (byte) 0x94, (byte) 0x94, (byte) 0x20, (byte) 0x17,
                (byte) 0x0D, (byte) 0x00, (byte) 0x0A, (byte) 0x09, (byte) 0x49, (byte) 0x49, (byte) 0x43, (byte) 0xA3, (byte) 0x98, (byte) 0x5A, (byte) 0x3A, (byte) 0xA4, (byte) 0x94, (byte) 0x94, (byte) 0x23, (byte) 0x44, (byte) 0x24, (byte) 0x33, (byte) 0x49, (byte) 0x48, (byte) 0x75, (byte) 0x40, (byte) 0x1B, (byte) 0x0D, (byte) 0x00, (byte) 0x0A, (byte) 0x44, (byte) 0x76, (byte) 0x67, (byte) 0x55, (byte) 0x83, (byte) 0x94, (byte) 0x14, (byte) 0x4A, (byte) 0x3A, (byte) 0x34, (byte) 0x34, (byte) 0x24,
                (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x39, (byte) 0x57, (byte) 0x75, (byte) 0x40, (byte) 0x15, (byte) 0x0D, (byte) 0x00, (byte) 0x09, (byte) 0x7B, (byte) 0x2B, (byte) 0x2B, (byte) 0x93, (byte) 0x94, (byte) 0x93, (byte) 0x94, (byte) 0x94, (byte) 0x84, (byte) 0x94, (byte) 0x93, (byte) 0x94, (byte) 0x93, (byte) 0x94, (byte) 0x94, (byte) 0x84, (byte) 0x70, (byte) 0x1C, (byte) 0x0D, (byte) 0x00, (byte) 0x0A, (byte) 0x25, (byte) 0x68,
                (byte) 0x59, (byte) 0x34, (byte) 0x33, (byte) 0x34, (byte) 0x33, (byte) 0x43, (byte) 0x24, (byte) 0x48, (byte) 0x67, (byte) 0x59, (byte) 0x34, (byte) 0x33, (byte) 0x34, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x2A, (byte) 0x49, (byte) 0x65, (byte) 0x40, (byte) 0x1B, (byte) 0x0D, (byte) 0x00, (byte) 0x0A, (byte) 0x24, (byte) 0x87, (byte) 0x59, (byte) 0x34, (byte) 0x33, (byte) 0x34, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24, (byte) 0x34, (byte) 0x24,
                (byte) 0x34, (byte) 0x2B, (byte) 0x3A, (byte) 0x44, (byte) 0x13, (byte) 0x94, (byte) 0x84, (byte) 0x67, (byte) 0x66, (byte) 0x74, (byte) 0x60,
        });
        g.txt(new Point(240, 150), Rotation.TOP_LR, (byte) 0x0A, (byte) 0xFF, "0123456789");
        g.txt(new Point(240, 100), Rotation.TOP_LR, (byte) 0x20, (byte) 0xFF, "0123456789");
        g.fontSave((byte) 0x0A, font1);
        g.fontList(l -> {
            Log.i("FONT LIST", String.format("NB %d", l.size()));
            for (final FontInfo fi: l) {
                Log.i("FONT LIST", String.format("-> %s", fi));
                Log.i("FONT LIST", String.format("-> getId %d", fi.getId()));
                Log.i("FONT LIST", String.format("-> getHeight %d", fi.getHeight()));
                g.fontSelect((byte) fi.getId());
                g.txt(new Point(200, 150), Rotation.TOP_LR, (byte) 0x0A, (byte) 0xFF, "0123456789");
                g.txt(new Point(200, 100), Rotation.TOP_LR, (byte) 0x20, (byte) 0xFF, "0123456789");
            }
            g.fontDeleteAll();
            g.fontList(le -> {
                Log.i("FONT LIST", String.format("NB after delete all %d", le.size()));
            });
        });

        for (short x = 1; x < 304; x += 50) {
            for (short y = 1; y < 256; y += 50) {
                g.point(x, y);
            }
        }
        for (short x = 1; x < 304; x += 25) {
            for (short y = 1; y < 256; y += 25) {
                g.point(x, y);
            }
        }

        // g.unsubscribeToBatteryLevelNotifications();
        // g.unsubscribeToSensorInterfaceNotifications();
        // g.unsubscribeToFlowControlNotifications();
        // g.disconnect();
    }

}
