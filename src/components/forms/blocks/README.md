# Form Block Editor

A modern, Notion-style block editor for building forms with an intuitive drag-and-drop interface and slash commands.

## Features

### 🎯 Notion-Style Interface
- Clean, minimal design that focuses on content
- Inline editing with instant feedback
- Smooth animations and transitions
- Dark mode support throughout

### ⚡ Slash Commands
- Type `/` to open the command menu
- Search and filter block types instantly
- Keyboard navigation (↑↓ arrows, Enter to select, Esc to close)
- Quick insertion of any question type

### 🎨 Block Types Supported
- **Text Inputs**: Short text, long text, email, phone
- **Date/Time**: Date picker, time picker
- **Choices**: Multiple choice (radio), checkboxes, dropdown
- **Rating**: Star ratings, sliders
- **File Upload**: Single or multiple file uploads
- **Yes/No**: Binary choice toggle

### 🔄 Drag & Drop
- Reorder blocks by dragging the handle
- Visual feedback during drag operations
- Smooth reordering animations

### ⌨️ Keyboard Shortcuts
- `Enter` - Create new block below
- `Backspace` (on empty question) - Delete block
- `/` - Open slash command menu
- `Esc` - Close menus and deselect

### 🎛️ Block Controls
- **Change Type**: Click "Change type" to switch question types
- **Required Toggle**: Mark questions as required/optional
- **Options Management**: Add/remove options for choice-based questions
- **Move Up/Down**: Reorder with arrow buttons
- **Delete**: Remove blocks with confirmation

## Components

### BlockEditor.vue
Main container component that manages the form structure and block list.

**Props:**
- `initialBlocks` - Array of form blocks to display
- `initialTitle` - Form title
- `initialDescription` - Form description

**Events:**
- `update:blocks` - Emitted when blocks change
- `update:title` - Emitted when title changes
- `update:description` - Emitted when description changes

### BlockItem.vue
Individual block component with editing capabilities.

**Features:**
- Inline question editing
- Type-specific preview
- Drag handle for reordering
- Action buttons (move, delete)
- Options management for choice blocks

### SlashMenu.vue
Command palette for quick block insertion.

**Features:**
- Fuzzy search filtering
- Keyboard navigation
- Icon-based visual identification
- Category-based organization

### TypeChangeMenu.vue
Dropdown menu for changing block types.

**Features:**
- Shows all available block types
- Highlights current type
- Quick type switching
- Preserves block data where possible

### BlockEditorWrapper.vue
Integration wrapper that converts between FormQuestion and FormBlock formats.

**Purpose:**
- Bridges the new block editor with existing form store
- Handles data transformation
- Manages bidirectional sync

## Usage

```vue
<template>
  <BlockEditor
    :initial-blocks="blocks"
    :initial-title="formTitle"
    :initial-description="formDescription"
    @update:blocks="handleBlocksUpdate"
    @update:title="handleTitleUpdate"
    @update:description="handleDescriptionUpdate"
  />
</template>

<script setup>
import BlockEditor from '@/components/forms/blocks/BlockEditor.vue';
import { ref } from 'vue';

const blocks = ref([]);
const formTitle = ref('My Form');
const formDescription = ref('Form description');

const handleBlocksUpdate = (updatedBlocks) => {
  blocks.value = updatedBlocks;
  // Save to backend
};

const handleTitleUpdate = (title) => {
  formTitle.value = title;
};

const handleDescriptionUpdate = (description) => {
  formDescription.value = description;
};
</script>
```

## Styling

The block editor uses Tailwind CSS with dark mode support:

- **Light Mode**: Clean white backgrounds with subtle borders
- **Dark Mode**: Dark gray backgrounds with blue accents
- **Hover States**: Smooth transitions on all interactive elements
- **Focus States**: Blue ring indicators for accessibility

All components follow the app's existing design system using `dark:` prefixed classes.

## Integration with FormBuilder

The block editor is integrated into the main FormBuilder view:

1. **Canvas Area**: Replaces the placeholder canvas with the block editor
2. **Data Sync**: BlockEditorWrapper handles conversion between formats
3. **Autosave**: Changes trigger the existing autosave mechanism
4. **Store Integration**: Updates flow through the formEditor store

## Future Enhancements

Potential improvements:
- [ ] Block templates and presets
- [ ] Conditional logic visual builder
- [ ] Bulk operations (duplicate, delete multiple)
- [ ] Block grouping and sections
- [ ] Undo/redo functionality
- [ ] Collaborative editing indicators
- [ ] Import/export block configurations
- [ ] Custom block types via plugins

## Technical Notes

### Data Structure
```typescript
interface FormBlock {
  id: string;
  type: BlockType;
  category: BlockCategory;
  question: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}
```

### Performance
- Uses Vue 3 Composition API for optimal reactivity
- TransitionGroup for smooth list animations
- Debounced updates to prevent excessive re-renders
- Lazy loading of menu components

### Accessibility
- Keyboard navigation throughout
- ARIA labels on interactive elements
- Focus management for modals and menus
- Screen reader friendly structure
