// Centralized sharing types and helpers aligned with backend

export type ShareLevel = 'v' | 'c' | 'e'

export type ShareMember = {
  email: string
  name?: string
  avatarUrl?: string
  shareLevel: ShareLevel
  status?: 'accepted' | 'pending' | 'declined'
  domain?: string
  isOwner?: boolean
}

// Backend privacy types
export const PrivacyType = {
  EveryoneView: 1,
  EveryoneEdit: 2,
  LinkView: 3,
  LinkEdit: 4,
  OrgView: 5,
  OrgEdit: 6,
  Explicit: 7,
} as const
export type PrivacyTypeValue = typeof PrivacyType[keyof typeof PrivacyType]

export type ShareLevelLabel = 'view' | 'comment' | 'edit'

export function shareLevelToLabel(level: ShareLevel): ShareLevelLabel {
  switch (level) {
    case 'e':
      return 'edit'
    case 'c':
      return 'comment'
    default:
      return 'view'
  }
}

export function labelToShareLevel(label: ShareLevelLabel): ShareLevel {
  switch (label) {
    case 'edit':
      return 'e'
    case 'comment':
      return 'c'
    default:
      return 'v'
  }
}

export function parseSharingInfoString(sharingInfo?: string | null): ShareMember[] {
  if (!sharingInfo) return []
  return sharingInfo
    .split(',')
    .map((entry) => {
      const [email, level] = entry.split(':')
      const shareLevel = ((level || 'v').trim() as ShareLevel)
      return { email: email.trim(), shareLevel }
    })
    .filter((m) => m.email)
}

export function serializeSharingInfoString(members: ShareMember[]): string {
  return members.map((m) => `${m.email}:${m.shareLevel}`).join(',')
}

export function resolveScopeFromPrivacy(type: number): 'restricted' | 'organization' | 'link' | 'public' {
  switch (type) {
    case PrivacyType.EveryoneView:
    case PrivacyType.EveryoneEdit:
      return 'public'
    case PrivacyType.LinkView:
    case PrivacyType.LinkEdit:
      return 'link'
    case PrivacyType.OrgView:
    case PrivacyType.OrgEdit:
      return 'organization'
    case PrivacyType.Explicit:
    default:
      return 'restricted'
  }
}

export function resolveLevelFromPrivacy(type: number): 'view' | 'edit' {
  switch (type) {
    case PrivacyType.EveryoneEdit:
    case PrivacyType.LinkEdit:
    case PrivacyType.OrgEdit:
      return 'edit'
    default:
      return 'view'
  }
}

export function getPrivacyTypeFor(
  scope: 'restricted' | 'organization' | 'link' | 'public',
  level: 'view' | 'edit'
): PrivacyTypeValue | null {
  switch (scope) {
    case 'restricted':
      return PrivacyType.Explicit
    case 'organization':
      return level === 'edit' ? PrivacyType.OrgEdit : PrivacyType.OrgView
    case 'link':
      return level === 'edit' ? PrivacyType.LinkEdit : PrivacyType.LinkView
    case 'public':
      return level === 'edit' ? PrivacyType.EveryoneEdit : PrivacyType.EveryoneView
    default:
      return null
  }
}
