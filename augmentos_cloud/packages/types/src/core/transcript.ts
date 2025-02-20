
export interface TranscriptSegment {
  speakerId?: string;
  resultId: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export interface TranscriptI {
  segments: TranscriptSegment[];
}
