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

public enum Rotation implements Utils.FieldWithValue {
    BOTTOM_RL {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x00};
        }
    },
    BOTTOM_LR {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x01};
        }
    },
    LEFT_BT {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x02};
        }
    },
    LEFT_TB {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x03};
        }
    },
    TOP_LR {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x04};
        }
    },
    TOP_RL {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x05};
        }
    },
    RIGHT_TB {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x06};
        }
    },
    RIGHT_BT {
        @Override
        public byte[] toBytes() {
            return new byte[]{(byte) 0x07};
        }
    },
}
