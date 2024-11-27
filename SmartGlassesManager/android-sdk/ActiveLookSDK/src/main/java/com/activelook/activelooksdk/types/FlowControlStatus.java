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

public enum FlowControlStatus {
    /**
     * 0x03 message error, the command was incomplete or corrupt, the command is ignored
     */
    CMD_ERROR,
    /**
     * 0x04 Receive message queue overflow
     */
    OVERFLOW,
    /**
     * 0x05 Reserved
     */
    RESERVED,
    /**
     * 0x06 Missing the WConfigID command before configuration modification
     */
    MISSING_CONFIG_ID,
}
