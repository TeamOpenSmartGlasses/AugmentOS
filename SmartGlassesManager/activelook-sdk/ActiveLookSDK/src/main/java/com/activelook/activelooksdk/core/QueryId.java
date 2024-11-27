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
package com.activelook.activelooksdk.core;

import java.util.Arrays;

public class QueryId {

    private final byte[] values;

    public QueryId(byte[] values) {
        this.values = values;
    }

    public QueryId(byte value) {
        this.values = new byte[]{ value };
    }

    public QueryId() {
        this(new byte [] { 1 });
    }

    byte[] toBytes() {
        return this.values;
    }

    public QueryId next() {
        byte [] nextId = new byte [this.values.length];
        System.arraycopy(this.values, 0, nextId, 0, this.values.length);
        int id = 0;
        while (id < nextId.length && nextId[id] == (byte) 0xFF) {
            id ++;
        }
        if (id < nextId.length) {
            nextId[id] ++;
        } else {
            nextId = new byte [this.values.length + 1];
            if (nextId.length > 15) {
                return new QueryId();
            } else {
                for (id=0; id<nextId.length; id++) {
                    nextId[id] = (byte) 0x00;
                }
                nextId[nextId.length - 1] ++;
            }
        }
        return new QueryId(nextId);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        QueryId queryId = (QueryId) o;
        return Arrays.equals(values, queryId.values);
    }

    @Override
    public int hashCode() {
        return Arrays.hashCode(values);
    }

    @Override
    public String toString() {
        return "QueryId{" +
                "values=" + Arrays.toString(values) +
                '}';
    }

}
