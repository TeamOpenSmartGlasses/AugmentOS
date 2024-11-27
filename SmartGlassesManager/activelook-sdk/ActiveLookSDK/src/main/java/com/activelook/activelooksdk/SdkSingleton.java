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
package com.activelook.activelooksdk;

import android.content.Context;
import android.util.Pair;

import androidx.core.util.Consumer;
import androidx.core.util.Predicate;

import com.activelook.activelooksdk.core.ble.BleSdkSingleton;
import com.activelook.activelooksdk.core.debug.DebugSdkSingleton;
import com.activelook.activelooksdk.types.GlassesUpdate;

final class SdkSingleton {

    private static Sdk singleton;

    static final synchronized Sdk init(Context applicationContext,
                                       String token,
                                       Consumer<GlassesUpdate> onUpdateStart,
                                       Consumer<Pair<GlassesUpdate, Runnable>> onUpdateAvailableCallback,
                                       Consumer<GlassesUpdate> onUpdateProgress,
                                       Consumer<GlassesUpdate> onUpdateSuccess,
                                       Consumer<GlassesUpdate> onUpdateError) {
        if (SdkSingleton.singleton == null) {
            try {
                SdkSingleton.singleton = BleSdkSingleton.init(applicationContext, token, onUpdateStart,
                        onUpdateAvailableCallback, onUpdateProgress, onUpdateSuccess, onUpdateError);
            } catch (UnsupportedOperationException e) {
                if (BuildConfig.DEBUG) {
                    SdkSingleton.singleton = DebugSdkSingleton.getInstance();
                } else {
                    throw e;
                }
            }
        }
        return SdkSingleton.singleton;
    }

    static final synchronized Sdk getInstance() {
        return SdkSingleton.singleton;
    }

}
