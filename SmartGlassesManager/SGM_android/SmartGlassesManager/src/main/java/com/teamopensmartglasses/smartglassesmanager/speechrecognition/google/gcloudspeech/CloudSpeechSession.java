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

// The CloudSpeechSession streams audio to the server until the endpointer tells it to stop. It
// therefore must be repeatedly reopened for continuous transcription. The response observer gets
// data back from the server. Our CloudSpeechStreamObserver extracts the speech and the confidence
// and passes the data to a SpeechSessionListener, which helps to aggregate
// TranscriptionResults and manage the repeatedly reopening sessions.

package com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.gcloudspeech;

import com.google.audio.asr.CloudSpeechSessionParams;
import com.google.audio.asr.SpeechRecognitionModelOptions;
import com.google.cloud.speech.v1p1beta1.RecognitionConfig;
import com.google.cloud.speech.v1p1beta1.SpeechContext;
import com.google.cloud.speech.v1p1beta1.SpeechGrpc;
import com.google.cloud.speech.v1p1beta1.StreamingRecognitionConfig;
import com.google.cloud.speech.v1p1beta1.StreamingRecognizeRequest;
import com.google.common.flogger.FluentLogger;
import com.google.protobuf.ByteString;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.asr.SpeechSession;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.asr.SpeechSessionListener;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.asr.asrhelpers.StreamingAudioEncoder;

import org.joda.time.Duration;

import java.io.IOException;
import java.util.ArrayList;

import io.grpc.ManagedChannel;
import io.grpc.stub.StreamObserver;

/**
 * Lightweight wrapper around the GRPC Google Cloud Speech API. It can handle one streaming
 * recognition request at a time.
 */
public class CloudSpeechSession extends SpeechSession {
  private static final FluentLogger logger = FluentLogger.forEnclosingClass();
  private SpeechGrpc.SpeechStub speechClient;

  // Since the speech session times out after 5 minutes, we should try to avoid sessions reaching
  // approximately that length. If speech begins 4 mins and 30 seconds into the transcription, it
  // will likely be cut off. Therefore, we close sessions that haven't received any results in an
  // extended period of time.
  public static final Duration CLOSE_SESSION_AFTER_EXTENDED_SILENCE_DURATION =
      Duration.standardMinutes(4).plus(Duration.standardSeconds(30));

  /**
   * The stream observer and cloud interaction functions are marked protected so that they may be
   * replaced with a local server simulation in testing.
   */
  private CloudSpeechStreamObserver responseObserver;

  private StreamObserver<StreamingRecognizeRequest> requestObserver;

  private final CloudSpeechSessionParams params;
  private final SpeechSessionListener speechSessionListener;
  private int sampleRateHz;

  private boolean stillSendingRequests = false;
  private final ManagedChannel channel;

  private StreamingAudioEncoder encoder;
  private boolean encoderIsRequested;
  private boolean encoderIsSupported;

  /*
   * @param speechSessionListener Listener for recognition responses.
   * @param sampleRateHz Sample rate of microphone data.
   * @param channel The channel to use for cloud communication.
   */
  public CloudSpeechSession(
      CloudSpeechSessionParams params,
      SpeechSessionListener speechSessionListener,
      int sampleRateHz,
      ManagedChannel channel) {
    this.params = params;
    this.channel = channel;
    this.speechSessionListener = speechSessionListener;
    this.sampleRateHz = sampleRateHz;
    this.encoder = new StreamingAudioEncoder();
  }

  /** Starts a streaming speech recognition request. */
  @Override
  public synchronized void initImpl(
          SpeechRecognitionModelOptions modelOptions, int chunkSizeSamples) {
    if (chunkSizeSamples < 0.050 * sampleRateHz) {
      logger.atWarning().log(
          "Your buffer size is less than 50ms, you may have poor performance getting "
              + "streaming results.");
    }
    responseObserver = makeResponseObserver(speechSessionListener);
    encoderIsRequested = params.getEncoderParams().getEnableEncoder();
    encoderIsSupported =
        StreamingAudioEncoder.isEncoderSupported(params.getEncoderParams().getCodec());
    if (usingEncoder()) {
      try {
        encoder.init(
            sampleRateHz,
            params.getEncoderParams().getCodec(),
            params.getEncoderParams().getAllowVbr());
      } catch (StreamingAudioEncoder.EncoderException | IOException e) {
        e.printStackTrace();
        logger.atSevere().log("Encoder could not be created. Using uncompressed audio.");
        encoderIsRequested = false;
      }
    }
    initServer(modelOptions);

    stillSendingRequests = true;
  }

  /** Returns true when the encoder is being used. */
  public boolean usingEncoder() {
    return encoderIsRequested && encoderIsSupported;
  }

  private CloudSpeechStreamObserver makeResponseObserver(
      SpeechSessionListener speechSessionListener) {
    return new CloudSpeechStreamObserver(
        params.getObserverParams(), speechSessionListener, sessionID());
  }

  /**
   * Sends an audio buffer to the Cloud Speech Server.
   *
   * @param buffer 16 bit LinearPCM byte array.
   * @param offset first element of buffer to use.
   * @param count number of elements of buffer to use.
   * @return true if audio data was processed, false if session was already requested to close. You
   *     should wait for the recognition listener passed into the constructor to receive
   *     OK_TO_TERMINATE before destroying the session.
   */
  @Override
  public synchronized boolean processAudioBytesImpl(byte[] buffer, int offset, int count) {
    if (!isStillSendingRequests()) {
      return false;
    }

    if (usingEncoder()) {
      byte[] encoded = encoder.processAudioBytes(buffer, offset, count);
      if (encoded.length > 0) {
        streamToServer(encoded, 0, encoded.length);
      }
    } else {
      streamToServer(buffer, offset, count);
    }

    if (CLOSE_SESSION_AFTER_EXTENDED_SILENCE_DURATION.isShorterThan(
        responseObserver.timeSinceLastServerActivity())) {
      logger.atInfo().log(
          "Session #%d scheduled to be ended due to extended silence.", sessionID());
      requestCloseSession();
    }
    return true;
  }

  private boolean isStillSendingRequests() {
    return stillSendingRequests && responseObserver.isStillListening();
  }

  /**
   * Closes the current recognition request on the client end. This does not immediately end the
   * session. Only once the server acknowledges the closing of the session is communication
   * complete.
   */
  @Override
  public synchronized void requestCloseSessionImpl() {
    if (stillSendingRequests) {
      stillSendingRequests = false;
      if (usingEncoder()) {
        // Get any remaining output from the codec and stop.
        byte[] data = encoder.flushAndStop();
        streamToServer(data, 0, data.length);
      }
      closeServer();
    }
  }

  @Override
  public boolean requiresNetworkConnection() {
    return true;
  }

  private void initServer(SpeechRecognitionModelOptions modelOptions) {
    this.speechClient = SpeechGrpc.newStub(channel);
    requestObserver = speechClient.streamingRecognize(responseObserver);

    // Build and send a StreamingRecognizeRequest containing the parameters for
    // processing the audio.
    SpeechContext speechContext = SpeechContext.getDefaultInstance();

    RecognitionConfig.AudioEncoding encodingType = RecognitionConfig.AudioEncoding.LINEAR16;
    if (usingEncoder()) {
      switch (encoder.getCodecType()) {
        case AMRWB:
          encodingType = RecognitionConfig.AudioEncoding.AMR_WB;
          break;
        case FLAC:
          encodingType = RecognitionConfig.AudioEncoding.FLAC;
          break;
        case OGG_OPUS:
          encodingType = RecognitionConfig.AudioEncoding.OGG_OPUS;
          break;
        default:
      }
    }

    ArrayList<String> languageList = new ArrayList<>();
    languageList.add("en-US");

    RecognitionConfig.Builder configBuilder =
        RecognitionConfig.newBuilder()
            .setEncoding(encodingType)
            .setSampleRateHertz(sampleRateHz)
            .setAudioChannelCount(1)
            .setEnableAutomaticPunctuation(true)
            .setEnableWordConfidence(true)
            .setEnableWordTimeOffsets(true)
//            .addAllAlternativeLanguageCodes(languageList) //seems to be switching to english too much
            .addSpeechContexts(speechContext)
            .setLanguageCode(modelOptions.getLocale())
            .setProfanityFilter(params.getFilterProfanity())
            .addSpeechContexts(
                SpeechContext.newBuilder()
                    .addAllPhrases(modelOptions.getBiasWordsList()));

    StreamingRecognitionConfig.Builder strbuilder =
        StreamingRecognitionConfig.newBuilder()
            .setInterimResults(true)
            .setSingleUtterance(false);
    switch (modelOptions.getModel()) {
      case VIDEO:
        if (!modelOptions.getLocale().equals("en-US")) {
          logger.atSevere().log("Only en-US is supported by YouTube Livestream model");
        }
//        configBuilder.setModel("video");
        configBuilder.setModel("latest_long");
        break;
      case DICTATION_DEFAULT:
        configBuilder.setModel("default");
        break;
    }

    RecognitionConfig config = configBuilder.build();
    StreamingRecognitionConfig streamingConfig = strbuilder.setConfig(config).build();

    // First request sends the configuration.
    StreamingRecognizeRequest initial =
        StreamingRecognizeRequest.newBuilder().setStreamingConfig(streamingConfig).build();

    requestObserver.onNext(initial);
  }

  private void streamToServer(byte[] buffer, int offset, int count) {
    StreamingRecognizeRequest request =
        StreamingRecognizeRequest.newBuilder()
            .setAudioContent(ByteString.copyFrom(buffer, offset, count))
            .build();
    requestObserver.onNext(request);
  }

  private void closeServer() {
    if (requestObserver != null) {
      // Tell the server we're done sending.
      requestObserver.onCompleted();
      requestObserver = null;
    }
  }
}
