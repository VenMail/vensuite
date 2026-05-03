import { computed, ref } from 'vue'
import { useAuthStore } from '@/store/auth'

// Backend privacy types aligned with sharing system
export const PrivacyType = {
  EveryoneView: 1,    // Anyone can view
  EveryoneEdit: 2,    // Anyone can edit
  LinkView: 3,        // Anyone with link can view
  LinkEdit: 4,        // Anyone with link can edit
  OrgView: 5,         // Organization members can view
  OrgEdit: 6,         // Organization members can edit
  Explicit: 7,        // Only invited members
} as const

export type PrivacyTypeValue = typeof PrivacyType[keyof typeof PrivacyType]

export interface PrivacyCheckOptions {
  /** The document/sheet/slide ID */
  documentId: string | null | undefined
  /** The privacy type (1-7) */
  privacyType: PrivacyTypeValue | number
  /** Whether the document is new/unsaved */
  isNew?: boolean
}

export interface PrivacyCheckResult {
  /** Can user join real-time collaboration */
  canJoinRealtime: boolean
  /** Can user edit the document */
  canEdit: boolean
  /** Can user view the document */
  canView: boolean
  /** Is access denied for this user */
  accessDenied: boolean
  /** Guest-accessible privacy types */
  guestAccessibleTypes: Set<number>
  /** Current privacy type name */
  privacyTypeName: string
}

/**
 * Shared composable for unified privacy and access control
 * Used across DocsEditor, SheetEditor, and SlidesEditor
 */
export function usePrivacyCheck(options: PrivacyCheckOptions) {
  const authStore = useAuthStore()

  // Guest-accessible privacy types (allows unauthenticated access)
  const guestAccessibleTypes = new Set<number>([
    PrivacyType.EveryoneView,
    PrivacyType.EveryoneEdit,
    PrivacyType.LinkView,
    PrivacyType.LinkEdit,
  ])

  // Types that allow editing for guests
  const guestEditableTypes = new Set<number>([
    PrivacyType.EveryoneEdit,
    PrivacyType.LinkEdit,
  ])

  // Types that require organization membership
  const orgRequiredTypes = new Set<number>([
    PrivacyType.OrgView,
    PrivacyType.OrgEdit,
  ])

  const privacyTypeName = computed(() => {
    switch (options.privacyType) {
      case PrivacyType.EveryoneView: return 'Public (View only)'
      case PrivacyType.EveryoneEdit: return 'Public (Anyone can edit)'
      case PrivacyType.LinkView: return 'Link sharing (View)'
      case PrivacyType.LinkEdit: return 'Link sharing (Edit)'
      case PrivacyType.OrgView: return 'Organization (View)'
      case PrivacyType.OrgEdit: return 'Organization (Edit)'
      case PrivacyType.Explicit: return 'Private'
      default: return 'Unknown'
    }
  })

  /**
   * Can join real-time collaboration session
   * - Requires a saved document (not 'new')
   * - Authenticated users can always join if privacy allows
   * - Guests can join if privacy type is in guestAccessibleTypes
   * - Private (7) blocks all realtime
   */
  const canJoinRealtime = computed(() => {
    // Can't join without a document ID or if it's new
    if (!options.documentId || options.documentId === 'new' || options.isNew) {
      return false
    }

    // Private documents block realtime
    if (options.privacyType === PrivacyType.Explicit) {
      return false
    }

    // Authenticated users can join non-private documents
    if (authStore.isAuthenticated) {
      return true
    }

    // Guests can join if privacy type allows it
    return guestAccessibleTypes.has(options.privacyType)
  })

  /**
   * Can edit the document
   * - Requires authentication for most privacy types
   * - Guests can only edit if privacy type is EveryoneEdit or LinkEdit
   * - Private documents require explicit invitation
   */
  const canEdit = computed(() => {
    // Must have a document to edit
    if (!options.documentId || options.documentId === 'new') {
      return true // New documents are editable
    }

    // Check if authenticated
    if (authStore.isAuthenticated) {
      // For private documents, need to be invited
      if (options.privacyType === PrivacyType.Explicit) {
        return false // Will be determined by member check
      }

      // Organization documents need org membership
      if (orgRequiredTypes.has(options.privacyType)) {
        return options.privacyType === PrivacyType.OrgEdit
      }

      // Everyone can edit if privacy allows
      return options.privacyType !== PrivacyType.EveryoneView &&
             options.privacyType !== PrivacyType.LinkView
    }

    // Guest editing only on specific types
    return guestEditableTypes.has(options.privacyType)
  })

  /**
   * Can view the document
   * - Most privacy types allow viewing
   * - Private documents require authentication + invitation
   */
  const canView = computed(() => {
    if (!options.documentId) return false

    // Public and link-sharing allow viewing
    if (guestAccessibleTypes.has(options.privacyType) ||
        orgRequiredTypes.has(options.privacyType)) {
      return true
    }

    // Private requires authentication
    if (options.privacyType === PrivacyType.Explicit) {
      return authStore.isAuthenticated
    }

    return false
  })

  /**
   * Access is denied
   * - Private documents for unauthenticated users
   * - Documents without proper ID
   */
  const accessDenied = computed(() => {
    if (!options.documentId || options.documentId === 'new') {
      return false // New docs are never denied
    }

    // Private docs deny access to guests
    if (options.privacyType === PrivacyType.Explicit && !authStore.isAuthenticated) {
      return true
    }

    return false
  })

  return {
    // Computed checks
    canJoinRealtime,
    canEdit,
    canView,
    accessDenied,

    // Constants
    guestAccessibleTypes,
    guestEditableTypes,
    orgRequiredTypes,

    // Helpers
    privacyTypeName,
  }
}

/**
 * Hook for checking member permissions
 */
export function useMemberPermission(
  members: { email: string; shareLevel: 'v' | 'c' | 'e' }[],
  userEmail?: string
) {
  const authStore = useAuthStore()
  const currentUserEmail = userEmail || authStore.email

  const isMember = computed(() => {
    if (!currentUserEmail) return false
    return members.some(m => m.email === currentUserEmail)
  })

  const memberLevel = computed(() => {
    if (!currentUserEmail) return null
    const member = members.find(m => m.email === currentUserEmail)
    return member?.shareLevel || null
  })

  const canViewAsMember = computed(() => {
    return isMember.value // Any member can view
  })

  const canEditAsMember = computed(() => {
    return memberLevel.value === 'e' // Only 'e' (edit) level can edit
  })

  const canCommentAsMember = computed(() => {
    return memberLevel.value === 'c' || memberLevel.value === 'e' // 'c' or 'e' can comment
  })

  return {
    isMember,
    memberLevel,
    canViewAsMember,
    canEditAsMember,
    canCommentAsMember,
  }
}

export default usePrivacyCheck
