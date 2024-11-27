package com.activelook.activelooksdk.core.ble;

import androidx.core.util.Pair;

import java.util.ArrayList;
import java.util.List;

final class Firmware {

    private byte[] bytes;

    Firmware(final byte [] content) {
        super();
        this.bytes = new byte[content.length + 1];
        System.arraycopy(content, 0, this.bytes, 0, content.length);
        this.bytes[content.length] = 0;
        for (int i = 0; i < content.length; i++) {
            this.bytes[content.length] ^= this.bytes[i];
        }
    }

    List<Pair<Integer, List<byte []>>> getSuotaBlocks(int blockSize, int chunkSize) {
        assert chunkSize > 0;
        blockSize = Math.min(bytes.length, Math.max(blockSize, chunkSize));
        chunkSize = Math.min(blockSize, chunkSize);
        final List<Pair<Integer, List<byte []>>> blocks = new ArrayList<>();
        int blockOffset = 0;
        while (blockOffset < this.bytes.length) {
            final int currentBlockSize = Math.min(blockSize, this.bytes.length - blockOffset);
            final List<byte []> block = new ArrayList<>();
            int chunkOffset = 0;
            while (chunkOffset < currentBlockSize) {
                final int currentChunkSize = Math.min(chunkSize, currentBlockSize - chunkOffset);
                final byte [] chunk = new byte [currentChunkSize];
                System.arraycopy(this.bytes, blockOffset + chunkOffset, chunk, 0, currentChunkSize);
                block.add(chunk);
                chunkOffset += currentChunkSize;
            }
            blocks.add(new Pair<>(currentBlockSize, block));
            blockOffset += currentBlockSize;
        }
        return blocks;
    }

}
