// src/layouts/index.ts
import type { TpaDisplayEventMessage, Layout, TextWall, DoubleTextWall, ReferenceCard  } from '@augmentos/types';

export class LayoutManager {
  constructor(
    private packageName: string,
    private sendMessage: (message: TpaDisplayEventMessage) => void
  ) {}

  private createDisplayEvent(layout: Layout, durationMs?: number): TpaDisplayEventMessage {
    return {
      type: 'display_event',
      packageName: this.packageName,
      layout,
      durationMs
    };
  }

  showTextWall(text: string, durationMs?: number) {
    const layout: TextWall = {
      layoutType: 'text_wall',
      text
    };
    this.sendMessage(this.createDisplayEvent(layout, durationMs));
  }

  showDoubleTextWall(topText: string, bottomText: string, durationMs?: number) {
    const layout: DoubleTextWall = {
      layoutType: 'double_text_wall',
      topText,
      bottomText
    };
    this.sendMessage(this.createDisplayEvent(layout, durationMs));
  }

  showReferenceCard(title: string, text: string, durationMs?: number) {
    const layout: ReferenceCard = {
      layoutType: 'reference_card',
      title,
      text
    };
    this.sendMessage(this.createDisplayEvent(layout, durationMs));
  }
}
