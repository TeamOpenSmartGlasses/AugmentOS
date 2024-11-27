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

import com.activelook.activelooksdk.types.ConfigurationDescription;
import com.activelook.activelooksdk.types.ConfigurationElementsInfo;
import com.activelook.activelooksdk.types.DemoPattern;
import com.activelook.activelooksdk.types.FontInfo;
import com.activelook.activelooksdk.types.FreeSpace;
import com.activelook.activelooksdk.types.GaugeInfo;
import com.activelook.activelooksdk.types.GlassesSettings;
import com.activelook.activelooksdk.types.GlassesVersion;
import com.activelook.activelooksdk.types.ImageInfo;
import com.activelook.activelooksdk.types.ImgStreamFormat;
import com.activelook.activelooksdk.types.LayoutParameters;
import com.activelook.activelooksdk.types.LedState;
import com.activelook.activelooksdk.types.Rotation;
import com.activelook.activelooksdk.types.ImgSaveFormat;
import com.activelook.activelooksdk.types.holdFlushAction;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class CommandData {

    public static final class Int8 {
        public static final byte asByte(final long l) {
            return (byte) l;
        }
        public static final short asShort(final byte b) {
            return b;
        }
    }

    public static final class UInt8 {
        public static final byte asByte(final long l) {
            return (byte) l;
        }
        public static final short asShort(final byte b) {
            return (short) (b & 0xFF);
        }
    }

    public static final class Int16 {
        public static final byte[] asBytes(final long l) {
            final byte hi = (byte) (l >> 8);
            final byte lo = (byte) l;
            return new byte [] { hi, lo };
        }
        public static final short asShort(final byte hi, final byte lo) {
            return (short) (((hi & 0xFF) << 8) | (lo & 0xFF));
        }
        public static final short asShort(final byte ...bytes) {
            return CommandData.Int16.asShort(bytes[0], bytes[1]);
        }
    }

    public static final class UInt16 {
        public static final byte[] asBytes(final long l) {
            final byte hi = (byte) (l >> 8);
            final byte lo = (byte) l;
            return new byte [] { hi, lo };
        }
        public static final int asInt(final byte hi, final byte lo) {
            return (hi & 0xFF) << 8 | (lo & 0xFF);
        }
        public static final int asInt(final byte ...bytes) {
            return CommandData.UInt16.asInt(bytes[0], bytes[1]);
        }
    }

    public static final class Int32 {
        public static final byte[] asBytes(final long l) {
            final byte b3 = (byte) (l >> 24);
            final byte b2 = (byte) (l >> 16);
            final byte b1 = (byte) (l >> 8);
            final byte b0 = (byte) l;
            return new byte [] { b3, b2, b1, b0 };
        }
        public static final int asInt(
                final byte b3,
                final byte b2,
                final byte b1,
                final byte b0) {
            return (int) (((b3 & 0xFF) << 24) | ((b2 & 0xFF) << 16)
                    | ((b1 & 0xFF) << 8)  |  (b0 & 0xFF));
        }
        public static final int asInt(final byte ...bytes) {
            return CommandData.Int32.asInt(bytes[0], bytes[1], bytes[2], bytes[3]);
        }
    }

    public static final class UInt32 {
        public static final byte[] asBytes(final long l) {
            final byte b3 = (byte) (l >> 24);
            final byte b2 = (byte) (l >> 16);
            final byte b1 = (byte) (l >> 8);
            final byte b0 = (byte) l;
            return new byte [] { b3, b2, b1, b0 };
        }
        public static final long asLong(
                final byte b3,
                final byte b2,
                final byte b1,
                final byte b0) {
            return (long) ((((long) b3 & 0xFF) << 24) | ((b2 & 0xFF) << 16)
                    | ((b1 & 0xFF) << 8)  |  (b0 & 0xFF));
        }
        public static final long asLong(final byte ...bytes) {
            return CommandData.UInt32.asLong(bytes[0], bytes[1], bytes[2], bytes[3]);
        }
    }

    private byte [] bytes;
    private int offset;

    public CommandData(final byte ...bytes) {
        super();
        this.bytes = bytes;
        this.offset = 0;
    }

    private CommandData(final byte [] src, final int start, final int size) {
        this(new byte [size]);
        System.arraycopy(src, start, this.bytes, 0, size);
    }

    public final byte [] getBytes() {
        return this.bytes;
    }

    public List<CommandData> split(final int chunkSize) {
        final List<CommandData> chunks = new ArrayList<>();
        int offset = 0;
        while (offset < this.bytes.length) {
            final int currentSize = Math.min(chunkSize, this.bytes.length - offset);
            chunks.add(new CommandData(this.bytes, offset, currentSize));
            offset += currentSize;
        }
        return chunks;
    }

    public String toHexString() {
        StringBuilder result = new StringBuilder();
        for (byte b : this.bytes) {
            result.append(String.format("%02X", b));
        }
        return result.toString();
    }

    public CommandData add(final byte ...bs) {
        final byte [] as = this.bytes;
        this.bytes = new byte [as.length + bs.length];
        System.arraycopy(as, 0, this.bytes, 0, as.length);
        System.arraycopy(bs, 0, this.bytes, as.length, bs.length);
        return this;
    }

    public CommandData add(final CommandData otherData) {
        return this.add(otherData.getBytes());
    }

    public CommandData addInt8(final byte ...bytes) {
        final byte [] asBytes = new byte [bytes.length];
        int i = 0;
        for (final byte b : bytes) {
            asBytes[i] = CommandData.Int8.asByte(b);
            i += 1;
        }
        return this.add(asBytes);
    }

    public CommandData addUInt8(final short ...shorts) {
        final byte [] asBytes = new byte [shorts.length];
        int i = 0;
        for (final short s : shorts) {
            asBytes[i] = CommandData.UInt8.asByte(s);
            i += 1;
        }
        return this.add(asBytes);
    }

    public CommandData addInt16(final short ...shorts) {
        final byte [] asBytes = new byte [shorts.length * 2];
        int i = 0;
        for (final short s : shorts) {
            System.arraycopy(CommandData.Int16.asBytes(s), 0, asBytes, i, 2);
            i += 2;
        }
        return this.add(asBytes);
    }

    public CommandData addUInt16(final int ...ints) {
        final byte [] asBytes = new byte [ints.length * 2];
        int i = 0;
        for (final int in: ints) {
            System.arraycopy(CommandData.UInt16.asBytes(in), 0, asBytes, i, 2);
            i += 2;
        }
        return this.add(asBytes);
    }

    public CommandData addInt32(final int ...ints) {
        final byte [] asBytes = new byte [ints.length * 4];
        int i = 0;
        for (final int in: ints) {
            System.arraycopy(CommandData.Int32.asBytes(in), 0, asBytes, i, 4);
            i += 4;
        }
        return this.add(asBytes);
    }

    public CommandData addUInt32(final long ...longs) {
        final byte [] asBytes = new byte [longs.length * 4];
        int i = 0;
        for (final long l: longs) {
            System.arraycopy(CommandData.UInt32.asBytes(l), 0, asBytes, i, 4);
            i += 4;
        }
        return this.add(asBytes);
    }

    public CommandData addNulTerminatedStrings(final String ...strings) {
        for (final String str : strings) {
            this.add(str.getBytes(StandardCharsets.US_ASCII));
            this.add((byte) 0x00);
        }
        return this;
    }

    ////////////////////
    // Static methods //
    ////////////////////
    // From
    public static CommandData fromBoolean(final boolean value) {
        return new CommandData(value ? (byte) 0x01 : (byte) 0x00);
    }

    public static CommandData fromGreyLevel(final byte level) {
        assert 0 <= level  : String.format(Locale.US, "Grey level out of bounds: %d <  0", level);
        assert level <= 15 : String.format(Locale.US, "Grey level out of bounds: %d > 15", level);
        return new CommandData(level);
    }

    public static CommandData fromDemoPattern(final DemoPattern pattern) {
        assert pattern != null : String.format(Locale.US, "Pattern cannot be null");
        switch (pattern) {
            case FILL:  return new CommandData((byte) 0x00);
            case CROSS: return new CommandData((byte) 0x01);
            case IMAGE: return new CommandData((byte) 0x02);
            default:    return new CommandData((byte) 0x03);
        }
    }

    public static CommandData fromLedState(final LedState state) {
        assert state != null : String.format(Locale.US, "State cannot be null");
        switch (state) {
            case OFF:    return new CommandData((byte) 0x00);
            case ON:     return new CommandData((byte) 0x01);
            case TOGGLE: return new CommandData((byte) 0x02);
            case BLINK:  return new CommandData((byte) 0x03);
            default:     return new CommandData((byte) 0x04);
        }
    }

    public static CommandData fromImgSaveFormat(final ImgSaveFormat format) {
        assert format != null : String.format(Locale.US, "Format cannot be null");
        switch (format) {
            case MONO_4BPP:                         return new CommandData((byte) 0x00);
            case MONO_1BPP:                         return new CommandData((byte) 0x01);
            case MONO_4BPP_HEATSHRINK:              return new CommandData((byte) 0x02);
            case MONO_4BPP_HEATSHRINK_SAVE_COMP:    return new CommandData((byte) 0x03);
            default:                                return new CommandData((byte) 0x04);
        }
    }

    public static CommandData fromHoldFLushAction(final holdFlushAction action) {
        assert action != null : String.format(Locale.US, "State cannot be null");
        switch (action) {
            case HOLD:    return new CommandData((byte) 0x00);
            case FLUSH:     return new CommandData((byte) 0x01);
            default:     return new CommandData((byte) 0x03);
        }
    }

    public static CommandData fromImgStreamFormat(final ImgStreamFormat format) {
        assert format != null : String.format(Locale.US, "Format cannot be null");
        switch (format) {
            case MONO_1BPP:                         return new CommandData((byte) 0x01);
            case MONO_4BPP_HEATSHRINK:              return new CommandData((byte) 0x02);
            default:                                return new CommandData((byte) 0x04);
        }
    }

    public static CommandData fromLuma(final byte value) {
        assert 0 <= value  : String.format(Locale.US, "Luma out of bounds: %d <  0", value);
        assert value <= 15 : String.format(Locale.US, "Luma out of bounds: %d > 15", value);
        return new CommandData(value);
    }

    public static CommandData fromRotation(final Rotation rotation) {
        assert rotation != null : String.format(Locale.US, "Rotation cannot be null");
        switch (rotation) {
            case BOTTOM_RL: return new CommandData((byte) 0x00);
            case BOTTOM_LR: return new CommandData((byte) 0x01);
            case LEFT_BT:   return new CommandData((byte) 0x02);
            case LEFT_TB:   return new CommandData((byte) 0x03);
            case TOP_LR:    return new CommandData((byte) 0x04);
            case TOP_RL:    return new CommandData((byte) 0x05);
            case RIGHT_TB:  return new CommandData((byte) 0x06);
            case RIGHT_BT:  return new CommandData((byte) 0x07);
            default:        return new CommandData((byte) 0x08);
        }
    }

    public static CommandData fromLayoutParameters(final LayoutParameters layoutParameters) {
        return new CommandData(layoutParameters.toBytes());
    }

    // To
    public static int toBatteryLevel(final byte [] bytes) {
        return UInt8.asShort(bytes[0]);
    }

    public static GlassesVersion toGlassesVersion(final byte [] bytes) {
        final CommandData dec = new CommandData(bytes);
        return new GlassesVersion(
                dec.readShort(1),
                dec.readShort(1),
                dec.readShort(1),
                dec.readChar(1),
                dec.readShort(1),
                dec.readShort(1),
                dec.readInt(3)
        );
    }

    public static GlassesSettings toGlassesSettings(final byte [] bytes) {
        final CommandData dec = new CommandData(bytes);
        return new GlassesSettings(
                dec.readByte(),
                dec.readByte(),
                dec.readByte(),
                dec.readBoolean(),
                dec.readBoolean()
        );
    }

    public static List<ImageInfo> toImageInfoList(final byte [] bytes) {
        final CommandData dec = new CommandData(bytes);
        final ArrayList<ImageInfo> result = new ArrayList<>();
        while (dec.hasNext()) {
            result.add(new ImageInfo(
                    dec.readByte(),
                    dec.readInt(2),
                    dec.readInt(2)
            ));
        }
        return result;
    }

    public static List<FontInfo> toFontInfoList(final byte [] bytes) {
        final CommandData dec = new CommandData(bytes);
        final ArrayList<FontInfo> result = new ArrayList<>();
        while (dec.hasNext()) {
            result.add(new FontInfo(
                    dec.readShort(1),
                    dec.readShort(1)
            ));
        }
        return result;
    }

    public static LayoutParameters toLayoutParameters(final byte id, final byte [] bytes) {
        return new LayoutParameters(id, bytes);
    }

    public static GaugeInfo toGaugeInfo(final byte [] bytes) {
        int i = 0;
        return new GaugeInfo(
                CommandData.Int16.asShort(bytes[i++], bytes[i++]),
                CommandData.Int16.asShort(bytes[i++], bytes[i++]),
                CommandData.UInt16.asInt(bytes[i++], bytes[i++]),
                CommandData.UInt16.asInt(bytes[i++], bytes[i++]),
                CommandData.UInt8.asShort(bytes[i++]),
                CommandData.UInt8.asShort(bytes[i++]),
                bytes[i++] != 0
        );
    }

    public static ConfigurationElementsInfo toConfigurationElementsInfo(final byte[] bytes) {
        int i = 0;
        return new ConfigurationElementsInfo(
                CommandData.UInt32.asLong(bytes[i++], bytes[i++], bytes[i++], bytes[i++]),
                CommandData.UInt8.asShort(bytes[i++]),
                CommandData.UInt8.asShort(bytes[i++]),
                CommandData.UInt8.asShort(bytes[i++]),
                CommandData.UInt8.asShort(bytes[i++]),
                CommandData.UInt8.asShort(bytes[i++])
        );
    }

    public static List<ConfigurationDescription> toConfigurationDescriptionList(final byte [] bytes) {
        final ArrayList<ConfigurationDescription> result = new ArrayList<>();
        int i = 0;
        while (i < bytes.length) {
            int nameLength = 0;
            while (bytes[i + nameLength] != 0) {
                nameLength ++;
            }
            final byte [] nameBuffer = new byte [nameLength];
            System.arraycopy(bytes, i, nameBuffer, 0, nameLength);
            final String name = new String(nameBuffer, StandardCharsets.US_ASCII);
            i += nameLength + 1;
            result.add(new ConfigurationDescription(
                    name,
                    CommandData.UInt32.asLong(bytes[i++], bytes[i++], bytes[i++], bytes[i++]),
                    CommandData.UInt32.asLong(bytes[i++], bytes[i++], bytes[i++], bytes[i++]),
                    CommandData.UInt8.asShort(bytes[i++]),
                    CommandData.UInt8.asShort(bytes[i++]),
                    bytes[i++] != 0
            ));
        }
        return result;
    }

    public static FreeSpace toFreeSpace(final byte[] bytes) {
        int i = 0;
        return new FreeSpace(
                CommandData.UInt32.asLong(bytes[i++], bytes[i++], bytes[i++], bytes[i++]),
                CommandData.UInt32.asLong(bytes[i++], bytes[i++], bytes[i++], bytes[i++])
        );
    }

    /////////////
    // Decoder //
    /////////////

    private boolean hasNext() {
        return this.offset < this.bytes.length;
    }

    private byte readByte() {
        return this.bytes[this.offset++];
    }

    private long readLong(final int size) {
        long result = 0l;
        final int end = size + this.offset;
        while (this.offset < end) {
            result = (result << 8) | (this.readByte() & 0xFF);
        }
        return result;
    }

    private byte readByte(final int position) {
        this.offset = position;
        return this.readByte();
    }

    private long readLong() {
        return this.readLong(8);
    }

    private long readLong(final int offset, final int size) {
        this.offset = offset;
        return this.readLong(size);
    }

    private char readChar() {
        return (char) this.readLong(2);
    }

    private char readChar(final int size) {
        return (char) this.readLong(size);
    }

    private char readChar(final int offset, final int size) {
        return (char) this.readLong(offset, size);
    }

    private short readShort() {
        return (short) this.readLong(2);
    }

    private short readShort(final int size) {
        return (short) this.readLong(size);
    }

    private short readShort(final int offset, final int size) {
        return (short) this.readLong(offset, size);
    }

    private int readInt() {
        return (int) this.readLong(4);
    }

    private int readInt(final int size) {
        return (int) this.readLong(size);
    }

    private int readInt(final int offset, final int size) {
        return (int) this.readLong(offset, size);
    }

    private boolean readBoolean() {
        return this.readLong(1) != 0;
    }

    private boolean readBoolean(final int size) {
        return this.readLong(size) != 0;
    }

    private boolean readBoolean(final int offset, final int size) {
        return this.readLong(offset, size) != 0;
    }


/*
    public CommandData addByte(byte value) {
        return this.addBytes(value);
    }

    public CommandData addByte(boolean value) {
        return this.addBytes(value ? (byte) 0x01 : (byte) 0x00);
    }

    public CommandData addByte(final Utils.FieldWithValue value) {
        return this.addBytes(value.toBytes());
    }

    public CommandData addS16(short value) {
        final byte b1 = (byte) ((value & 0xFF00) >> 8);
        final byte b2 = (byte) (value & 0x00FF);
        return this.addBytes(b1, b2);
    }






    public CommandData addDataXX(short[] values) {
        for (short value : values) {
            this.addData(new byte[]{(byte) ((value & 0xFF00) >> 8), (byte) (value & 0x00FF)});
        }
        return this;
    }

    public CommandData addDataAAA(char[] values) {
        for (char value : values) {
            this.addData(new byte[]{(byte) ((value & 0xFF00) >> 8), (byte) (value & 0x00FF)});
        }
        return this;
    }

    public CommandData addDataJHU(short value) {
        return this.addData(new short[]{value});
    }

    public CommandData addDataJHGUG(char value) {
        return this.addData(new char[]{value});
    }

    public CommandData addDataJHIGIF(String value) {
        return this.addData(value.getBytes(StandardCharsets.US_ASCII));
    }

    public CommandData addDataJHVFYUF(String value, boolean nulTerminated) {
        if (nulTerminated == true) {
            return this.addData(value.getBytes(StandardCharsets.US_ASCII)).addData((byte) 0x00);
        }
        return this.addData(value.getBytes(StandardCharsets.US_ASCII));
    }

    public void addDataHVHJ(String value, int size, boolean nulTerminated) {
        byte[] buffer = new byte[size];
        byte[] strBuffer = value.getBytes(StandardCharsets.US_ASCII);
        System.arraycopy(strBuffer, 0, buffer, 0, Math.min(buffer.length, strBuffer.length));
        if (nulTerminated == true) {
            buffer[buffer.length - 1] = (byte) 0x00;
        }
        this.addData(buffer);
    }

    public CommandData addDataJHJ(int value) {
        byte b0 = (byte) ((value & 0xFF000000) >> 24);
        byte b1 = (byte) ((value & 0x00FF0000) >> 16);
        byte b2 = (byte) ((value & 0x0000FF00) >> 8);
        byte b3 = (byte) (value & 0x000000FF);
        return this.addData(new byte[]{b0, b1, b2, b3});
    }
*/
}
