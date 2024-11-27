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

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class ConfigurationDescription {

    private final String name;
    private final long size;
    private final long version;
    private final int usageCnt;
    private final int installCnt;
    private final boolean isSystem;

    public ConfigurationDescription(final String name,
                                    final long size, final long version,
                                    final int usageCnt, final int installCnt, final boolean isSystem) {
        this.name = name;
        this.size = size;
        this.version = version;
        this.usageCnt = usageCnt;
        this.installCnt = installCnt;
        this.isSystem = isSystem;
    }

    public ConfigurationDescription(String name, byte[] bytes) {
        this.name = name;
        final PayloadDecoder rp = new PayloadDecoder(bytes);
        this.size = rp.readLong(4);
        this.version = rp.readLong(4);
        this.usageCnt = rp.readUInt(1);
        this.installCnt = rp.readUInt(1);
        this.isSystem = rp.readBoolean();
    }

    public String getName() {
        return this.name;
    }

    public long getSize() {
        return this.size;
    }

    public long getVersion() {
        return this.version;
    }

    public int getUsageCount() {
        return this.usageCnt;
    }

    public int getInstallCount() {
        return this.installCnt;
    }

    public boolean getIsSystem() {
        return this.isSystem;
    }

    public static final List<ConfigurationDescription> toList(byte[] bytes) {
        final ArrayList<ConfigurationDescription> result = new ArrayList<>();
        int offset = 0;
        while (offset < bytes.length) {
            int nameLength = 0;
            while (bytes[offset + nameLength] != 0) {
                nameLength ++;
            }
            final byte [] nameBuffer = new byte [nameLength];
            System.arraycopy(bytes, offset, nameBuffer, 0, nameLength);
            final String name = new String(nameBuffer, StandardCharsets.US_ASCII);
            offset += nameLength + 1;
            final byte [] elementBuffer = new byte [11];
            System.arraycopy(bytes, offset, elementBuffer, 0, 11);
            result.add(new ConfigurationDescription(name, elementBuffer));
            offset += 11;
        }
        return result;
    }

    @Override
    public String toString() {
        return "ConfigurationDescription{" +
                "name='" + name + '\'' +
                ", size=" + size +
                ", version=" + version +
                ", usageCnt=" + usageCnt +
                ", installCnt=" + installCnt +
                ", isSystem=" + isSystem +
                '}';
    }

}
