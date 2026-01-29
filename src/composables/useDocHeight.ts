import { onMounted, onUnmounted, type Ref } from 'vue';
import type { Editor } from '@tiptap/core';

// A4 height in pixels (11.69 inches at 96 DPI) - matching DocExCore
const A4_HEIGHT_PX = Math.round(11.69 * 96);

/**
 * Simple throttle function to limit execution rate
 * Based on DocExCore implementation
 */
const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

/**
 * Simple document height management
 * Based on DocExCore's useDocHeight hook
 * 
 * Updates CSS variable --doc-height to ensure proper container sizing
 */
export function useDocHeight(editor: Ref<Editor | null>, pageGap: number) {
  const updateDocHeight = throttle(() => {
    if (!editor.value) return;
    
    try {
      // Round to prevent multiple pages (DocExCore approach)
      const docHeight = Math.round(editor.value.view.dom.scrollHeight);
      
      // Calculate the nearest ceiling number of A4 pages
      const pages = Math.ceil((docHeight + pageGap) / (A4_HEIGHT_PX + pageGap));
      
      // The new max height is the height of the editor + the height of the pages
      const minHeight = pages * A4_HEIGHT_PX + pages * pageGap - pageGap;
      
      // Update CSS var --doc-height with the new max height
      document.documentElement.style.setProperty("--doc-height", `${minHeight}px`);
    } catch (error) {
      console.warn('[useDocHeight] Failed to update document height:', error);
    }
  }, 200); // Same throttle as DocExCore

  let resizeObserver: ResizeObserver | null = null;
  let lastHeight = 0;

  onMounted(() => {
    if (!editor.value) return;
    
    // Initial calculation
    updateDocHeight();
    
    // Set up ResizeObserver to watch for changes in the editor DOM
    // More efficient than constant polling
    resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0) return;
      
      const newHeight = Math.floor(entries[0].contentRect.height);
      // Only update if height changed significantly (threshold to prevent jitter)
      if (Math.abs(newHeight - lastHeight) > 5) {
        lastHeight = newHeight;
        updateDocHeight();
      }
    });
    
    // Observe changes to the editor DOM
    resizeObserver.observe(editor.value.view.dom);
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  return {
    updateDocHeight,
    A4_HEIGHT_PX,
  };
}
