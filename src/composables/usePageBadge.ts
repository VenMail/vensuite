import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

// A4 height in pixels (11.69 inches at 96 DPI)
const A4_HEIGHT_PX = Math.round(11.69 * 96);

interface UsePageBadgeOptions {
  pageGap: number;
  topOffsetPx?: number;
  rightNudgePx?: number;
  label?: string;
  href?: string;
  firstPageExtraTopPx?: number;
}

export function usePageBadge(options: UsePageBadgeOptions) {
  const container = ref<HTMLElement | null>(null);
  const pageCount = ref(1);
  let resizeObserver: ResizeObserver | null = null;

  // Compute host from href safely
  const linkTitle = computed(() => {
    if (!options.href) return '';
    try {
      return new URL(options.href).host;
    } catch {
      return options.href;
    }
  });

  // Calculate page count based on content height
  const calculatePageCount = () => {
    if (!container.value) return;
    
    const contentHeight = container.value.scrollHeight;
    const pages = Math.max(
      1,
      Math.ceil((contentHeight + options.pageGap) / (A4_HEIGHT_PX + options.pageGap))
    );
    pageCount.value = pages;
  };

  // Style for individual badge overlay
  const badgeStyle = (pageIndex: number) => {
    const top = pageIndex * (A4_HEIGHT_PX + options.pageGap) +
                (options.topOffsetPx || 12) +
                (pageIndex === 0 ? (options.firstPageExtraTopPx || 32) : 0);
    
    return {
      position: 'absolute' as const,
      zIndex: 50,
      // Align horizontally with the white page area inside wrapper padding
      left: 'var(--editor-padding, 72px)',
      top: `${top}px`,
      width: 'calc(100% - var(--editor-padding, 72px) * 2)',
      pointerEvents: 'none' as const,
    };
  };

  // Style for the link/text element
  const linkStyle = computed(() => ({
    fontSize: '12px',
    color: '#6b7280',
    textDecoration: 'none' as const,
    background: 'rgba(255,255,255,0.9)',
    border: '1px solid #e6eaf2',
    borderRadius: '8px',
    padding: '2px 6px',
    pointerEvents: 'auto' as const,
    marginRight: `${options.rightNudgePx || 12}px`,
  }));

  // Find and set container reference
  const setupContainer = () => {
    const wrapper = document.querySelector('.editor-wrapper, .with-pagination') as HTMLElement | null;
    if (!wrapper) return;
    
    container.value = wrapper;
    
    // Calculate initial page count
    calculatePageCount();
    
    // Set up ResizeObserver to track content changes
    resizeObserver = new ResizeObserver(calculatePageCount);
    resizeObserver.observe(wrapper);
  };

  // Clean up observer
  const cleanup = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  };

  // Watch for pageGap changes
  watch(() => options.pageGap, calculatePageCount);

  onMounted(setupContainer);
  onUnmounted(cleanup);

  return {
    container,
    pageCount,
    linkTitle,
    badgeStyle,
    linkStyle,
  };
}
