import type { CSSProperties } from 'vue'

type VariantStateResolver = (direction?: number) => VariantState

type VariantState = {
  x?: number
  y?: number
  opacity?: number
  scale?: number
  rotate?: number
  rotateX?: number
  rotateY?: number
  rotateZ?: number
  width?: number | string
  height?: number | string
  transition?: {
    duration?: number
    delay?: number
    easing?: number[] | string
    property?: string
  }
}

export type SlideVariant = {
  enter: VariantState | VariantStateResolver
  center: VariantState | VariantStateResolver
  exit: VariantState | VariantStateResolver
}

export type ContentVariant = {
  hidden: VariantState
  visible: VariantState & {
    transition?: {
      duration?: number
      staggerChildren?: number
      delayChildren?: number
    }
  }
}

export type ItemVariant = {
  hidden: VariantState
  visible: VariantState
}

export type ProgressVariant = {
  hidden: VariantState
  visible: VariantState
}

function resolveState(state: VariantState | VariantStateResolver, direction?: number): VariantState {
  if (typeof state === 'function') {
    return state(direction)
  }
  return state
}

function buildTransform(state: VariantState): string {
  const transforms: string[] = []
  if (typeof state.x === 'number' || typeof state.y === 'number') {
    transforms.push(`translate(${state.x ?? 0}px, ${state.y ?? 0}px)`)
  }
  if (typeof state.scale === 'number') {
    transforms.push(`scale(${state.scale})`)
  }
  if (typeof state.rotate === 'number') {
    transforms.push(`rotate(${state.rotate}deg)`)
  }
  if (typeof state.rotateX === 'number') {
    transforms.push(`rotateX(${state.rotateX}deg)`)
  }
  if (typeof state.rotateY === 'number') {
    transforms.push(`rotateY(${state.rotateY}deg)`)
  }
  if (typeof state.rotateZ === 'number') {
    transforms.push(`rotateZ(${state.rotateZ}deg)`)
  }
  return transforms.join(' ') || 'none'
}

function buildTransition(state: VariantState): string | undefined {
  if (!state.transition) return undefined
  const { duration = 600, delay = 0, easing = [0.25, 0.46, 0.45, 0.94], property = 'all' } = state.transition
  const easingValue = Array.isArray(easing) ? `cubic-bezier(${easing.join(', ')})` : easing
  return `${property} ${duration}ms ${easingValue} ${delay}ms`
}

export function useVenmailMotion() {
  const slideVariants: Record<string, SlideVariant> = {
    venmail3d: {
      enter: (direction = 1) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.8,
        rotateY: direction > 0 ? 45 : -45
      }),
      center: {
        x: 0,
        opacity: 1,
        scale: 1,
        rotateY: 0,
        transition: {
          duration: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      },
      exit: (direction = -1) => ({
        x: direction < 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.8,
        rotateY: direction < 0 ? 45 : -45,
        transition: {
          duration: 500,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      })
    } satisfies SlideVariant,
    slideLeft: {
      enter: {
        x: 100,
        opacity: 0
      },
      center: {
        x: 0,
        opacity: 1,
        transition: {
          duration: 400,
          easing: 'ease-out'
        }
      },
      exit: {
        x: -100,
        opacity: 0,
        transition: {
          duration: 400,
          easing: 'ease-in'
        }
      }
    } satisfies SlideVariant,
    slideRight: {
      enter: {
        x: -100,
        opacity: 0
      },
      center: {
        x: 0,
        opacity: 1,
        transition: {
          duration: 400,
          easing: 'ease-out'
        }
      },
      exit: {
        x: 100,
        opacity: 0,
        transition: {
          duration: 400,
          easing: 'ease-in'
        }
      }
    } satisfies SlideVariant,
    slideUp: {
      enter: {
        y: 100,
        opacity: 0
      },
      center: {
        y: 0,
        opacity: 1,
        transition: {
          duration: 400,
          easing: 'ease-out'
        }
      },
      exit: {
        y: -100,
        opacity: 0,
        transition: {
          duration: 400,
          easing: 'ease-in'
        }
      }
    } satisfies SlideVariant,
    slideDown: {
      enter: {
        y: -100,
        opacity: 0
      },
      center: {
        y: 0,
        opacity: 1,
        transition: {
          duration: 400,
          easing: 'ease-out'
        }
      },
      exit: {
        y: 100,
        opacity: 0,
        transition: {
          duration: 400,
          easing: 'ease-in'
        }
      }
    } satisfies SlideVariant,
    fade: {
      enter: {
        opacity: 0
      },
      center: {
        opacity: 1,
        transition: {
          duration: 400,
          easing: 'ease-out'
        }
      },
      exit: {
        opacity: 0,
        transition: {
          duration: 400,
          easing: 'ease-in'
        }
      }
    } satisfies SlideVariant,
    zoom: {
      enter: {
        opacity: 0,
        scale: 0.8
      },
      center: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: 400,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      },
      exit: {
        opacity: 0,
        scale: 1.2,
        transition: {
          duration: 400,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      }
    } satisfies SlideVariant,
    rotateIn: {
      enter: {
        opacity: 0,
        rotate: -180,
        scale: 0.8
      },
      center: {
        opacity: 1,
        rotate: 0,
        scale: 1,
        transition: {
          duration: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      },
      exit: {
        opacity: 0,
        rotate: 180,
        scale: 0.8,
        transition: {
          duration: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      }
    } satisfies SlideVariant,
    flipIn: {
      enter: {
        opacity: 0,
        rotateX: -90,
        scale: 0.8
      },
      center: {
        opacity: 1,
        rotateX: 0,
        scale: 1,
        transition: {
          duration: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      },
      exit: {
        opacity: 0,
        rotateX: 90,
        scale: 0.8,
        transition: {
          duration: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      }
    } satisfies SlideVariant,
    bounceIn: {
      enter: {
        opacity: 0,
        scale: 0.3
      },
      center: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: 800,
          easing: [0.68, -0.55, 0.265, 1.55]
        }
      },
      exit: {
        opacity: 0,
        scale: 0.3,
        transition: {
          duration: 600,
          easing: [0.68, -0.55, 0.265, 1.55]
        }
      }
    } satisfies SlideVariant
  }

  // Content variants
  const contentVariants: Record<string, ContentVariant> = {
    default: {
      hidden: { opacity: 0, y: 30 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      }
    },
    staggered: {
      hidden: { opacity: 0, y: 30 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 800,
          staggerChildren: 0.2,
          delayChildren: 0.3
        }
      }
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          duration: 500,
          easing: 'ease-out'
        }
      }
    },
    slideUp: {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      }
    }
  }

  // Item variants
  const itemVariants: Record<string, ItemVariant> = {
    default: {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 500,
          easing: 'easeOut'
        }
      }
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          duration: 400,
          easing: 'ease-out'
        }
      }
    },
    slideLeft: {
      hidden: { opacity: 0, x: -20 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: 500,
          easing: 'ease-out'
        }
      }
    },
    slideRight: {
      hidden: { opacity: 0, x: 20 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: 500,
          easing: 'ease-out'
        }
      }
    },
    slideUp: {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 500,
          easing: 'ease-out'
        }
      }
    },
    slideDown: {
      hidden: { opacity: 0, y: -20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 500,
          easing: 'ease-out'
        }
      }
    },
    scale: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: 400,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      }
    }
  }

  // Progress variants
  const progressVariants: Record<string, ProgressVariant> = {
    default: {
      hidden: { width: 0, opacity: 0 },
      visible: {
        width: '100%',
        opacity: 1,
        transition: {
          duration: 800,
          easing: 'ease-in-out'
        }
      }
    },
    slideIn: {
      hidden: { width: 0, x: -20 },
      visible: {
        width: '100%',
        x: 0,
        transition: {
          duration: 600,
          easing: 'ease-out'
        }
      }
    },
    scaleIn: {
      hidden: { width: 0, opacity: 0, scale: 0.8 },
      visible: {
        width: '100%',
        opacity: 1,
        scale: 1,
        transition: {
          duration: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      }
    }
  }

  // Infinite animation variants
  const infiniteVariants = {
    pulse: {
      initial: { scale: 1, opacity: 1 },
      animate: { 
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1]
      },
      transition: {
        duration: 2000,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    rotate: {
      initial: { rotate: 0 },
      animate: { rotate: 360 },
      transition: {
        duration: 8000,
        repeat: Infinity,
        ease: 'linear'
      }
    },
    bounce: {
      initial: { y: 0 },
      animate: { y: [-10, 0, -10] },
      transition: {
        duration: 1000,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    float: {
      initial: { y: 0 },
      animate: { y: [0, -5, 0] },
      transition: {
        duration: 3000,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    glow: {
      initial: { opacity: 0.5 },
      animate: { opacity: [0.5, 1, 0.5] },
      transition: {
        duration: 2000,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    shake: {
      initial: { x: 0 },
      animate: { x: [-5, 5, -5, 5, 0] },
      transition: {
        duration: 500,
        repeat: Infinity,
      }
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          duration: 500,
          easing: 'ease-out'
        }
      }
    },
    progressScaleIn: {
      hidden: { width: 0, opacity: 0, scale: 0.8 },
      visible: {
        width: '100%',
        opacity: 1,
        scale: 1,
        transition: {
          duration: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        }
      }
    }
  }

  function resolveSlideStyle(variant: SlideVariant, phase: keyof SlideVariant, direction?: number): CSSProperties {
    const state = resolveState(variant[phase], direction)
    const style: CSSProperties = {
      transform: buildTransform(state),
      opacity: state.opacity ?? 1
    }
    if (state.width !== undefined) {
      style.width = typeof state.width === 'number' ? `${state.width}%` : state.width
    }
    if (state.height !== undefined) {
      style.height = typeof state.height === 'number' ? `${state.height}%` : state.height
    }
    const transition = buildTransition(state)
    if (transition) {
      style.transition = transition
    }
    return style
  }

  function resolveVariantStyle(variantState: VariantState, extraDelay = 0): CSSProperties {
    const style: CSSProperties = {
      transform: buildTransform(variantState),
      opacity: variantState.opacity ?? 1
    }
    if (variantState.width !== undefined) {
      style.width = typeof variantState.width === 'number' ? `${variantState.width}%` : variantState.width
    }
    if (variantState.height !== undefined) {
      style.height = typeof variantState.height === 'number' ? `${variantState.height}%` : variantState.height
    }
    const transition = buildTransition({
      ...variantState,
      transition: {
        ...variantState.transition,
        delay: (variantState.transition?.delay ?? 0) + extraDelay
      }
    })
    if (transition) {
      style.transition = transition
    }
    return style
  }

  return {
    slideVariants,
    contentVariants,
    itemVariants,
    progressVariants,
    infiniteVariants,
    resolveSlideStyle,
    resolveVariantStyle
  }
}
