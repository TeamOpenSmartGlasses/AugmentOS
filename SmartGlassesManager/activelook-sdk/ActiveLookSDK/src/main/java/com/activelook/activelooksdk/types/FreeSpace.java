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

public final class FreeSpace {

    private final long totalSize;
    private final long freeSpace;

    public FreeSpace(final long totalSize, final long freeSpace) {
        this.totalSize = totalSize;
        this.freeSpace = freeSpace;
    }

    public FreeSpace(byte[] bytes) {
        final PayloadDecoder rp = new PayloadDecoder(bytes);
        this.totalSize = rp.readLong(4);
        this.freeSpace = rp.readLong(4);
    }

    public long getTotalSize() {
        return this.totalSize;
    }

    public long getFreeSpace() {
        return this.freeSpace;
    }

    @Override
    public String toString() {
        return "FreeSpace{" +
                "totalSize=" + totalSize +
                ", freeSpace=" + freeSpace +
                '}';
    }

}
