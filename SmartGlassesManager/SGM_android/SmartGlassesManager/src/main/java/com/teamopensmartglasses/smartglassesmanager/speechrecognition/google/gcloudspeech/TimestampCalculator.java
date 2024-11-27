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

import com.google.audio.asr.TranscriptionResult;
import com.google.cloud.speech.v1p1beta1.WordInfo;
import com.google.common.base.Splitter;
import com.google.protobuf.Timestamp;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.asr.TimeUtil;

import org.joda.time.Duration;
import org.joda.time.Instant;

import java.util.ArrayList;
import java.util.List;

/**
 * Calculates unfinalized and finalized timestamps and adds them to the word-level details of
 * utterances. Finalized timestamps are simply copied from the corresponding timestamps returned by
 * the cloud. Unfinalized timestamps do not exist in the response returned by the cloud, so they are
 * computed from the returned transcript instead.
 */
public class TimestampCalculator {

  /**
   * Keeps track of the session start time because the finalized word times are relative to the time
   * of the beginning of the session.
   */
  private final Instant sessionStartTime;

  /**
   * Stores the time instants of each word in the un-finalized utterance. As the utterance is
   * updated with more words, this array marks the time of the new words.
   */
  private final ArrayList<Instant> unfinalizedWordInstants = new ArrayList<>();

  private static final int NANOS_PER_MILLIS = 1_000_000;

  public TimestampCalculator(Instant newSessionStartTime) {
    this.sessionStartTime = newSessionStartTime;
  }

  public Timestamp getFinalizedStartTimestamp(WordInfo wordInfo) {
    Duration startOffset =
        Duration.standardSeconds(wordInfo.getStartTime().getSeconds())
            .plus(Duration.millis(wordInfo.getStartTime().getNanos() / NANOS_PER_MILLIS));
    return TimeUtil.toTimestamp(sessionStartTime.plus(startOffset));
  }

  public Timestamp getFinalizedEndTimestamp(WordInfo wordInfo) {
    Duration endOffset =
        Duration.standardSeconds(wordInfo.getEndTime().getSeconds())
            .plus(Duration.millis(wordInfo.getEndTime().getNanos() / NANOS_PER_MILLIS));
    return TimeUtil.toTimestamp(sessionStartTime.plus(endOffset));
  }

  public void reset() {
    unfinalizedWordInstants.clear();
  }

  public List<TranscriptionResult.Word> updateUnfinalizedTimestamps(
      StringBuilder transcriptString) {
    // Generate the list of words and their timestamps from the partial result utterance.
    // This implementation doesn't require every "word" to have a timestamp; instead it is
    // timestamping the smallest logical chunk returned by the ASR.
    // The algorithm splits by spaces as a convenience to count how many new words have come in.

    // This works for languages that has spaces between logical groups of character (such as words).
    // For languages that don't have spaces, it treats the group of characters as one timestamp.
    List<String> wordList =
        Splitter.onPattern("\\s+").splitToList(transcriptString.toString().trim());
    // Compute time instants for the newly occurring words.
    // We do not change the times of previously computed words.
    for (int i = unfinalizedWordInstants.size(); i < wordList.size(); i++) {
      unfinalizedWordInstants.add(Instant.now());
    }
    // Use the computed words and computed time instances to build the word-level detail.
    // Since the previous loop guaranteed that the size of the word instants array is at least
    // as long as the list of words, we can safely index into the array.
    List<TranscriptionResult.Word> wordLevelDetailList = new ArrayList<>();
    for (int i = 0; i < wordList.size(); i++) {
      // We set both the start and end timestamps to the same value because we don't know when
      // the word actually begins and ends because of potential pauses between words.
      Instant timeInstant = unfinalizedWordInstants.get(i);
      TranscriptionResult.Word word =
          TranscriptionResult.Word.newBuilder()
              .setText(wordList.get(i))
              .setStartTimestamp(TimeUtil.toTimestamp(timeInstant))
              .setEndTimestamp(TimeUtil.toTimestamp(timeInstant))
              .build();
      wordLevelDetailList.add(word);
    }
    return wordLevelDetailList;
  }
}
