# Deprecated Slide Components

**Deprecation Date:** January 2026  
**Removal Date:** March 2026

## Components

- FontSizeAdjuster.vue
- SmartFontSizeAdjuster.vue
- ResponsiveSlideContainer.vue
- InlineEditor.vue
- SlidesPropertiesPanel.vue (if unused)

## Reason

Functionality consolidated into DynamicPropertiesPanel and markdown editor.

## Migration

See: [Migration Guide](../../../docs/SLIDES_EDITOR_MIGRATION_GUIDE.md)

## Usage

These components are no longer maintained and will be removed in March 2026.
Please update your code to use the new architecture:

- Font sizing: Use DynamicPropertiesPanel (right sidebar)
- Element editing: Use markdown editor with cursor detection
- Properties: Use DynamicPropertiesPanel for all element properties
