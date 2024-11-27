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

import java.util.ArrayList;
import java.util.List;

public class ImageInfo {

    private final byte id;
    private final int width;
    private final int height;

    public ImageInfo(byte id, int width, int height) {
        this.id = id;
        this.width = width;
        this.height = height;
    }

    public static final List<ImageInfo> toList(byte[] bytes) {
        final ArrayList<ImageInfo> result = new ArrayList<>();
        byte id = 0x00;
        int offset = 0;
        while (offset < bytes.length) {
            int width = (bytes[offset] << 8) + (bytes[offset + 1]);
            int height = (bytes[offset + 2] << 8) + (bytes[offset + 3]);
            result.add(new ImageInfo(id, width, height));
            offset += 4;
            id++;
        }
        return result;
    }

    public int getId() {
        return this.id;
    }

    public int getWidth() {
        return this.width;
    }

    public int getHeight() {
        return this.height;
    }

    @Override
    public String toString() {
        return "ImageInfo{" +
                "id=" + this.id +
                ", width=" + this.width +
                ", height=" + this.height +
                '}';
    }

}
