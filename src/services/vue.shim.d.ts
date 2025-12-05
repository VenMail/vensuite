// vue-shims.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<{}, {}, any>
  export default component
}
/// <reference types="vite/client" />
/// <reference types="@univerjs/vite-plugin/types" />

import 'vue'

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: (key: string, ...args: any[]) => string
  }
}
