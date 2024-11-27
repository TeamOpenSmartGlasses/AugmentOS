package com.activelook.activelooksdk;

import org.junit.Test;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import com.activelook.activelooksdk.core.CommandData;

public class ConverterUnitTest {

    @Test
    public void byteOperator() {
        assertTrue((byte) 0x80 < (byte) 0xFF); // -128 < -1
        assertTrue((byte) 0xFF < (byte) 0x00); // -1 < 0
        assertTrue((byte) 0x00 < (byte) 0x7F); // 0 < 127
        byte b = (byte) 0x80;
        assertTrue(++b == (byte) 0x81);
        b = (byte) 0xFF;
        assertTrue(++b == (byte) 0x00);
        b = (byte) 0x00;
        assertTrue(++b == (byte) 0x01);
        b = (byte) 0x7F;
        assertTrue(++b == (byte) 0x80);
    }

    @Test
    public void automaticCast() {
        assertEquals((byte) 0x80, CommandData.UInt8.asByte((byte) 0x80));
        assertEquals((byte) 0x80, CommandData.UInt8.asByte((short) 0x0080));
        assertEquals((byte) 0x80, CommandData.UInt8.asByte((int) 0x00000080));
        assertEquals((byte) 0x80, CommandData.UInt8.asByte((long) 0x0000000000000080l));
        assertEquals((byte) 0x80, CommandData.UInt8.asByte((byte) 0x80));
        assertEquals((byte) 0x80, CommandData.UInt8.asByte((short) 0xFF80));
        assertEquals((byte) 0x80, CommandData.UInt8.asByte((int) 0xFFFFFF80));
        assertEquals((byte) 0x80, CommandData.UInt8.asByte((long) 0xFFFFFFFFFFFFFF80l));
        assertArrayEquals(
                new byte [] { (byte) 0xFF, (byte) 0xFF },
                CommandData.UInt16.asBytes((short) 0xFFFF)
        );
    }

    @Test
    public void byteCast() {
        for (short v = Short.MIN_VALUE; v < Short.MAX_VALUE; v++) {
            assertTrue((byte) v == (byte) (v & 0xFF));
        }
        assertTrue((byte) Short.MAX_VALUE == (byte) (Short.MAX_VALUE & 0xFF));
    }

    @Test
    public void convertInt8() {
        byte b = (byte) 0x80;
        short i8 = -128;
        assertEquals(b, CommandData.Int8.asByte(i8));
        assertEquals(i8, CommandData.Int8.asShort(b));
        b = (byte) 0xFF;
        i8 = -1;
        assertEquals(b, CommandData.Int8.asByte(i8));
        assertEquals(i8, CommandData.Int8.asShort(b));
        b = (byte) 0x00;
        i8 = 0;
        assertEquals(b, CommandData.Int8.asByte(i8));
        assertEquals(i8, CommandData.Int8.asShort(b));
        b = (byte) 0x01;
        i8 = 1;
        assertEquals(b, CommandData.Int8.asByte(i8));
        assertEquals(i8, CommandData.Int8.asShort(b));
        b = (byte) 0x7F;
        i8 = 127;
        assertEquals(b, CommandData.Int8.asByte(i8));
        assertEquals(i8, CommandData.Int8.asShort(b));
    }

    @Test
    public void convertUInt8() {
        byte b = (byte) 0x00;
        short ui8 = 0;
        assertEquals(b, CommandData.UInt8.asByte(ui8));
        assertEquals(ui8, CommandData.UInt8.asShort(b));
        b = (byte) 0x01;
        ui8 = 1;
        assertEquals(b, CommandData.UInt8.asByte(ui8));
        assertEquals(ui8, CommandData.UInt8.asShort(b));
        b = (byte) 0x7F;
        ui8 = 127;
        assertEquals(b, CommandData.UInt8.asByte(ui8));
        assertEquals(ui8, CommandData.UInt8.asShort(b));
        b = (byte) 0x80;
        ui8 = 128;
        assertEquals(b, CommandData.UInt8.asByte(ui8));
        assertEquals(ui8, CommandData.UInt8.asShort(b));
        b = (byte) 0xFF;
        ui8 = 255;
        assertEquals(b, CommandData.UInt8.asByte(ui8));
        assertEquals(ui8, CommandData.UInt8.asShort(b));
    }

    @Test
    public void convertInt16() {
        byte [] bs = new byte [] {(byte) 0x80, (byte) 0x00};
        short i16 = -128 * 256;
        assertArrayEquals(bs, CommandData.Int16.asBytes(i16));
        assertEquals(i16, CommandData.Int16.asShort(bs));
        bs = new byte [] {(byte) 0xFF, (byte) 0xFF};
        i16 = -1;
        assertArrayEquals(bs, CommandData.Int16.asBytes(i16));
        assertEquals(i16, CommandData.Int16.asShort(bs));
        bs = new byte [] {(byte) 0x00, (byte) 0x00};
        i16 = 0;
        assertArrayEquals(bs, CommandData.Int16.asBytes(i16));
        assertEquals(i16, CommandData.Int16.asShort(bs));
        bs = new byte [] {(byte) 0x00, (byte) 0x01};
        i16 = 1;
        assertArrayEquals(bs, CommandData.Int16.asBytes(i16));
        assertEquals(i16, CommandData.Int16.asShort(bs));
        bs = new byte [] {(byte) 0x7F, (byte) 0xFF};
        i16 = 128 * 256 - 1;
        assertArrayEquals(bs, CommandData.Int16.asBytes(i16));
        assertEquals(i16, CommandData.Int16.asShort(bs));
    }

    @Test
    public void convertUInt16() {
        byte [] bs = new byte [] {(byte) 0x00, (byte) 0x00};
        int ui16 = 0;
        assertArrayEquals(bs, CommandData.UInt16.asBytes(ui16));
        assertEquals(ui16, CommandData.UInt16.asInt(bs));
        bs = new byte [] {(byte) 0x00, (byte) 0x01};
        ui16 = 1;
        assertArrayEquals(bs, CommandData.UInt16.asBytes(ui16));
        assertEquals(ui16, CommandData.UInt16.asInt(bs));
        bs = new byte [] {(byte) 0x7F, (byte) 0xFF};
        ui16 = 128 * 256 - 1;
        assertArrayEquals(bs, CommandData.UInt16.asBytes(ui16));
        assertEquals(ui16, CommandData.UInt16.asInt(bs));
        bs = new byte [] {(byte) 0x80, (byte) 0x00};
        ui16 = 128 * 256;
        assertArrayEquals(bs, CommandData.UInt16.asBytes(ui16));
        assertEquals(ui16, CommandData.UInt16.asInt(bs));
        bs = new byte [] {(byte) 0xFF, (byte) 0xFF};
        ui16 = 256 * 256 - 1;
        assertArrayEquals(bs, CommandData.UInt16.asBytes(ui16));
        assertEquals(ui16, CommandData.UInt16.asInt(bs));
    }

    @Test
    public void convertInt32() {
        byte [] bs = new byte [] {(byte) 0x80, (byte) 0x00, (byte) 0x00, (byte) 0x00};
        int i32 = -128 * 256 * 256 * 256;
        assertArrayEquals(bs, CommandData.Int32.asBytes(i32));
        assertEquals(i32, CommandData.Int32.asInt(bs));
        bs = new byte [] {(byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF};
        i32 = -1;
        assertArrayEquals(bs, CommandData.Int32.asBytes(i32));
        assertEquals(i32, CommandData.Int32.asInt(bs));
        bs = new byte [] {(byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00};
        i32 = 0;
        assertArrayEquals(bs, CommandData.Int32.asBytes(i32));
        assertEquals(i32, CommandData.Int32.asInt(bs));
        bs = new byte [] {(byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x01};
        i32 = 1;
        assertArrayEquals(bs, CommandData.Int32.asBytes(i32));
        assertEquals(i32, CommandData.Int32.asInt(bs));
        bs = new byte [] {(byte) 0x7F, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF};
        i32 = 128 * 256 * 256 * 256 - 1;
        assertArrayEquals(bs, CommandData.Int32.asBytes(i32));
        assertEquals(i32, CommandData.Int32.asInt(bs));
    }

    @Test
    public void convertUInt32() {
        byte [] bs = new byte [] {(byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00};
        long ui32 = 0l;
        assertArrayEquals(bs, CommandData.UInt32.asBytes(ui32));
        assertEquals(ui32, CommandData.UInt32.asLong(bs));
        bs = new byte [] {(byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x01};
        ui32 = 1l;
        assertArrayEquals(bs, CommandData.UInt32.asBytes(ui32));
        assertEquals(ui32, CommandData.UInt32.asLong(bs));
        bs = new byte [] {(byte) 0x7F, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF};
        ui32 = 128l * 256l * 256l * 256l - 1l;
        assertArrayEquals(bs, CommandData.UInt32.asBytes(ui32));
        assertEquals(ui32, CommandData.UInt32.asLong(bs));
        bs = new byte [] {(byte) 0x80, (byte) 0x00, (byte) 0x00, (byte) 0x00};
        ui32 = 128l * 256l * 256l * 256l;
        assertArrayEquals(bs, CommandData.UInt32.asBytes(ui32));
        assertEquals(ui32, CommandData.UInt32.asLong(bs));
        bs = new byte [] {(byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF};
        ui32 = 256l * 256l * 256l * 256l - 1l;
        assertArrayEquals(bs, CommandData.UInt32.asBytes(ui32));
        assertEquals(ui32, CommandData.UInt32.asLong(bs));
    }

}
