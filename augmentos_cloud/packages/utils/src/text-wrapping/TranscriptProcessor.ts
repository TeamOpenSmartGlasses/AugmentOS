export class TranscriptProcessor {
  private maxCharsPerLine: number;
  private maxLines: number;
  private lines: string[];
  private partialText: string;
  private lastUserTranscript: string;
  constructor(maxCharsPerLine: number, maxLines: number) {
    this.maxCharsPerLine = maxCharsPerLine;
    this.maxLines = maxLines;
    this.lastUserTranscript = "";
    this.lines = [];
    this.partialText = "";
  }

  public processString(newText: string | null, isFinal: boolean): string {
    newText = (newText === null ? "" : newText.trim());

    if (!isFinal) {
      // Store this as the current partial text (overwriting old partial)
      this.partialText = newText;
      this.lastUserTranscript = newText;
      return this.buildPreview(this.partialText);
    } else {
      // We have a final text -> clear out the partial text to avoid duplication
      this.partialText = "";

      // Wrap this final text
      const wrapped = this.wrapText(newText, this.maxCharsPerLine);
      for (const chunk of wrapped) {
        this.appendToLines(chunk);
      }

      this.lastUserTranscript = newText;
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
    let finalCombined = combined;
    if (combined.length > this.maxLines) {
      finalCombined = combined.slice(combined.length - this.maxLines);
    }

    // Add padding to ensure exactly maxLines are displayed
    const linesToPad = this.maxLines - finalCombined.length;
    for (let i = 0; i < linesToPad; i++) {
      finalCombined.push(""); // Add empty lines at the end
    }

    return finalCombined.join("\n");
  }

  private appendToLines(chunk: string): void {
    if (this.lines.length === 0) {
      this.lines.push(chunk);
    } else {
      const lastLine = this.lines.pop() as string;
      const candidate = lastLine === "" ? chunk : lastLine + " " + chunk;

      if (candidate.length <= this.maxCharsPerLine) {
        this.lines.push(candidate);
      } else {
        // Put back the last line if it doesn't fit
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
    while (text !== "") {
      if (text.length <= maxLineLength) {
        result.push(text);
        break;
      } else {
        let splitIndex = maxLineLength;
        // move splitIndex left until we find a space
        while (splitIndex > 0 && text.charAt(splitIndex) !== " ") {
          splitIndex--;
        }
        // If we didn't find a space, force split
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
      allLines.push(""); // Add empty lines at the end
    }

    const finalString = allLines.join("\n");

    // Clear the lines
    this.lines = [];
    return finalString;
  }

  public getLastUserTranscript(): string {
    return this.lastUserTranscript;
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
