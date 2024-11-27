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

import com.activelook.activelooksdk.core.Payload;

public final class Configuration {

    private final int id;
    private final long version;
    private final int nbImg;
    private final int nbLayout;
    private final int nbFont;

    public Configuration(byte[] bytes) {
        final PayloadDecoder rp = new PayloadDecoder(bytes);
        this.id = rp.readUInt(1);
        this.version = rp.readLong(4);
        this.nbImg = rp.readUInt(1);
        this.nbLayout = rp.readUInt(1);
        this.nbFont = rp.readUInt(1);
    }

    public int getId() {
        return this.id;
    }

    public long getVersion() {
        return this.version;
    }

    public int getNbImg() {
        return this.nbImg;
    }

    public int getNbLayout() {
        return this.nbLayout;
    }

    public int getNbFont() {
        return this.nbFont;
    }

    public byte[] toBytes() {
        return new Payload()
                .addData((byte) this.id)
                .addData((int) this.version)
                .addData(new byte[]{0x00, 0x00, 0x00})
                .getData();
    }

}
