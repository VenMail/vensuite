# Slides Editor Migration Guide

**Version:** 2.0  
**Migration Date:** January 2026  
**Breaking Changes:** Yes

---

## Overview

This guide helps you migrate from the old slides editor architecture (with inline editing and multiple font sizing systems) to the new streamlined architecture (markdown editor + unified properties panel).

---

## What Changed?

### Removed Features

#### 1. Inline Editing in Preview Pane
**Before:** Click on text in preview to edit inline  
**After:** Edit in markdown editor, see changes in preview

#### 2. Multiple Font Sizing Controls
**Before:** Font size buttons in preview pane toolbar  
**After:** Unified font sizing in DynamicPropertiesPanel (right sidebar)

#### 3. Element Selection via Clicking
**Before:** Click elements in preview to select and edit  
**After:** Cursor position in markdown editor automatically detects element

### New Workflow

```
OLD WORKFLOW:
1. Click element in preview
2. Inline editor appears
3. Edit text/styles directly
4. Changes reflect in markdown

NEW WORKFLOW:
1. Position cursor in markdown editor
2. Element auto-detected
3. Properties panel updates
4. Edit via markdown or properties panel
5. Preview updates in real-time
```

---

## Feature Mapping

### Font Sizing

| Old Location | New Location | Notes |
|--------------|--------------|-------|
| Preview toolbar "Font Size" button | DynamicPropertiesPanel → Smart Font Sizing section | More powerful with AI recommendations |
| Preview toolbar "Smart Sizing" button | DynamicPropertiesPanel → Smart Font Sizing section | Same functionality, better integration |
| ResponsiveSlideContainer auto-sizing | DynamicPropertiesPanel → Mermaid scaling | Mermaid-specific scaling preserved |

### Element Editing

| Old Method | New Method | Benefits |
|------------|------------|----------|
| Click element in preview | Position cursor in markdown | More precise, keyboard-friendly |
| Inline toolbar for formatting | Properties panel controls | Consistent UI, more options |
| Double-click to edit text | Edit markdown directly | Standard markdown workflow |

### Properties Access

| Old | New | Improvement |
|-----|-----|-------------|
| Right-click context menu | Properties panel (always visible) | Faster access |
| Floating toolbars | Unified right panel | Less UI clutter |
| Multiple adjustment dialogs | Single properties panel | Consistent UX |

---

## Step-by-Step Migration

### For End Users

#### Editing Text Content

**Old Way:**
1. Click "Welcome to Presentation" in preview
2. Inline editor opens
3. Type new text
4. Press Enter to save

**New Way:**
1. Click in markdown editor where text is
2. Edit markdown directly: `# Welcome to Presentation`
3. Preview updates automatically
4. No save needed (auto-save)

#### Changing Font Sizes

**Old Way:**
1. Select text in preview
2. Click "Font Size" button in toolbar
3. Choose size from dropdown
4. Click Apply

**New Way:**
1. Position cursor on text in markdown editor
2. Properties panel auto-detects element type
3. See "Smart Font Sizing" section appear
4. Choose from UnoCSS presets or see AI recommendations
5. Click preset to apply

#### Styling Elements

**Old Way:**
1. Click element in preview
2. Inline toolbar appears
3. Click bold/italic/color buttons
4. Changes apply immediately

**New Way:**
1. Position cursor in markdown editor
2. Properties panel shows element properties
3. Use markdown syntax (`**bold**`, `*italic*`) OR
4. Use properties panel controls
5. Preview updates in real-time

### For Developers

#### Component Usage Changes

**Before:**
```vue
<SlidesPreviewPane
  :rendered-content="content"
  @select-element="handleSelect"
  @update-content="handleUpdate"
  @element-click="handleClick"
/>
```

**After:**
```vue
<SlidesPreviewPane
  :rendered-content="content"
  :layout-class="layoutClass"
  :background="background"
/>
```

**Removed Events:**
- `@select-element` - Use cursor detection instead
- `@update-content` - Edit via markdown editor
- `@element-click` - No longer needed

#### Accessing Font Sizing

**Before:**
```typescript
// Multiple ways to access font sizing
import FontSizeAdjuster from '@/components/slides/FontSizeAdjuster.vue';
import SmartFontSizeAdjuster from '@/components/slides/SmartFontSizeAdjuster.vue';
```

**After:**
```typescript
// Single unified location
// Font sizing is built into DynamicPropertiesPanel
// Access via cursor detection in markdown editor
```

#### Element Selection

**Before:**
```typescript
const selectedElement = ref<HTMLElement | null>(null);

function handleElementClick(element: HTMLElement) {
  selectedElement.value = element;
  showInlineEditor.value = true;
}
```

**After:**
```typescript
const currentMarkdownElement = ref<MarkdownElement | null>(null);

function handleCursorChange(element: MarkdownElement | null) {
  currentMarkdownElement.value = element;
  // Properties panel automatically updates
}
```

---

## Deprecated Components

### Immediate Deprecation (January 2026)

| Component | Replacement | Migration Path |
|-----------|-------------|----------------|
| `FontSizeAdjuster.vue` | DynamicPropertiesPanel | Use properties panel for font sizing |
| `SmartFontSizeAdjuster.vue` | DynamicPropertiesPanel | Use Smart Font Sizing section |
| `ResponsiveSlideContainer.vue` | Direct rendering | Simplified preview pane |
| `InlineEditor.vue` | Markdown editor | Edit markdown directly |

### Planned Removal (March 2026)

Components will be removed from codebase after 2-month deprecation period.

**Action Required:**
- Update any custom code using these components
- Test new workflow thoroughly
- Report any missing functionality

---

## Common Migration Issues

### Issue 1: "I can't click on elements anymore"

**Solution:** Use cursor positioning in markdown editor instead.

**Example:**
```markdown
# My Title    <- Position cursor here
Some text     <- Or here
```

Properties panel will show controls for the element at cursor position.

### Issue 2: "Font sizing buttons are gone"

**Solution:** Font sizing moved to properties panel (right sidebar).

**Steps:**
1. Position cursor on text in markdown editor
2. Look at properties panel on right
3. Find "Smart Font Sizing" section
4. Choose from presets or use AI recommendations

### Issue 3: "Preview doesn't update when I edit"

**Solution:** This should work automatically. If not:

**Troubleshooting:**
1. Check that markdown editor has focus
2. Verify cursor is positioned in text
3. Check browser console for errors
4. Try refreshing the page

### Issue 4: "I need inline editing back"

**Reason for Removal:** Inline editing created complexity and duplicated markdown editor functionality.

**Alternative Workflow:**
1. Use markdown editor for text changes (faster, more precise)
2. Use properties panel for styling (more options, better organized)
3. Use preview for visual feedback only (cleaner separation)

**Benefits:**
- Faster editing with keyboard shortcuts
- More powerful with full markdown syntax
- Consistent with other markdown editors
- Less UI clutter

---

## New Features & Improvements

### 1. Intelligent Cursor Detection

**What:** Automatically detects element type at cursor position

**Benefits:**
- No clicking needed
- Keyboard-friendly workflow
- Instant property panel updates

**Example:**
```markdown
# Heading    <- Cursor here = Heading controls shown
           
Text here   <- Cursor here = Paragraph controls shown

```mermaid   <- Cursor here = Mermaid controls shown
```

### 2. Unified Smart Font Sizing

**What:** AI-powered font size recommendations in one place

**Features:**
- Recommended sizes based on content analysis
- UnoCSS preset buttons (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
- CSS clamp values for responsive typography
- Mermaid diagram complexity analysis

**Location:** DynamicPropertiesPanel → Smart Font Sizing section

### 3. Simplified Preview Pane

**What:** Clean, distraction-free preview

**Features:**
- Pure read-only display
- Zoom controls only
- Faster rendering
- Less memory usage

**Benefits:**
- Clearer separation of concerns
- Better performance
- Easier to understand

---

## Testing Your Migration

### Checklist

#### Basic Functionality
- [ ] Can edit text in markdown editor
- [ ] Preview updates in real-time
- [ ] Cursor detection works
- [ ] Properties panel shows correct element

#### Font Sizing
- [ ] Can change font sizes via properties panel
- [ ] Smart sizing recommendations appear
- [ ] UnoCSS presets work
- [ ] Changes apply to preview

#### Element Properties
- [ ] Heading level changes work
- [ ] Text formatting works (bold, italic, etc.)
- [ ] Text alignment works
- [ ] Text color changes work

#### Mermaid Diagrams
- [ ] Diagrams render correctly
- [ ] Scaling controls work
- [ ] Diagram info shows complexity
- [ ] Changes persist

#### General
- [ ] Zoom controls work
- [ ] Theme changes apply
- [ ] Layout changes apply
- [ ] Auto-save works
- [ ] Dark mode works

---

## Getting Help

### Documentation
- [Cleanup Plan](./SLIDES_EDITOR_CLEANUP_PLAN.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Cursor Detection](./CURSOR_DETECTION_FIX.md)

### Support Channels
- GitHub Issues: Report bugs or missing features
- Discussions: Ask questions about new workflow
- Documentation: Check for updates and tips

### Feedback
We want to hear from you!
- What's working well?
- What's missing?
- What could be better?

---

## FAQ

### Q: Why remove inline editing?

**A:** Inline editing created complexity:
- Duplicated markdown editor functionality
- Multiple ways to do the same thing (confusing)
- Hard to maintain (3 different editing systems)
- Performance overhead (unnecessary components)

The new workflow is:
- Simpler (one way to edit)
- Faster (keyboard-focused)
- More powerful (full markdown syntax)
- Easier to maintain (less code)

### Q: Can I still edit visually?

**A:** Yes! Use the properties panel:
1. Position cursor in markdown editor
2. Properties panel shows visual controls
3. Click buttons to apply styles
4. See changes in preview immediately

### Q: What if I find a bug?

**A:** Please report it!
1. Check if it's a known issue
2. Create GitHub issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if helpful

### Q: Will old presentations still work?

**A:** Yes! This is a UI change only:
- All existing presentations load normally
- No data migration needed
- Markdown format unchanged
- Themes and layouts preserved

### Q: Can I revert to the old version?

**A:** For 2 months (until March 2026):
- Deprecated components remain in codebase
- Can be re-enabled if critical issues found
- After March 2026, components will be removed

### Q: How do I report missing functionality?

**A:** Create a GitHub issue with:
- What you were trying to do
- How you did it before
- Why the new way doesn't work
- Suggested solution

---

## Timeline

| Date | Milestone |
|------|-----------|
| January 20, 2026 | Cleanup plan created |
| January 22, 2026 | Implementation begins |
| January 24, 2026 | Testing phase |
| January 27, 2026 | Documentation complete |
| January 30, 2026 | **Release v2.0** |
| March 30, 2026 | Deprecated components removed |

---

## Success Stories

### Before & After

**Before:**
- "I have to click around to find font sizing controls"
- "Multiple dialogs for the same thing"
- "Preview is cluttered with buttons"

**After:**
- "Everything I need is in the properties panel"
- "Cursor detection is magical!"
- "Preview is clean and fast"

---

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  
**Next Review:** February 2026
