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

public final class FontInfo {

    private final int id;
    private final int height;

    public FontInfo(int id, int height) {
        this.id = id;
        this.height = height;
    }

    public int getId() {
        return this.id;
    }

    public int getHeight() {
        return this.height;
    }

    public static final List<FontInfo> toList(byte[] bytes) {
        final ArrayList<FontInfo> result = new ArrayList<>();
        final PayloadDecoder rp = new PayloadDecoder(bytes);
        while (rp.hasNext()) {
            result.add(new FontInfo(rp.readUInt(1), rp.readUInt(1)));
        }
        return result;
    }

    @Override
    public String toString() {
        return "FontInfo{" +
                "id=" + id +
                ", height=" + height +
                '}';
    }
}
