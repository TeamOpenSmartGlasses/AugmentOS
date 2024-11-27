/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.gcloudspeech;

import androidx.annotation.GuardedBy;

import com.google.audio.asr.CloudSpeechSessionParams;
import com.google.common.flogger.FluentLogger;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.asr.SpeechSession;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.asr.SpeechSessionFactory;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.asr.SpeechSessionListener;

import org.joda.time.Duration;

import java.util.concurrent.TimeUnit;

import io.grpc.ConnectivityState;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;

/** A factory for creating cloud sessions. */
public class CloudSpeechSessionFactory implements SpeechSessionFactory {
  private static final FluentLogger logger = FluentLogger.forEnclosingClass();
  private static final String SERVICE_URL = "speech.googleapis.com";
  private static final String HEADER_API_KEY = "X-Goog-Api-Key";

  /** Wait 1 second for the preexisting calls to finish. */
  private static final Duration TERMINATE_CHANNEL_DURATION = Duration.standardSeconds(1);

  /** Lock for handling concurrent accesses to the `params` variable. */
  private final Object paramsLock = new Object();

  @GuardedBy("paramsLock")
  private CloudSpeechSessionParams params;
  private String apiKey;

  private ManagedChannel channel;

  public CloudSpeechSessionFactory(CloudSpeechSessionParams params, String apiKey) {
    this.params = params;
    this.apiKey = apiKey;
  }

  @Override
  public SpeechSession create(SpeechSessionListener listener, int sampleRateHz) {
    if (this.channel == null) {
      this.channel = createManagedChannel(apiKey);
    } else {
      ensureManagedChannelConnection();
    }
    synchronized (paramsLock) {
      return new CloudSpeechSession(params, listener, sampleRateHz, channel);
    }
  }

  @Override
  public void cleanup() {
    if (channel != null) {
      channel.shutdown();
      try {
        if (!channel.awaitTermination(
            TERMINATE_CHANNEL_DURATION.getStandardSeconds(), TimeUnit.SECONDS)) {
          channel.shutdownNow();
        }
      } catch (InterruptedException e) {
        logger.atWarning().withCause(e).log("Channel termination failed.");
      }
      channel = null;
    }
  }

  public void setParams(CloudSpeechSessionParams params) {
    synchronized (paramsLock) {
      this.params = params;
    }
  }

  protected void ensureManagedChannelConnection() {
    // The channel may stuck at the TRANSIENT_FAILURE state, if so, enter idle to let channel to
    // trigger creation of a new connection.
    if (ConnectivityState.TRANSIENT_FAILURE.equals(channel.getState(false))) {
      logger.atInfo().log("ManagedChannel was in TRANSIENT_FAILURE state.");
      channel.enterIdle();
    }
  }

  private ManagedChannel createManagedChannel(String apiKey) {
    Metadata metadata = new Metadata();
    metadata.put(Metadata.Key.of(HEADER_API_KEY, Metadata.ASCII_STRING_MARSHALLER), apiKey);
    return ManagedChannelBuilder.forTarget(SERVICE_URL)
        .intercept(MetadataUtils.newAttachHeadersInterceptor(metadata))
        .build();
  }
}
