# AR Layout Guide

This guide covers all available layout types in AugmentOS and best practices for creating effective AR displays.

## Table of Contents
- [Overview](#overview)
- [Layout Types](#layout-types)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Implementation Examples](#implementation-examples)
- [Visual Guidelines](#visual-guidelines)

## Overview

AugmentOS provides several layout types for displaying content in AR. Each layout is designed for specific use cases and follows AR design principles for optimal readability and user experience.

### Display Event Structure
```typescript
interface DisplayRequest {
  view: "main" | "dashboard" | string;
  type: 'display_event';
  layout: Layout;  // Union of all layout types
  timestamp: Date;
  packageName: string;
  durationMs?: number;  // Auto-clear after duration
}
```

## Layout Types

### 1. Text Wall
Single block of text display.

**Best for:**
- Simple messages
- Status updates
- Brief notifications
- Single-line content

```typescript
// Using TpaSession
session.layouts.showTextWall(
  "Connected to server",
  3000  // Optional duration in ms
);

// Raw Layout Object
const layout: TextWall = {
  layoutType: 'text_wall',
  text: "Connected to server"
};
```

**Do's:**
- ✅ Keep text concise
- ✅ Use for temporary messages
- ✅ Display important alerts
- ✅ Show status updates

**Don'ts:**
- ❌ Don't use for long content
- ❌ Avoid multiple paragraphs
- ❌ Don't use for complex data
- ❌ Avoid rapid updates

### 2. Double Text Wall
Two-section text display with visual separation.

**Best for:**
- Before/After content
- Question/Answer displays
- Translations
- Comparisons

```typescript
// Using TpaSession
session.layouts.showDoubleTextWall(
  "Original: Hello world",
  "Translated: Bonjour le monde",
  5000  // Optional duration
);

// Raw Layout Object
const layout: DoubleTextWall = {
  layoutType: 'double_text_wall',
  topText: "Original: Hello world",
  bottomText: "Translated: Bonjour le monde"
};
```

**Do's:**
- ✅ Use clear section separation
- ✅ Keep related content together
- ✅ Balance top and bottom text lengths
- ✅ Use for comparisons

**Don'ts:**
- ❌ Don't mix unrelated content
- ❌ Avoid very long sections
- ❌ Don't use for single messages
- ❌ Avoid asymmetric content

### 3. Reference Card
Title and content card display.

**Best for:**
- Titled content
- Structured information
- Important details
- Persistent displays

```typescript
// Using TpaSession
session.layouts.showReferenceCard(
  "Weather Alert",
  "Heavy rain expected in your area",
  10000  // Optional duration
);

// Raw Layout Object
const layout: ReferenceCard = {
  layoutType: 'reference_card',
  title: "Weather Alert",
  text: "Heavy rain expected in your area"
};
```

**Do's:**
- ✅ Use descriptive titles
- ✅ Structure information clearly
- ✅ Include relevant context
- ✅ Keep content focused

**Don'ts:**
- ❌ Don't use vague titles
- ❌ Avoid mixing topics
- ❌ Don't overload with text
- ❌ Avoid redundant information

## Best Practices

### 1. Content Length
- Keep text concise and readable
- Break long content into chunks
- Use appropriate layout for content size
- Consider user reading speed

### 2. Display Duration
- Set appropriate durationMs for content length
- Use longer durations for important info
- Allow time for user interaction
- Consider overlap with other events

### 3. Content Hierarchy
```typescript
// Progressive disclosure
session.layouts.showTextWall("New message received");

// Then show details
session.layouts.showReferenceCard(
  "Message from John",
  "Meeting at 3pm today"
);
```

### 4. Error Handling
```typescript
try {
  // Show loading state
  session.layouts.showTextWall("Loading...");
  
  const data = await fetchData();
  
  // Show results
  session.layouts.showReferenceCard(
    "Data Loaded",
    formatData(data)
  );
} catch (error) {
  // Show error state
  session.layouts.showReferenceCard(
    "Error",
    error.message
  );
}
```

## Common Patterns

### 1. Progress Updates
```typescript
function showProgress(current: number, total: number) {
  session.layouts.showDoubleTextWall(
    `Progress: ${current}/${total}`,
    `${Math.round((current/total) * 100)}% Complete`
  );
}
```

### 2. State Changes
```typescript
function showConnectionState(connected: boolean) {
  if (connected) {
    session.layouts.showTextWall(
      "Connected ✓",
      3000
    );
  } else {
    session.layouts.showReferenceCard(
      "Connection Lost",
      "Attempting to reconnect..."
    );
  }
}
```

### 3. Interactive Feedback
```typescript
session.events.onButtonPress((event) => {
  session.layouts.showTextWall(
    `Button ${event.buttonId} pressed`,
    1000
  );
});
```

## Visual Guidelines

### 1. Text Formatting
- Use clear, readable text
- Break long content appropriately
- Consider AR display constraints
- Maintain consistent formatting

### 2. Timing
- Short notifications: 2-3 seconds
- Important messages: 5-10 seconds
- Interactive content: No auto-clear
- Status updates: Context dependent

### 3. Context Awareness
- Consider user activity
- Respect user attention
- Don't overload displays
- Maintain spatial awareness

## Layout Selection Guide

Choose layouts based on your content:

1. **Text Wall** for:
   - Quick updates
   - Simple messages
   - Status changes
   - Brief notifications

2. **Double Text Wall** for:
   - Comparisons
   - Translations
   - Before/After
   - Split content

3. **Reference Card** for:
   - Detailed information
   - Important alerts
   - Structured content
   - Persistent displays

## Examples

### Captions App
```typescript
session.events.onTranscription((data) => {
  if (data.isFinal) {
    session.layouts.showReferenceCard(
      "Captions",
      data.text,
      3000
    );
  } else {
    session.layouts.showReferenceCard(
      "Captions",
      data.text
    );
  }
});
```

### Translation App
```typescript
session.events.onTranslation((data) => {
  session.layouts.showDoubleTextWall(
    `Original: ${data.sourceText}`,
    `${data.targetLang}: ${data.translatedText}`,
    5000
  );
});
```

### Notification Handler
```typescript
session.events.onPhoneNotifications((data) => {
  session.layouts.showReferenceCard(
    data.app,
    data.content,
    data.priority === 'high' ? 10000 : 5000
  );
});
```

## See Also
- [PROTOCOL.md](./PROTOCOL.md) - Protocol documentation
- [EVENTS.md](./EVENTS.md) - Events documentation
- [README.md](./README.md) - Main documentation