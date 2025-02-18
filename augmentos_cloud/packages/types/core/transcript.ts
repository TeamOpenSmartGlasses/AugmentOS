
export interface TranscriptSegment {
  speakerId?: string;
  resultId: string;
  text: string;
  timestamp: Date;
}

export interface TranscriptI {
  segments: TranscriptSegment[];
}
