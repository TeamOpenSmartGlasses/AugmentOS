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
import { 
  DisplayRequest,
  Layout, 
  TextWall, 
  DoubleTextWall, 
  ReferenceCard,
  DashboardCard,
  LayoutType,
  ViewType,
  TpaToCloudMessageType,
  BitmapView
} from '../../types';

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
   * @param view - View type (main or dashboard)
   * @param durationMs - How long to show the layout (optional)
   * @returns Formatted display request
   */
  private createDisplayEvent(
    layout: Layout, 
    view: ViewType = ViewType.MAIN,
    durationMs?: number
  ): DisplayRequest {
    return {
      timestamp: new Date(),
      sessionId: '',  // Will be filled by session
      type: TpaToCloudMessageType.DISPLAY_REQUEST,
      packageName: this.packageName,
      view,
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
   * @param options - Optional parameters (view, duration)
   * 
   * @example
   * ```typescript
   * layouts.showTextWall('Connected to server');
   * ```
   */
  showTextWall(
    text: string, 
    options?: { view?: ViewType; durationMs?: number }
  ) {
    const layout: TextWall = {
      layoutType: LayoutType.TEXT_WALL,
      text
    };
    this.sendMessage(this.createDisplayEvent(
      layout, 
      options?.view, 
      options?.durationMs
    ));
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
   * @param options - Optional parameters (view, duration)
   * 
   * @example
   * ```typescript
   * layouts.showDoubleTextWall(
   *   'Original: Hello',
   *   'Translated: Bonjour'
   * );
   * ```
   */
  showDoubleTextWall(
    topText: string, 
    bottomText: string, 
    options?: { view?: ViewType; durationMs?: number }
  ) {
    const layout: DoubleTextWall = {
      layoutType: LayoutType.DOUBLE_TEXT_WALL,
      topText,
      bottomText
    };
    this.sendMessage(this.createDisplayEvent(
      layout, 
      options?.view, 
      options?.durationMs
    ));
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
   * @param options - Optional parameters (view, duration)
   * 
   * @example
   * ```typescript
   * layouts.showReferenceCard(
   *   'Meeting Reminder',
   *   'Team standup in 5 minutes'
   * );
   * ```
   */
  showReferenceCard(
    title: string, 
    text: string, 
    options?: { view?: ViewType; durationMs?: number }
  ) {
    const layout: ReferenceCard = {
      layoutType: LayoutType.REFERENCE_CARD,
      title,
      text
    };
    this.sendMessage(this.createDisplayEvent(
      layout, 
      options?.view, 
      options?.durationMs
    ));
  }

    /**
   * 📇 Shows a bitmap
   * 
   * @param data - base64 encoded bitmap data
   * @param options - Optional parameters (view, duration)
   * 
   * @example
   * ```typescript
   * layouts.showBitmapView(
   *   yourBase64EncodedBitmapDataString
   * );
   * ```
   */
  showBitmapView(
    data: string,
    options?: { view?: ViewType; durationMs?: number }
  ) {
    const layout: BitmapView = {
      layoutType: LayoutType.BITMAP_VIEW,
      data
    };
    this.sendMessage(this.createDisplayEvent(
      layout, 
      options?.view, 
      options?.durationMs
    ));
  }

  /**
   * 📊 Shows a dashboard card with left and right text
   * 
   * Best for:
   * - Key-value pairs
   * - Dashboard displays
   * - Metrics
   * 
   * @param leftText - Left side text (typically label/key)
   * @param rightText - Right side text (typically value)
   * @param options - Optional parameters (view, duration)
   * 
   * @example
   * ```typescript
   * layouts.showDashboardCard('Weather', '72°F');
   * ```
   */
  showDashboardCard(
    leftText: string, 
    rightText: string, 
    options?: { view?: ViewType; durationMs?: number }
  ) {
    const layout: DashboardCard = {
      layoutType: LayoutType.DASHBOARD_CARD,
      leftText,
      rightText
    };
    this.sendMessage(this.createDisplayEvent(
      layout, 
      options?.view || ViewType.DASHBOARD, 
      options?.durationMs
    ));
  }
}