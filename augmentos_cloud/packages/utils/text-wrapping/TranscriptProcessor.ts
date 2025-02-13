export class TranscriptProcessor {
    private maxCharsPerLine: number;
    private maxLines: number;
    private lines: string[];
    private partialText: string;
  
    constructor(maxCharsPerLine: number, maxLines: number) {
      this.maxCharsPerLine = maxCharsPerLine;
      this.maxLines = maxLines;
      this.lines = [];
      this.partialText = "";
    }
  
    public processString(newText: string | null, isFinal: boolean): string {
      newText = newText ? newText.trim() : "";
  
      if (!isFinal) {
        // Store this as the current partial text (overwriting old partial)
        this.partialText = newText;
        return this.buildPreview(this.partialText);
      } else {
        // We have final text -> clear out the partial text to avoid duplication
        this.partialText = "";
  
        // Wrap this final text
        const wrapped = this.wrapText(newText, this.maxCharsPerLine);
        for (const chunk of wrapped) {
          this.appendToLines(chunk);
        }
  
        // Return only the finalized lines
        return this.getTranscript();
      }
    }
  
    private buildPreview(partial: string): string {
      // Wrap the partial text
      const partialChunks = this.wrapText(partial, this.maxCharsPerLine);
  
      // Combine with finalized lines
      const combined = [...this.lines, ...partialChunks];
  
      // Truncate if necessary
      if (combined.length > this.maxLines) {
        combined.splice(0, combined.length - this.maxLines);
      }
  
      // Add padding to ensure exactly maxLines are displayed
      const linesToPad = this.maxLines - combined.length;
      for (let i = 0; i < linesToPad; i++) {
        combined.push("");
      }
  
      return combined.join("\n");
    }
  
    private appendToLines(chunk: string): void {
      if (this.lines.length === 0) {
        this.lines.push(chunk);
      } else {
        // Remove the last line to try to append the chunk to it
        const lastLine = this.lines.pop()!;
        const candidate = lastLine === "" ? chunk : `${lastLine} ${chunk}`;
  
        if (candidate.length <= this.maxCharsPerLine) {
          this.lines.push(candidate);
        } else {
          // Put back the last line if it doesn't fit and add the chunk as a new line
          this.lines.push(lastLine);
          this.lines.push(chunk);
        }
      }
  
      // Ensure we don't exceed maxLines
      while (this.lines.length > this.maxLines) {
        this.lines.shift();
      }
    }
  
    private wrapText(text: string, maxLineLength: number): string[] {
      const result: string[] = [];
      while (text.length > 0) {
        if (text.length <= maxLineLength) {
          result.push(text);
          break;
        } else {
          let splitIndex = maxLineLength;
          // Move splitIndex left until we find a space
          while (splitIndex > 0 && text.charAt(splitIndex) !== " ") {
            splitIndex--;
          }
          // If we didn't find a space, force a split
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
  
    public getTranscript(): string {
      // Create a copy of the lines for manipulation
      const allLines = [...this.lines];
  
      // Add padding to ensure exactly maxLines are displayed
      const linesToPad = this.maxLines - allLines.length;
      for (let i = 0; i < linesToPad; i++) {
        allLines.push("");
      }
  
      const finalString = allLines.join("\n");
  
      // Clear the lines after producing the transcript
      this.lines = [];
  
      return finalString;
    }
  
    public clear(): void {
      this.lines = [];
      this.partialText = "";
    }
  
    public getMaxCharsPerLine(): number {
      return this.maxCharsPerLine;
    }
  
    public getMaxLines(): number {
      return this.maxLines;
    }
  }
  