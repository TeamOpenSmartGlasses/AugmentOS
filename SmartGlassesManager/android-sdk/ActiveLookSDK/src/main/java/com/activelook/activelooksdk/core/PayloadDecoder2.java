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

import com.activelook.activelooksdk.types.GlassesSettings;
import com.activelook.activelooksdk.types.GlassesVersion;

public final class PayloadDecoder2 {

    public static final Integer decodeBatteryLevel(final byte[] bytes) {
        return bytes[0] & 0xFF;
    }

    public static final GlassesVersion decodeGlassesVersion(final byte [] bytes) {
        final PayloadDecoder2 dec = new PayloadDecoder2(bytes);
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

    public static final GlassesSettings decodeGlassesSettings(final byte [] bytes) {
        final PayloadDecoder2 dec = new PayloadDecoder2(bytes);
        return new GlassesSettings(
                dec.readByte(),
                dec.readByte(),
                dec.readShort(1),
                dec.readBoolean(),
                dec.readBoolean()
        );
    }

    /*
    HELPERS FOR DECODING RECEIVED PAYLOADS
     */
    private final byte [] bytes;
    private int offset;

    private PayloadDecoder2(final byte [] bytes) {
        this.bytes = bytes;
        this.offset = 0;
    }

    private boolean hasNext() {
        return this.offset < this.bytes.length;
    }

    private byte readByte() {
        return this.bytes[this.offset++];
    }

    private byte readByte(final int offset) {
        this.offset = offset;
        return this.readByte();
    }

    private long readLong() {
        return this.readLong(8);
    }

    private long readLong(final int size) {
        long result = 0l;
        final int end = size + this.offset;
        while (this.offset < end) {
            result <<= 8;
            result |= (this.bytes[this.offset++] & 0xFF);
        }
        return result;
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

}
