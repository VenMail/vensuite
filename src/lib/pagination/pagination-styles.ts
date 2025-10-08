/* Tiptap Pagination Manager Styles */
export const paginationStyles = `
.pagination-wrapper {
  position: relative;
  background: #f5f5f5;
  padding: 20px;
  min-height: 100vh;
  transition: background-color 0.3s ease;
}

.pagination-enabled {
  background: #e9ecef !important;
}

.pagination-mode {
  background: white !important;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.08) !important;
  margin: 0 auto !important;
  position: relative;
  z-index: 1; /* Keep editor beneath overlay visuals */
  border-radius: 4px;
  transition: all 0.3s ease;
}

/* Page indicators */
.pagination-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none; /* Allow editor interactions through overlay */
  z-index: 100; /* Ensure overlay visuals render above editor */
}

.page-indicator {
  background: transparent; /* Fully transparent - no overlay on content */
  border: 1px solid rgba(224, 224, 224, 0.5);
  box-shadow: none; /* Remove shadow to avoid dimming effect */
  margin-top: 3px;
  pointer-events: none;
}

.page-indicator:first-child, .page-indicator:last-child,
.pagination-overlay:first-child, .pagination-overlay:last-child {
  border: none!important;
  border-width: 0!important;
  box-shadow: none!important;
}

.page-number {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(221, 221, 221, 0.95);
  border-radius: 3px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

/* Masks to hide non-visible pages (Google Docs-like view) */
.pagination-mask {
  background: #f5f5f5; /* Match wrapper background to hide content outside visible pages */
}

/* Print styles - CRITICAL for actual printing */
@media print {
  .pagination-wrapper {
    background: white !important;
    padding: 0 !important;
    min-height: auto !important;
  }

  /* Keep page indicators and numbers visible in print */
  .pagination-overlay {
    display: block !important;
  }

  .page-indicator {
    display: block !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  .page-number {
    display: none !important;
    background: white !important;
    border: 1px solid #ddd !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .page-number.page-number--print-visible {
    display: block !important;
  }

  /* Hide masks in print */
  .pagination-mask {
    display: none !important;
  }

  .pagination-mode {
    background: white !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
    min-height: auto !important;
  }

  /* Smart page breaks for print */
  h1, h2, h3 {
    break-after: avoid;
  }

  table, figure, pre, code, blockquote {
    break-inside: avoid;
  }

  img {
    max-height: 9in !important;
    break-inside: avoid;
  }

  /* Page margins for print */
  @page {
    margin: 1cm;
    size: auto;
  }

  @page :first {
    margin-top: 2cm;
  }
}

/* Responsive design */
@media (max-width: 900px) {
  .pagination-wrapper {
    padding: 10px;
  }

  .pagination-mode {
    margin: 10px !important;
    max-width: calc(100% - 20px) !important;
  }
}

/* Animation for page calculations */
.pagination-calculating .page-indicator {
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .page-indicator {
    border-color: #000;
  }

  .page-number {
    border-color: #000;
    color: #000;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .pagination-wrapper,
  .pagination-mode {
    transition: none;
  }
}
`;
