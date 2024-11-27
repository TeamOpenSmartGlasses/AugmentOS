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

public class Image1bppData {

    private final int width;
    private final byte[][] bytes;
    private int size;

    public Image1bppData() {
        this.width = 0;
        this.bytes = new byte[][]{};
        this.size = 0;
    }

    public Image1bppData(int width, byte[][] bytes) {
        this.width = width;
        this.bytes = bytes;
        this.size = bytes.length * bytes[0].length;
    }

    public int getWidth() {
        return this.width;
    }

    public byte[][] getBytes() {
        return this.bytes;
    }

    public int getSize() {
        return this.size;
    }

    public void setSize(int size){this.size = size;}

}

