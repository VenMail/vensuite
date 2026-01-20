# Smart Block Editing Implementation

## Overview

The smart block editing feature allows users to double-click any text element in the slide preview pane to edit it inline with a rich text toolbar. This provides a seamless, intuitive editing experience directly in the preview without needing to switch to the markdown editor.

## Features

### Inline Editing
- **Double-click to edit**: Any text element (headings, paragraphs, list items) can be edited by double-clicking
- **Rich text toolbar**: Floating toolbar appears above the edited element with formatting options
- **Live preview**: Changes are applied immediately to the preview
- **Auto-save**: Changes are automatically saved to the markdown content

### Formatting Options
- **Font sizes**: Quick preset buttons (12px, 14px, 16px, 18px, 20px, 24px, 32px, 48px)
- **Text styles**: Bold, italic, underline
- **Text alignment**: Left, center, right
- **Color picker**: Preset colors and custom color input
- **Custom font size**: Input field for specific sizes

### Visual Feedback
- **Hover effects**: Elements show a blue outline and edit icon on hover
- **Edit hint**: Small pencil icon appears on hover to indicate editability
- **Selection highlighting**: Selected elements are highlighted with a blue background
- **Active editing**: Clear visual indication when an element is being edited

## Architecture

### Components

#### 1. InlineEditor.vue
The main inline editing component that provides:
- Floating toolbar with formatting controls
- Contenteditable editor overlay
- Style application and markdown generation
- Keyboard shortcuts (Escape to cancel, Enter to save)

#### 2. SlidesPreviewPane.vue (Enhanced)
The preview pane now includes:
- Double-click event handling
- Element identification and tracking
- Inline editor integration
- Event listener management

### Key Functions

#### handleDoubleClick(event: MouseEvent)
- Identifies the clicked element
- Extracts current content and styles
- Launches the inline editor
- Prevents default browser behavior

#### handleInlineSave(content: string, styles: Record<string, string>)
- Applies new content to the element
- Updates element styles
- Generates markdown with inline styles
- Emits update event to parent

#### generateStyledMarkdown(content: string, styles: Record<string, string>)
- Converts HTML content back to markdown
- Applies inline styles as HTML attributes
- Handles markdown formatting (bold, italic, underline)
- Preserves text alignment and color

### Event Flow

1. **Double-click** on element → `handleDoubleClick`
2. **Extract** element data (content, styles, type)
3. **Launch** InlineEditor with extracted data
4. **User edits** content and applies formatting
5. **Save** → `handleInlineSave`
6. **Apply** changes to DOM element
7. **Generate** updated markdown
8. **Emit** update to parent component

## Implementation Details

### Element Identification
Elements are marked with:
- `editable-element` class
- `data-element-type` (h1, h2, p, li, etc.)
- `data-element-index` for tracking
- Event listeners for double-click

### Style Extraction
Current styles are extracted using `window.getComputedStyle()`:
- Font size, weight, style
- Text decoration and alignment
- Text color
- Applied to the inline editor for consistency

### Markdown Generation
The system converts styled content back to markdown:
1. HTML tags → Markdown syntax (`<strong>` → `**text**`)
2. Inline styles → HTML style attributes
3. Complex formatting → Styled divs with CSS

### Cleanup and Memory Management
- Event listeners are properly removed on unmount
- Duplicate listeners are prevented
- State is cleaned up when editing ends

## Usage

### For Users
1. **Double-click** any text in the preview
2. **Edit** the content in the floating editor
3. **Apply formatting** using the toolbar
4. **Press Enter** or click ✓ to save
5. **Press Escape** or click X to cancel

### For Developers
The feature is automatically available on all text elements in the preview. No additional configuration is required.

## Styling

### CSS Classes
- `.editable-element`: Marks elements as editable
- `.selected-element`: Highlights selected elements
- Hover effects with blue outline
- Edit icon indicator on hover

### Responsive Design
- Toolbar positioning adapts to element location
- Editor overlay adjusts to element size
- Minimum sizes enforced for usability

## Browser Compatibility

- **Modern browsers**: Full support
- **contenteditable**: Required for inline editing
- **getComputedStyle**: For style extraction
- **Event listeners**: Double-click events

## Future Enhancements

### Planned Features
- **More formatting options**: Superscript, subscript, strikethrough
- **Text shadows and outlines**: Additional styling options
- **Font family selection**: Choose from available fonts
- **Line height control**: Adjust spacing between lines
- **Background colors**: Element background styling

### Advanced Features
- **Copy/Paste formatting**: Style transfer between elements
- **Format painter**: Apply styles from one element to another
- **Undo/Redo**: History management for inline edits
- **Multi-element editing**: Select and edit multiple elements

## Troubleshooting

### Common Issues

#### Double-click not working
- Ensure element has `editable-element` class
- Check that event listeners are properly attached
- Verify element is within the preview container

#### Styles not applying
- Check CSS specificity in preview styles
- Verify style names are correct
- Ensure inline styles are not overridden

#### Markdown generation issues
- Check HTML tag conversion regex patterns
- Verify style attribute formatting
- Test with various content types

### Debug Mode
Add console logging to track:
- Element selection events
- Style extraction results
- Markdown generation output

## Performance Considerations

- **Event delegation**: Efficient event handling for many elements
- **Debounced updates**: Prevent excessive save operations
- **Memory cleanup**: Proper listener removal
- **Optimized rendering**: Minimal DOM manipulation

## Security Notes

- **Sanitization**: HTML content is properly sanitized
- **XSS prevention**: No script execution in editable content
- **Style validation**: CSS properties are validated before application

---

This implementation provides a robust, user-friendly inline editing experience that enhances the slide editor's usability while maintaining compatibility with the existing markdown-based workflow.
