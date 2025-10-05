// vue.shim.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<{}, {}, any>
  export default component
}

// src/types/univerjs-vite-plugin.d.ts
declare module '@univerjs/vite-plugin' {
  // Re-export the actual types from the correct file
  export * from '@univerjs/vite-plugin/lib/types';
}

declare module '@/store/slides' {
  export * from './src/store/slides';
}
