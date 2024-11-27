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

 public enum ImgStreamFormat implements Utils.FieldWithValue {
    MONO_1BPP {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x01};
        }
    },
    MONO_4BPP_HEATSHRINK {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x02};
        }
    },
}
