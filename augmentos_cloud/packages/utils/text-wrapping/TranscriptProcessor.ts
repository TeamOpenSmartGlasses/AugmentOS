export class TranscriptProcessor {
  private maxCharsPerLine: number;
  private maxLines: number;
  private lines: string[];
  private partialText: string;
  // New property to store up to 2 consecutive final captions.
  private finalCaptions: string[];

  constructor(maxCharsPerLine: number, maxLines: number) {
    this.maxCharsPerLine = maxCharsPerLine;
    this.maxLines = maxLines;
    this.lines = [];
    this.partialText = "";
    this.finalCaptions = [];
  }

  /**
   * Process a new text input.
   * - For non-final (live) text, build a preview that uses the latest final caption (if any)
   *   and the current partial text.
   * - For final text, update the stored final captions so that if a previous final caption
   *   exists, it is displayed together with the new final caption.
   */
  public processString(newText: string | null, isFinal: boolean): string {
    newText = newText ? newText.trim() : "";

    if (!isFinal) {
      // For live (non-final) text, store the partial text and return a preview.
      this.partialText = newText;
      return this.buildPreview();
    } else {
      // When receiving final text, we want to display two consecutive final captions.
      // If a final caption already exists, keep it so that both the previous and the
      // new caption are shown.
      if (this.finalCaptions.length === 2) {
        // Remove the oldest if already 2 exist.
        this.finalCaptions.shift();
      }
      this.finalCaptions.push(newText);
      // Clear out the partial text.
      this.partialText = "";

      // Now rebuild the final transcript from the stored final captions.
      // (We clear out any previous transcript lines so that only the latest final captions are shown.)
      this.lines = [];
      for (const caption of this.finalCaptions) {
        const wrapped = this.wrapText(caption, this.maxCharsPerLine);
        for (const chunk of wrapped) {
          this.appendToLines(chunk);
        }
      }

      return this.getTranscript();
    }
  }

  /**
   * Builds a preview of the transcript that includes:
   * - The final caption(s) (if any) stored in finalCaptions.
   * - The current partial text appended to the last final caption line.
   *
   * The result is truncated and padded so that exactly maxLines are displayed.
   */
  private buildPreview(): string {
    let previewLines: string[] = [];

    // Wrap each final caption stored and add them to previewLines.
    for (const caption of this.finalCaptions) {
      const wrapped = this.wrapText(caption, this.maxCharsPerLine);
      previewLines.push(...wrapped);
    }

    // Now, incorporate the live (partial) text.
    const partialChunks = this.wrapText(this.partialText, this.maxCharsPerLine);
    if (previewLines.length > 0 && partialChunks.length > 0) {
      // Attempt to append the first chunk of the partial text to the last final caption,
      // if it fits.
      const lastLine = previewLines.pop()!;
      const candidate = lastLine === "" ? partialChunks[0] : `${lastLine} ${partialChunks[0]}`;
      if (candidate.length <= this.maxCharsPerLine) {
        previewLines.push(candidate);
        // If there are more partial chunks, append them as separate lines.
        for (let i = 1; i < partialChunks.length; i++) {
          previewLines.push(partialChunks[i]);
        }
      } else {
        // Otherwise, put back the last line and add all partial chunks separately.
        previewLines.push(lastLine);
        previewLines.push(...partialChunks);
      }
    } else if (previewLines.length === 0) {
      // If no final caption exists, simply use the partial text.
      previewLines = partialChunks;
    }

    // Ensure we only display the most recent lines up to maxLines.
    if (previewLines.length > this.maxLines) {
      previewLines.splice(0, previewLines.length - this.maxLines);
    }

    // Pad with empty lines if needed.
    while (previewLines.length < this.maxLines) {
      previewLines.push("");
    }

    return previewLines.join("\n");
  }

  /**
   * Appends a wrapped chunk to the finalized lines.
   * If possible, it tries to merge the new chunk with the last line.
   */
  private appendToLines(chunk: string): void {
    if (this.lines.length === 0) {
      this.lines.push(chunk);
    } else {
      // Remove the last line to try appending the new chunk.
      const lastLine = this.lines.pop()!;
      const candidate = lastLine === "" ? chunk : `${lastLine} ${chunk}`;
      if (candidate.length <= this.maxCharsPerLine) {
        this.lines.push(candidate);
      } else {
        // If the merged candidate is too long, put back the last line
        // and add the chunk as a new line.
        this.lines.push(lastLine);
        this.lines.push(chunk);
      }
    }

    // Ensure we never exceed maxLines.
    while (this.lines.length > this.maxLines) {
      this.lines.shift();
    }
  }

  /**
   * Wraps a given text into chunks that do not exceed maxLineLength.
   */
  private wrapText(text: string, maxLineLength: number): string[] {
    const result: string[] = [];
    while (text.length > 0) {
      if (text.length <= maxLineLength) {
        result.push(text);
        break;
      } else {
        let splitIndex = maxLineLength;
        // Move splitIndex left until a space is found.
        while (splitIndex > 0 && text.charAt(splitIndex) !== " ") {
          splitIndex--;
        }
        // If no space was found, force the split.
        if (splitIndex === 0) {
          splitIndex = maxLineLength;
        }

        const chunk = text.substring(0, splitIndex).trim();
        result.push(chunk);
        text = text.substring(splitIndex).trim();
      }
    }
    return result;
  }

  /**
   * Returns the finalized transcript.
   *
   * Pads the transcript to ensure it always has exactly maxLines lines,
   * then clears the finalized transcript lines.
   *
   * Note: The stored final captions remain (for use in subsequent live previews)
   * until overridden by a newer final caption.
   */
  public getTranscript(): string {
    // Make a copy of the transcript lines.
    const transcriptLines = [...this.lines];

    // Pad to exactly maxLines.
    while (transcriptLines.length < this.maxLines) {
      transcriptLines.push("");
    }

    const finalString = transcriptLines.join("\n");

    // Clear the transcript lines (but keep finalCaptions).
    this.lines = [];

    return finalString;
  }

  /**
   * Clears all stored text, including final captions.
   */
  public clear(): void {
    this.lines = [];
    this.partialText = "";
    this.finalCaptions = [];
  }

  public getMaxCharsPerLine(): number {
    return this.maxCharsPerLine;
  }

  public getMaxLines(): number {
    return this.maxLines;
  }
}
