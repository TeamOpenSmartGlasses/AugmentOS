package com.activelook.activelooksdk.types;

import org.junit.Test;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;

import com.activelook.activelooksdk.core.Payload;
import com.activelook.activelooksdk.core.PayloadDecoder2;

import java.util.List;

public class TypesTest {

    @Test
    public void checkByteManipulation() {
        final PayloadDecoder rp = new PayloadDecoder(new byte [] {
                (byte) 0x00, (byte) 0xFF,
                (byte) 0x80, (byte) 0x00
        });
        assertEquals(255, rp.readShort(0, 2));
        assertEquals(255, rp.readUInt(0, 2));
        assertEquals(256 * 128, rp.readUInt(2, 2));
        assertEquals(-256 * 128, rp.readShort(2, 2));
    }

    @Test
    public void payload_ConfigurationDescription_isCorrect() {
        final byte [] payload = new byte [] {
                (byte) 0x00, (byte) 0x02, (byte) 0x08, (byte) 0xD7,
                (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0xFF,
                (byte) 0xF0, (byte) 0x0F, (byte) 0x00
        };
        final ConfigurationDescription cfg = new ConfigurationDescription("Test", payload);
        assertEquals("Test", cfg.getName());
        assertEquals(133335, cfg.getSize());
        assertEquals(255, cfg.getVersion());
        assertEquals(240, cfg.getUsageCount());
        assertEquals(15, cfg.getInstallCount());
        assertEquals(false, cfg.getIsSystem());
    }

    @Test
    public void payload_Configuration_isCorrect() {
        final byte [] payload = new byte [] {
                (byte) 0xF0,
                (byte) 0x00, (byte) 0x02, (byte) 0x08, (byte) 0xD7,
                (byte) 0xF0, (byte) 0x0F, (byte) 0x07
        };
        final Configuration cfg = new Configuration(payload);
        assertEquals(240, cfg.getId());
        assertEquals(133335, cfg.getVersion());
        assertEquals(240, cfg.getNbImg());
        assertEquals(15, cfg.getNbLayout());
        assertEquals(7, cfg.getNbFont());
    }

    @Test
    public void payload_ConfigurationElementsInfo_isCorrect() {
        final byte [] payload = new byte [] {
                (byte) 0x00, (byte) 0x02, (byte) 0x08, (byte) 0xD7,
                (byte) 0xF0, (byte) 0x0F, (byte) 0x07, (byte) 0x09, (byte) 0x0C
        };
        final ConfigurationElementsInfo cfg = new ConfigurationElementsInfo(payload);
        assertEquals(133335, cfg.getVersion());
        assertEquals(240, cfg.getNbImg());
        assertEquals(15, cfg.getNbLayout());
        assertEquals(7, cfg.getNbFont());
        assertEquals(9, cfg.getNbPage());
        assertEquals(12, cfg.getNbGauge());
    }

    private static final void cmp_chunks(final byte [] payload, final byte[][] chunks, final int chunkSize) {
        final int expectedNbChunk = (payload.length + chunkSize - 1) / chunkSize;
        assertEquals(expectedNbChunk, chunks.length);
        int i = 0;
        while (i < chunks.length) {
            if (i == expectedNbChunk - 1) {
                final int lastChunkSize = payload.length - (expectedNbChunk - 1) * chunkSize;
                assertEquals(lastChunkSize, chunks[i].length);
            } else {
                assertEquals(chunkSize, chunks[i].length);
            }
            int j = 0;
            while (j < chunks[i].length) {
                assertEquals(payload[i * chunkSize + j], chunks[i][j]);
                j++;
            }
            i++;
        }
    }

    @Test
    public void payload_FontData1_isCorrect() {
        final byte [] payload = new byte [1000];
        payload[0] = (byte) 0x02;
        payload[1] = (byte) 0x0A;
        for (int i=2; i<1000; i++) {
            payload[i] = (byte) (i & 0xFF);
        }
        final FontData font = new FontData(payload);
        assertEquals(payload.length, font.getFontSize());
        for (int chunkSize = 83; chunkSize < 111; chunkSize ++) {
            cmp_chunks(payload, font.getChunks(chunkSize), chunkSize);
        }
    }

    @Test
    public void payload_FontData2_isCorrect() {
        final byte [] payload = new byte [1000];
        payload[0] = (byte) 0x01;
        payload[1] = (byte) 0x0B;
        for (int i=2; i<1000; i++) {
            payload[i] = (byte) (i & 0xFF);
        }
        final byte [] subPayload = new byte [998];
        System.arraycopy(payload, 2, subPayload, 0, subPayload.length);
        final FontData font = new FontData(payload[1], subPayload);
        assertEquals(payload.length, font.getFontSize());
        for (int chunkSize = 83; chunkSize < 111; chunkSize ++) {
            cmp_chunks(payload, font.getChunks(chunkSize), chunkSize);
        }
    }

    @Test
    public void payload_FontInfo_isCorrect() {
        final byte [] payload = new byte [] {
                (byte) 0x00, (byte) 0x0A,
                (byte) 0x01, (byte) 0x01,
                (byte) 0x02, (byte) 0xFF,
                (byte) 0x03, (byte) 0xF0,
        };
        final List<FontInfo> fis = FontInfo.toList(payload);
        for (FontInfo fi : fis) {
            switch (fi.getId()) {
                case 0: assertEquals(10, fi.getHeight()); break;
                case 1: assertEquals(1, fi.getHeight()); break;
                case 2: assertEquals(255, fi.getHeight()); break;
                case 3: assertEquals(240, fi.getHeight()); break;
                default: fail();
            }
        }
    }

    @Test
    public void payload_FreeSpace_isCorrect() {
        final byte [] payload = new byte [] {
                (byte) 0x00, (byte) 0x02, (byte) 0x08, (byte) 0xD7,
                (byte) 0x00, (byte) 0x00, (byte) 0xDF, (byte) 0x4F,
        };
        final FreeSpace fs = new FreeSpace(payload);
        assertEquals(133335, fs.getTotalSize());
        assertEquals(57167, fs.getFreeSpace());
    }

    @Test
    public void payload_GaugeInfo1_isCorrect() {
        final byte [] payload = new byte [] {
                (byte) 0x00, (byte) 0xFF, (byte) 0xFF, (byte) 0xF6,
                (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0x00,
                (byte) 0x00, (byte) 0xFF, (byte) 0x01,
        };
        final GaugeInfo gi = new GaugeInfo(payload);
        assertEquals(255, gi.getX());
        assertEquals(-10, gi.getY());
        assertEquals(65535, gi.getR());
        assertEquals(65280, gi.getRin());
        assertEquals(0, gi.getStart());
        assertEquals(255, gi.getEnd());
        assertEquals(true, gi.isClockwise());
        final Payload cmd = new Payload()
                .addData(gi.getX()).addData(gi.getY())
                .addData((char) gi.getR()).addData((char) gi.getRin())
                .addData((byte) gi.getStart()).addData((byte) gi.getEnd())
                // .addData(gi.isClockwise())
        ;
        assertArrayEquals(payload, cmd.getData());
    }

    @Test
    public void payload_GaugeInfo2_isCorrect() {
        final byte [] payload = new byte [] {
                (byte) 0x00, (byte) 0xFF, (byte) 0xFF, (byte) 0xF6,
                (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0x00,
                (byte) 0x00, (byte) 0xFF, (byte) 0x01,
        };
        final GaugeInfo gi = new GaugeInfo((short) 255, (short) -10, 65535, 65280, (short) 0, (short) 255, true);
        assertEquals(255, gi.getX());
        assertEquals(-10, gi.getY());
        assertEquals(65535, gi.getR());
        assertEquals(65280, gi.getRin());
        assertEquals(0, gi.getStart());
        assertEquals(255, gi.getEnd());
        assertEquals(true, gi.isClockwise());
        final Payload cmd = new Payload()
                .addData(gi.getX()).addData(gi.getY())
                .addData((char) gi.getR()).addData((char) gi.getRin())
                .addData((byte) gi.getStart()).addData((byte) gi.getEnd())
                // .addData(gi.isClockwise())
                ;
        assertArrayEquals(payload, cmd.getData());
    }

    @Test
    public void payload_GlassesSettings_isCorrect() {
        final byte [] payload = new byte [] {
                (byte) 0x80, (byte) 0x7F, (byte) 0xFF, (byte) 0x00, (byte) 0x01,
        };
        final GlassesSettings gs = PayloadDecoder2.decodeGlassesSettings(payload);
        assertEquals(-128, gs.getGlobalXShift());
        assertEquals(127, gs.getGlobalYShift());
        assertEquals(255, gs.getLuma());
        assertEquals(false, gs.isAlsEnable());
        assertEquals(true, gs.isGestureEnable());
    }

    @Test
    public void payload_Version_isCorrect() {
        final byte [] payload = new byte [] {
                (byte) 0x03, (byte) 0x05, (byte) 0x00, (byte) 0x62,
                (byte) 0x80, (byte) 0x81,
                (byte) 0xFF, (byte) 0x00, (byte) 0x01,
        };
        final GlassesVersion gv = PayloadDecoder2.decodeGlassesVersion(payload);
        assertEquals(3, gv.getMajor());
        assertEquals(5, gv.getMinor());
        assertEquals(0, gv.getPatch());
        assertEquals('b', gv.getExtra());
        assertEquals(128, gv.getYear());
        assertEquals(129, gv.getWeek());
        assertEquals(16711681, gv.getSerial());
        assertEquals("3.5.0.b", gv.getVersion());
    }

}
