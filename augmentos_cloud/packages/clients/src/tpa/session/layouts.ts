/**
 * 🎨 Layout Manager Module
 * 
 * Manages AR display layouts for TPAs. This class provides an easy-to-use interface
 * for showing different types of content in the user's AR view.
 * 
 * @example
 * ```typescript
 * const layouts = new LayoutManager('org.example.myapp', sendMessage);
 * 
 * // Show a simple message
 * layouts.showTextWall('Hello AR World!');
 * 
 * // Show a card with title
 * layouts.showReferenceCard('Weather', 'Sunny and 75°F');
 * ```
 */
import type { 
  DisplayRequest, 
  Layout, 
  TextWall, 
  DoubleTextWall, 
  ReferenceCard 
} from '@augmentos/types';

export class LayoutManager {
  /**
   * 🎯 Creates a new LayoutManager instance
   * 
   * @param packageName - TPA package identifier
   * @param sendMessage - Function to send display requests to AugmentOS
   */
  constructor(
    private packageName: string,
    private sendMessage: (message: DisplayRequest) => void
  ) {}

  /**
   * 📦 Creates a display event request
   * 
   * @param layout - Layout configuration to display
   * @param durationMs - How long to show the layout (optional)
   * @returns Formatted display request
   */
  private createDisplayEvent(layout: Layout, durationMs?: number): DisplayRequest {
    return {
      timestamp: new Date(),
      view: "main",
      type: 'display_event',
      packageName: this.packageName,
      layout,
      durationMs
    };
  }

  /**
   * 📝 Shows a single block of text
   * 
   * Best for:
   * - Simple messages
   * - Status updates
   * - Notifications
   * 
   * @param text - Text content to display
   * @param durationMs - How long to show the text (optional)
   * 
   * @example
   * ```typescript
   * layouts.showTextWall('Connected to server');
   * ```
   */
  showTextWall(text: string, durationMs?: number) {
    const layout: TextWall = {
      layoutType: 'text_wall',
      text
    };
    this.sendMessage(this.createDisplayEvent(layout, durationMs));
  }

  /**
   * ↕️ Shows two sections of text, one above the other
   * 
   * Best for:
   * - Before/After content
   * - Question/Answer displays
   * - Two-part messages
   * - Comparisons
   * 
   * @param topText - Text to show in top section
   * @param bottomText - Text to show in bottom section
   * @param durationMs - How long to show the layout (optional)
   * 
   * @example
   * ```typescript
   * layouts.showDoubleTextWall(
   *   'Original: Hello',
   *   'Translated: Bonjour'
   * );
   * ```
   */
  showDoubleTextWall(topText: string, bottomText: string, durationMs?: number) {
    const layout: DoubleTextWall = {
      layoutType: 'double_text_wall',
      topText,
      bottomText
    };
    this.sendMessage(this.createDisplayEvent(layout, durationMs));
  }

  /**
   * 📇 Shows a card with a title and content
   * 
   * Best for:
   * - Titled content
   * - Important information
   * - Structured data
   * - Notifications with context
   * 
   * @param title - Card title
   * @param text - Main content text
   * @param durationMs - How long to show the card (optional)
   * 
   * @example
   * ```typescript
   * layouts.showReferenceCard(
   *   'Meeting Reminder',
   *   'Team standup in 5 minutes'
   * );
   * ```
   */
  showReferenceCard(title: string, text: string, durationMs?: number) {
    const layout: ReferenceCard = {
      layoutType: 'reference_card',
      title,
      text
    };
    this.sendMessage(this.createDisplayEvent(layout, durationMs));
  }
}