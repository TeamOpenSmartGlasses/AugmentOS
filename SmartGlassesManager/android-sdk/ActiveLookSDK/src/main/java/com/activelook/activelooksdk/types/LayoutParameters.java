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
package com.activelook.activelooksdk.types;

import com.activelook.activelooksdk.core.CommandData;
import com.activelook.activelooksdk.core.Payload;

public class LayoutParameters {

    private final byte id;
    private final short x;
    private final byte y;
    private final short width;
    private final byte height;
    private final byte fg;
    private final byte bg;
    private final byte font;
    private final boolean textValid;
    private final short textX;
    private final byte textY;
    private final Rotation rotation;
    private final boolean textOpacity;
    private final CommandData subCommands;

    public LayoutParameters(byte id,
                            short x, byte y, short width, byte height,
                            byte fg, byte bg, byte font, boolean textValid,
                            short textX, byte textY, Rotation rotation, boolean textOpacity) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.fg = fg;
        this.bg = bg;
        this.font = font;
        this.textValid = textValid;
        this.textX = textX;
        this.textY = textY;
        this.rotation = rotation;
        this.textOpacity = textOpacity;
        this.subCommands = new CommandData();
    }

    @Deprecated
    public LayoutParameters(final byte[] bytes) {
        this((byte) 0, bytes);
    }

    public LayoutParameters(byte id, byte[] bytes) {
        this(
            id,
            (short) ((bytes[1] << 8) | bytes[2]),
            bytes[3],
            (short) ((bytes[4] << 8) | bytes[5]),
            bytes[6],
            bytes[7],
            bytes[8],
            bytes[9],
            bytes[10] != 0x00,
            (short) ((bytes[11] << 8) | bytes[12]),
            bytes[13],
            Utils.toRotation(bytes[14]),
            bytes[15] != 0x00
        );
        final int subSize = bytes[0];
        final byte [] subPayload = new byte [subSize];
        System.arraycopy(bytes, 15, subPayload, 0, subSize);
        this.subCommands.add(subPayload);
    }

    public LayoutParameters addSubCommandBitmap(byte id, short x, short y) {
        this.subCommands.add((byte) 0x00).addUInt8(id).addInt16(x).addInt16(y);
        return this;
    }

    public LayoutParameters addSubCommandCirc(short x, short y, short r) {
        this.subCommands.add((byte) 0x01).addInt16(x).addInt16(y).addUInt16(r);
        return this;
    }

    public LayoutParameters addSubCommandCircf(short x, short y, short r) {
        this.subCommands.add((byte) 0x02).addInt16(x).addInt16(y).addUInt16(r);
        return this;
    }

    public LayoutParameters addSubCommandColor(byte c) {
        this.subCommands.add((byte) 0x03).addUInt8(c);
        return this;
    }

    public LayoutParameters addSubCommandFont(byte f) {
        this.subCommands.add((byte) 0x04).addUInt8(f);
        return this;
    }

    public LayoutParameters addSubCommandLine(short x1, short y1, short x2, short y2) {
        this.subCommands.add((byte) 0x05).addInt16(x1).addInt16(y1).addInt16(x2).addInt16(y2);
        return this;
    }

    public LayoutParameters addSubCommandPoint(short x, short y) {
        this.subCommands.add((byte) 0x06).addInt16(x).addInt16(y);
        return this;
    }

    public LayoutParameters addSubCommandRect(short x1, short y1, short x2, short y2) {
        this.subCommands.add((byte) 0x07).addInt16(x1).addInt16(y1).addInt16(x2).addInt16(y2);
        return this;
    }

    public LayoutParameters addSubCommandRectf(short x1, short y1, short x2, short y2) {
        this.subCommands.add((byte) 0x08).addInt16(x1).addInt16(y1).addInt16(x2).addInt16(y2);
        return this;
    }

    public LayoutParameters addSubCommandText(short x, short y, String txt) {
        this.subCommands.add((byte) 0x09).addInt16(x).addInt16(y).addUInt8((short) txt.length()).addNulTerminatedStrings(txt);
        return this;
    }

    public LayoutParameters addSubCommandGauge(byte gaugeId) {
        this.subCommands.add((byte) 0x0A).addUInt8(gaugeId);
        return this;
    }

    public byte[] toBytes() {
        final byte[] subBytes = this.subCommands.getBytes();
        return new CommandData()
                .addUInt8(this.id)
                .addUInt8((byte) subBytes.length)
                .addUInt16(this.x)
                .addUInt8(this.y)
                .addUInt16(this.width)
                .addUInt8(this.height)
                .addUInt8(this.fg)
                .addUInt8(this.bg)
                .addUInt8(this.font)
                .add(CommandData.fromBoolean(this.textValid))
                .addUInt16(this.textX)
                .addUInt8(this.textY)
                .add(CommandData.fromRotation(this.rotation))
                .add(CommandData.fromBoolean(this.textOpacity))
                .add(subBytes).getBytes();
    }

    @Override
    public String toString() {
        return "LayoutParameters{" +
                "id=" + id +
                ", x=" + x +
                ", y=" + y +
                ", width=" + width +
                ", height=" + height +
                ", fg=" + fg +
                ", bg=" + bg +
                ", font=" + font +
                ", textValid=" + textValid +
                ", textX=" + textX +
                ", textY=" + textY +
                ", rotation=" + rotation +
                ", textOpacity=" + textOpacity +
                ", subCommands=" + subCommands.toHexString() +
                '}';
    }
}
