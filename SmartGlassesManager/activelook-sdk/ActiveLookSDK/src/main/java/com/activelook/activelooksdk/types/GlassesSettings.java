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

public class GlassesSettings {

    private final short globalXShift;
    private final short globalYShift;
    private final short luma;
    private final boolean alsEnable;
    private final boolean gestureEnable;

    public GlassesSettings(final byte globalXShift, final byte globalYShift, final short luma, final boolean alsEnable,
                           final boolean gestureEnable) {
        this.globalXShift = globalXShift;
        this.globalYShift = globalYShift;
        this.luma = luma;
        this.alsEnable = alsEnable;
        this.gestureEnable = gestureEnable;
    }

    public short getGlobalXShift() {
        return this.globalXShift;
    }

    public short getGlobalYShift() {
        return this.globalYShift;
    }

    public short getLuma() {
        return this.luma;
    }

    public boolean isAlsEnable() {
        return this.alsEnable;
    }

    public boolean isGestureEnable() {
        return this.gestureEnable;
    }

    @Override
    public String toString() {
        return "GlassesSettings " +
                "{ globalXShift=" + this.globalXShift +
                ", globalYShift=" + this.globalYShift +
                ", luma=" + this.luma +
                ", alsEnable=" + this.alsEnable +
                ", gestureEnable=" + this.gestureEnable +
                " }";
    }

}
