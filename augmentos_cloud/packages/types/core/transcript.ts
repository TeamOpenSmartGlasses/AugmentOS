
export interface TranscriptSegment {
  speakerId: string;
  text: string;
  timestamp: Date;
  durationInMilliseconds: number;
  relativeStartTimeInMilliseconds: number;
  wordsEndAndStartTimesInMilliseconds: [number, number];
}

export interface TranscriptI {
  segments: TranscriptSegment[];
}

