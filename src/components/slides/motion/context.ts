import type { Ref } from 'vue'

export interface StaggerConfig {
  delayChildren: number
  staggerChildren: number
}

export type StaggerContextRef = Ref<StaggerConfig | null>

export const VenmailStaggerContext = Symbol('venmail-stagger-context')

export const defaultStaggerConfig: StaggerConfig = {
  delayChildren: 0,
  staggerChildren: 0
}
