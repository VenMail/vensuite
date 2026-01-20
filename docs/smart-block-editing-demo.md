# Smart Block Editing Demo Guide

## How to Test the Feature

### 1. Open the Slide Editor
- Navigate to your slide editor in the application
- Open any existing slide or create a new one

### 2. Add Content to Your Slide
In the markdown editor, add some content like:

```markdown
# Main Title

This is a paragraph with some text that can be edited.

## Subheading

- List item 1
- List item 2
- List item 3

Another paragraph with more content.
```

### 3. Switch to Edit Mode
- Make sure you're in "Edit" mode (not preview mode)
- You should see both the markdown editor and the preview pane

### 4. Try Double-Click Editing

#### On Headings
1. **Double-click** on the "Main Title" heading
2. A floating toolbar should appear above it
3. The heading should be editable in an overlay
4. Try changing the font size to 32px
5. Click the bold button
6. Press Enter or click ✓ to save

#### On Paragraphs
1. **Double-click** on any paragraph
2. Change the text content
3. Try different font sizes (16px, 20px, 24px)
4. Change text alignment to center
5. Pick a different color
6. Save the changes

#### On List Items
1. **Double-click** on a list item
2. Edit the text
3. Apply italic formatting
4. Save the changes

### 5. Observe the Effects

#### Visual Feedback
- **Hover**: Elements should show a blue outline and edit icon
- **Selected**: Elements get highlighted with a blue background
- **Editing**: Clear overlay with toolbar appears

#### Toolbar Features
- **Font Size Presets**: Click 12, 14, 16, 18, 20, 24, 32, 48
- **Text Styles**: Bold (B), Italic (I), Underline (U)
- **Alignment**: Left, Center, Right
- **Color Picker**: Preset colors + custom color input

#### Keyboard Shortcuts
- **Enter**: Save changes
- **Escape**: Cancel editing
- **Tab**: Navigate between toolbar controls

### 6. Check Markdown Updates
After editing, check the markdown editor to see how the changes are reflected:
- Bold text becomes `**text**`
- Italic text becomes `*text*`
- Underlined text becomes `__text__`
- Custom styles become inline HTML: `<div style="font-size: 24px">text</div>`

### 7. Test Different Scenarios

#### Complex Formatting
1. Create a heading with multiple words
2. Apply bold, italic, and underline
3. Change font size and color
4. Center align the text
5. Save and check the generated markdown

#### Long Content
1. Create a paragraph with several sentences
2. Edit a portion of the text
3. Apply formatting to specific words
4. Verify the markdown preserves the structure

#### List Editing
1. Edit list items individually
2. Change formatting on specific items
3. Ensure list structure is maintained

## Expected Behavior

### ✅ Should Work
- Double-click any text element to edit
- Floating toolbar appears with formatting options
- Live preview of changes
- Proper markdown generation
- Keyboard shortcuts (Enter/Escape)
- Visual feedback on hover and selection

### ❌ Known Limitations
- Cannot edit non-text elements (images, diagrams)
- Complex nested structures may have limitations
- Some CSS styles might not translate to markdown perfectly

## Troubleshooting

### Double-Click Not Working
- Ensure you're in Edit mode
- Check that the element has content (not empty)
- Try refreshing the page

### Toolbar Not Appearing
- Check browser console for errors
- Ensure the element is properly detected
- Verify CSS styles are loading

### Changes Not Saving
- Check if Enter key or ✓ button was pressed
- Verify the markdown editor updates
- Look for console errors

### Formatting Issues
- Some CSS properties might not translate to markdown
- Complex nested HTML might need manual cleanup
- Color formats might need adjustment

## Performance Notes

- The feature is optimized for single-element editing
- Large slides with many elements still perform well
- Memory usage is minimal due to proper cleanup

## Browser Compatibility

- ✅ Chrome/Edge (full support)
- ✅ Firefox (full support)
- ✅ Safari (full support)
- ❌ Internet Explorer (not supported)

---

This demo guide should help you test all aspects of the smart block editing feature. The implementation is robust and should handle most common editing scenarios seamlessly.
