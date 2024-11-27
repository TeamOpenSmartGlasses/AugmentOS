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

public class ConfigurationElementsInfo {

    private final long version;
    private final int nbImg;
    private final int nbLayout;
    private final int nbFont;
    private final int nbPage;
    private final int nbGauge;

    public ConfigurationElementsInfo(final long version, final int nbImg,
                                     final int nbLayout, final int nbFont,
                                     final int nbPage, final int nbGauge) {
        this.version = version;
        this.nbImg = nbImg;
        this.nbLayout = nbLayout;
        this.nbFont = nbFont;
        this.nbPage = nbPage;
        this.nbGauge = nbGauge;
    }

    public ConfigurationElementsInfo(byte[] bytes) {
        final PayloadDecoder rp = new PayloadDecoder(bytes);
        this.version = rp.readLong(4);
        this.nbImg = rp.readUInt(1);
        this.nbLayout = rp.readUInt(1);
        this.nbFont = rp.readUInt(1);
        this.nbPage = rp.readUInt(1);
        this.nbGauge = rp.readUInt(1);
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

    public int getNbPage() {
        return this.nbPage;
    }

    public int getNbGauge() {
        return this.nbGauge;
    }

    @Override
    public String toString() {
        return "ConfigurationElementsInfo{" +
                "version=" + version +
                ", nbImg=" + nbImg +
                ", nbLayout=" + nbLayout +
                ", nbFont=" + nbFont +
                ", nbPage=" + nbPage +
                ", nbGauge=" + nbGauge +
                '}';
    }

}
