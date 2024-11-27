/*
 * Copyright (c) 2022 Microoled.
 * Licensed under the Apache License, Version 2.0 (the “License”);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an “AS IS” BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.activelook.internal;

import com.activelook.activelooksdk.SerializedGlasses;

import java.io.Serializable;

public class SimpleSerializedGlasses implements SerializedGlasses, Serializable {

    private final String address;
    private final String manufacturer;
    private final String name;

    public SimpleSerializedGlasses(final String address, final String manufacturer, final String name) {
        this.address = address;
        this.manufacturer = manufacturer;
        this.name = name;
    }

    @Override
    public String getAddress() {
        return this.address;
    }

    @Override
    public String getManufacturer() {
        return this.manufacturer;
    }

    @Override
    public String getName() {
        return this.name;
    }

}
