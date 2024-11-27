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

import java.util.Arrays;

public class SensorParameters {

    private short[] alsLuma;
    private short alsPeriod;
    private short gesturePeriod;

    public SensorParameters() {
        this(new short[9], (short) 0, (short) 0);
    }

    public SensorParameters(byte[] payload) {
        this.alsLuma = new short[9];
        for (int i = 0; i < 9; i++) {
            this.alsLuma[i] = (short) ((payload[i * 2] << 8) | payload[i * 2 + 1]);
        }
        this.alsPeriod = (short) ((payload[18] << 8) | payload[19]);
        this.gesturePeriod = (short) ((payload[20] << 8) | payload[21]);
    }

    public SensorParameters(short[] alsLuma, short alsPeriod, short gesturePeriod) {
        this.alsLuma = alsLuma;
        this.alsPeriod = alsPeriod;
        this.gesturePeriod = gesturePeriod;
    }

    public short[] getAlsLuma() {
        return this.alsLuma;
    }

    public void setAlsLuma(short[] alsLuma) {
        this.alsLuma = alsLuma;
    }

    public short getAlsPeriod() {
        if (this.alsPeriod < 250) {
            return (short) 250;
        }
        return this.alsPeriod;
    }

    public void setAlsPeriod(short alsPeriod) {
        this.alsPeriod = alsPeriod;
    }

    public short getGesturePeriod() {
        if (this.gesturePeriod < 250) {
            return (short) 250;
        }
        return this.gesturePeriod;
    }

    public void setGesturePeriod(short gesturePeriod) {
        this.gesturePeriod = gesturePeriod;
    }

    @Override
    public String toString() {
        return "SensorParameters{" +
                "alsLuma=" + Arrays.toString(this.alsLuma) +
                ", alsPeriod=" + this.alsPeriod +
                ", gesturePeriod=" + this.gesturePeriod +
                '}';
    }

}
