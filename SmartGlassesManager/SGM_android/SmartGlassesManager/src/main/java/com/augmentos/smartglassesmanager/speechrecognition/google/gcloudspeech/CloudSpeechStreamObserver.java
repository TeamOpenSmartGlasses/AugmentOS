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
package com.augmentos.smartglassesmanager.speechrecognition.google.gcloudspeech;

import com.google.audio.asr.CloudSpeechStreamObserverParams;
import com.google.audio.asr.TranscriptionResult;
import com.google.cloud.speech.v1p1beta1.SpeechRecognitionAlternative;
import com.google.cloud.speech.v1p1beta1.StreamingRecognitionResult;
import com.google.cloud.speech.v1p1beta1.StreamingRecognizeResponse;
import com.google.cloud.speech.v1p1beta1.StreamingRecognizeResponse.SpeechEventType;
import com.google.cloud.speech.v1p1beta1.WordInfo;
import com.google.common.base.Optional;
import com.google.common.flogger.FluentLogger;
import com.augmentos.smartglassesmanager.speechrecognition.google.asr.SpeechSessionListener;
import com.augmentos.smartglassesmanager.speechrecognition.google.asr.TimeUtil;

import org.joda.time.Duration;
import org.joda.time.Instant;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import io.grpc.stub.StreamObserver;

/**
 * Parses Cloud Speech API GRPC StreamingRecognizeResponse events into CloudSpeechSessionListener
 * events.
 * NOTE: that this object is stateful and needs to be re-instantiated for each streaming
 * request.
 *
 * Threading: All methods that implement the StreamObserver interface are to be called by gRPC. This
 * is the "results thread" as documented in the RepeatingRecognitionSession. The other public
 * functions are safe to call from another thread, they are called by CloudSpeechSession in the
 * current implementation.
 */
public class CloudSpeechStreamObserver implements StreamObserver<StreamingRecognizeResponse> {
  private static final FluentLogger logger = FluentLogger.forEnclosingClass();

  // The CloudSpeech API imposes a maximum streaming time of 5 minutes. In order to avoid hitting
  // this, but still be compatible with singleUtterance = false mode, which is required by some
  // models, we attempt to close the session after receiving a finalized result after being opened
  // for MIN_TIME_TO_KEEP_SESSION_OPEN.
  private static final Duration MIN_TIME_TO_KEEP_SESSION_OPEN =
      Duration.standardMinutes(4).plus(Duration.standardSeconds(30));

  private final SpeechSessionListener speechSessionListener;
  private final Instant sessionOkToRequestCloseTime;
  // Class for computing and returning the timestamps.
  private final TimestampCalculator timestampCalculator;

  // These variables are accessed through public functions from the recognition thread
  // (via CloudSpeechSession).
  private final AtomicBoolean stillListening = new AtomicBoolean(true);
  private final AtomicReference<Instant> lastActivityTimestamp = new AtomicReference<>();

  /**
   * Keeps track of time of arrival of first word. Optional.absent() means that the utterance has
   * not started yet.
   */
  private Optional<Instant> utteranceStartTime;

  // Note that only when the results are finalized are the confidences nonzero.
  private static final float K_CONFIDENCE_NOT_SET = 0.0f;

  private final CloudSpeechStreamObserverParams params;
  private final int sessionID;

  public CloudSpeechStreamObserver(
      CloudSpeechStreamObserverParams params,
      SpeechSessionListener speechSessionListener,
      int sessionID) {
    this.sessionID = sessionID;
    this.speechSessionListener = speechSessionListener;
    this.params = params;
    this.sessionOkToRequestCloseTime = Instant.now().plus(MIN_TIME_TO_KEEP_SESSION_OPEN);
    updateLastActivityTimestamp();
    this.utteranceStartTime = Optional.absent();
    // The timestampCalculator keeps track of the session start time because the finalized word
    // times are relative to the time of the beginning of the session.
    this.timestampCalculator = new TimestampCalculator(Instant.now());
  }

  /** Convert the results the speech recognizer gives us into an understandable transcript. */
  @Override
  public void onNext(StreamingRecognizeResponse response) {
    if (response == null) {
      return;
    }
    updateLastActivityTimestamp();

    if (!utteranceStartTime.isPresent()) {
      utteranceStartTime = Optional.of(Instant.now());
      timestampCalculator.reset();
    }
    StringBuilder transcriptString = new StringBuilder();
    float highestConfidence = K_CONFIDENCE_NOT_SET;

    boolean endedWithFinalResult = false;
    String languageCode = "";
    TranscriptionResult.Builder resultBuilder = TranscriptionResult.newBuilder();
    // Results are for non-overlapping sections of time, each result may have several possible
    // transcripts, called "alternatives".
    for (StreamingRecognitionResult result : response.getResultsList()) {
      // We use a threshold of 0.5 for stability. In practice, only 0.9 and 0.01 seem to ever come
      // up, so this hardly seems like it is worth tuning.
      final float stableConfidenceThreshold = 0.5f;
      if (params.getRejectUnstableHypotheses()
          && !result.getIsFinal()
          && result.getStability() < stableConfidenceThreshold) {
        continue;
      }
      SpeechRecognitionAlternative bestAlternative = result.getAlternativesList().get(0);
      highestConfidence = bestAlternative.getConfidence();

      transcriptString.append(bestAlternative.getTranscript());
      for (WordInfo wordInfo : bestAlternative.getWordsList()) {
        TranscriptionResult.Word.Builder word =
            TranscriptionResult.Word.newBuilder()
                .setText(wordInfo.getWord())
                .setStartTimestamp(timestampCalculator.getFinalizedStartTimestamp(wordInfo))
                .setEndTimestamp(timestampCalculator.getFinalizedEndTimestamp(wordInfo));
        if (wordInfo.getConfidence() != K_CONFIDENCE_NOT_SET) {
          word.setConfidence(wordInfo.getConfidence());
        }
        resultBuilder.addWordLevelDetail(word);
      }
      languageCode = result.getLanguageCode();
      if (result.getIsFinal()) {
        endedWithFinalResult = true;
        break;
      }
    }

    // If the transcript does not have a word list, generate the list of words and their
    // timestamps from the partial result utterance.
    if (resultBuilder.getWordLevelDetailCount() == 0) {
      List<TranscriptionResult.Word> unfinalizedTimestamps =
          timestampCalculator.updateUnfinalizedTimestamps(transcriptString);
      resultBuilder.addAllWordLevelDetail(unfinalizedTimestamps);
    }

    // If result only contains an endpoint event, we will not call onResults or onPartialResults.
    if (transcriptString.length() > 0) {
      speechSessionListener.onResults(
          sessionID,
          resultBuilder
              .setText(transcriptString.toString())
              .setConfidence(highestConfidence)
              .setStartTimestamp(TimeUtil.toTimestamp(utteranceStartTime.get()))
              .setEndTimestamp(TimeUtil.toTimestamp(Instant.now()))
              .setLanguageCode(languageCode)
              .build(),
          endedWithFinalResult);
      if (endedWithFinalResult) {
        // Reset the utterance start timer to the uninitialized state.
        utteranceStartTime = Optional.absent();
      }

      // Request to stop the session if we see a final result.
      if (endedWithFinalResult && Instant.now().isAfter(sessionOkToRequestCloseTime)) {
        logger.atInfo().log("Session #%d scheduled to close to avoid timeout.", sessionID);
        stopListening();
        speechSessionListener.onDoneListening(sessionID);
      }
    }

    if (response.getSpeechEventType() == SpeechEventType.END_OF_SINGLE_UTTERANCE) {
      stopListening();
      speechSessionListener.onDoneListening(sessionID);
    }
  }

  @Override
  public void onError(Throwable t) {
    updateLastActivityTimestamp();
    stopListening();
    speechSessionListener.onSessionFatalError(sessionID, t);
  }

  @Override
  public void onCompleted() {
    updateLastActivityTimestamp();
    speechSessionListener.onOkToTerminateSession(sessionID);
  }


  // This method is needed to communicate to the CloudSpeechSession that audio should no longer
  // be sent quickly. Without this, the "stop listening" signal has to propagate through the
  // SpeechSessionListener and the RepeatingRecognitionSession in order to tell the session to
  // stop accepting audio. Without this, audio buffers can be lost.
  //
  // Will be called though CloudSpeechSession (the recognition thread).
  public boolean isStillListening() {
    return stillListening.get();
  }

  // Will be called though CloudSpeechSession (the recognition thread).
  public Duration timeSinceLastServerActivity() {
    return new Duration(lastActivityTimestamp.get(), Instant.now());
  }

  private void stopListening() {
    stillListening.set(false);
  }

  /** Update the last activity timestamp. This should be called whenever the session
   *  changes in any way.
   */
  private void updateLastActivityTimestamp() {
    lastActivityTimestamp.set(Instant.now());
  }
}
