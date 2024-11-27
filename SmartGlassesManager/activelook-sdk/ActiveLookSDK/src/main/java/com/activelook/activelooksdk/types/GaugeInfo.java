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

public class GaugeInfo {

    private final short x;
    private final short y;
    private final int r;
    private final int rin;
    private final short start;
    private final short end;
    private final boolean clockwise;

    public GaugeInfo(byte [] bytes) {
        final PayloadDecoder rp = new PayloadDecoder(bytes);
        this.x = rp.readShort();
        this.y = rp.readShort();
        this.r = rp.readUInt(2);
        this.rin = rp.readUInt(2);
        this.start = rp.readShort(1);
        this.end = rp.readShort(1);
        this.clockwise = rp.readBoolean();
    }

    public GaugeInfo(short x, short y, int r, int rin, short start, short end, boolean clockwise) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.rin = rin;
        this.start = start;
        this.end = end;
        this.clockwise = clockwise;
    }

    public short getX() {
        return this.x;
    }

    public short getY() {
        return this.y;
    }

    public int getR() {
        return this.r;
    }

    public int getRin() {
        return this.rin;
    }

    public short getStart() {
        return this.start;
    }

    public short getEnd() {
        return this.end;
    }

    public boolean isClockwise() {
        return this.clockwise;
    }

    @Override
    public String toString() {
        return "GaugeInfo{" +
                "x=" + x +
                ", y=" + y +
                ", r=" + (short) r +
                ", rin=" + (short) rin +
                ", start=" + start +
                ", end=" + end +
                ", clockwise=" + clockwise +
                '}';
    }

}
