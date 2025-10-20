<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import Button from '@/components/ui/button/Button.vue'

type Member = {
  email: string
  name?: string
  avatarUrl?: string
  permission: 'view' | 'comment' | 'edit' | 'owner'
  status?: 'accepted' | 'pending' | 'declined'
  domain?: string
}

type GeneralPermission = 'restricted' | 'organization' | 'link' | 'public'
type PermissionLevel = 'view' | 'comment' | 'edit'

const INVITE_PERMISSION_CODES: Record<PermissionLevel, 'v' | 'c' | 'e'> = {
  view: 'v',
  comment: 'c',
  edit: 'e',
}

const props = defineProps<{
  mode?: 'doc' | 'sheet'
  shareLink: string
  privacyType: number // 1=everyone_view,2=everyone_edit,3=link_view,4=link_edit,5=org_view,6=org_edit,7=explicit
  members?: Member[]
  canEditPrivacy?: boolean
  owner?: Member
  organizationDomain?: string
  documentTitle?: string
  fileId?: string
  // Permission settings
  allowEditorsToChangePermissions?: boolean
  allowEditorsToDownload?: boolean
  allowCommentersToDownload?: boolean
}>()

const emit = defineEmits<{
  (e: 'copy-link'): void
  (e: 'change-privacy', value: number): void
  (e: 'update-member', payload: { email: string; permission: Member['permission'] }): void
  (e: 'remove-member', payload: { email: string }): void
  (e: 'invite', payload: { email: string; permission: Member['permission']; note?: string }): void
  (e: 'done'): void
  (e: 'settings'): void
  (e: 'help'): void
  (e: 'close'): void
  // New permission settings events
  (e: 'update-permission-settings', payload: {
    allowEditorsToChangePermissions: boolean
    allowEditorsToDownload: boolean
    allowCommentersToDownload: boolean
  }): void
}>()

// Permission helpers
const DEFAULT_LEVEL_BY_SCOPE: Record<GeneralPermission, PermissionLevel> = {
  restricted: 'view',
  organization: 'view',
  link: 'view',
  public: 'view',
}

const PERMISSION_ACTION_VERB: Record<PermissionLevel, string> = {
  view: 'view',
  comment: 'comment',
  edit: 'edit',
}

const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  view: 'Viewer',
  comment: 'Commenter',
  edit: 'Editor',
}

function resolveScopeFromPrivacy(type: number): GeneralPermission {
  switch (type) {
    case 1:
    case 2:
      return 'public'
    case 3:
    case 4:
      return 'link'
    case 5:
    case 6:
      return 'organization'
    case 7:
    default:
      return 'restricted'
  }
}

function resolveLevelFromPrivacy(type: number): PermissionLevel {
  switch (type) {
    case 2:
    case 4:
    case 6:
      return 'edit'
    default:
      return 'view'
  }
}

function getPrivacyTypeFor(scope: GeneralPermission, level: PermissionLevel): number | null {
  switch (scope) {
    case 'restricted':
      return 7
    case 'organization':
      if (level === 'edit') return 6
      return 5
    case 'link':
      if (level === 'edit') return 4
      return 3
    case 'public':
      if (level === 'edit') return 2
      return 1
    default:
      return null
  }
}

// Current page state
const currentPage = ref<'main' | 'invite' | 'settings'>('main')

// General permission dropdown state
const showGeneralPermissionDropdown = ref(false)

// Form states for invite page
const inviteEmails = ref<{ email: string; permission: Member['permission'] }[]>([])
const newInviteEmail = ref('')
const inviteNote = ref('')

// Settings form state
const settingsForm = ref({
  allowEditorsToChangePermissions: props.allowEditorsToChangePermissions ?? false,
  allowEditorsToDownload: props.allowEditorsToDownload ?? true,
  allowCommentersToDownload: props.allowCommentersToDownload ?? true
})

const generalPermission = computed({
  get(): GeneralPermission {
    return resolveScopeFromPrivacy(props.privacyType)
  },
  set(value: GeneralPermission) {
    const defaultLevel = DEFAULT_LEVEL_BY_SCOPE[value]
    const targetType = getPrivacyTypeFor(value, defaultLevel)
    if (targetType !== null) {
      emit('change-privacy', targetType)
    }
    showGeneralPermissionDropdown.value = false
  }
})

const generalPermissionLevel = computed<PermissionLevel>(() => {
  return resolveLevelFromPrivacy(props.privacyType)
})

const availableLevels = computed<PermissionLevel[]>(() => {
  const scope = generalPermission.value
  switch (scope) {
    case 'restricted':
      return []
    case 'organization':
      return ['view', 'edit']
    case 'link':
    case 'public':
      return ['view', 'edit']
    default:
      return []
  }
})

const restrictedHelpText = computed(() => {
  const docWord = props.mode === 'sheet' ? 'sheet' : 'document'
  return `Add people below to share this ${docWord}.`
})

const generalPermissionDescription = computed<string>(() => {
  switch (generalPermission.value) {
    case 'restricted':
      return restrictedHelpText.value
    case 'organization':
      return `People in ${props.organizationDomain || 'your organization'} will see this in search results.`
    case 'link':
      return 'Share the link with anyone to give them access.'
    case 'public':
      return 'This may appear in search results and be visible to anyone.'
    default:
      return restrictedHelpText.value
  }
})

function permissionLevelLabel(level: PermissionLevel): string {
  return PERMISSION_LABELS[level]
}

function handleGeneralPermissionLevelChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as PermissionLevel
  const targetType = getPrivacyTypeFor(generalPermission.value, value)
  if (targetType !== null) {
    emit('change-privacy', targetType)
  }
}

function onClickOutside(event: MouseEvent) {
  if (!showGeneralPermissionDropdown.value) return
  if (!(event.target instanceof HTMLElement)) return
  const dropdown = dropdownRef.value
  if (!dropdown) return
  if (!dropdown.contains(event.target)) {
    showGeneralPermissionDropdown.value = false
  }
}

const dropdownRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})

// Watch for prop changes to update settings form
watch(() => [props.allowEditorsToChangePermissions, props.allowEditorsToDownload, props.allowCommentersToDownload], () => {
  settingsForm.value = {
    allowEditorsToChangePermissions: props.allowEditorsToChangePermissions ?? false,
    allowEditorsToDownload: props.allowEditorsToDownload ?? true,
    allowCommentersToDownload: props.allowCommentersToDownload ?? true
  }
}, { immediate: true })

// Get document display title
const documentDisplayTitle = computed(() => {
  return props.documentTitle || (props.mode === 'sheet' ? 'Sheet' : 'Document')
})

// Get all members including owner
const allMembers = computed(() => {
  const members = props.members || []
  const owner = props.owner
  if (!owner) return members
  
  // Check if owner is already in members list
  const ownerInMembers = members.find(m => m.email === owner.email)
  if (ownerInMembers) return members
  
  return [owner, ...members]
})

// Separate owner and other members
const ownerMember = computed(() => {
  return props.owner || allMembers.value.find(m => m.permission === 'owner')
})

const otherMembers = computed(() => {
  const owner = ownerMember.value
  if (!owner) return allMembers.value
  return allMembers.value.filter(m => m.email !== owner.email)
})

const privacySummary = computed(() => {
  const scope = generalPermission.value
  const level = generalPermissionLevel.value
  const action = PERMISSION_ACTION_VERB[level]
  const docWord = props.mode === 'sheet' ? 'sheet' : 'document'

  switch (scope) {
    case 'restricted':
      return `Only people explicitly added can access this ${docWord}.`
    case 'organization':
      return `${props.organizationDomain || 'People in your organization'} can ${action} this ${docWord}.`
    case 'link':
      return `Anyone with the link can ${action} this ${docWord}.`
    case 'public':
      return `Anyone on the internet can ${action} this ${docWord}.`
    default:
      return `Only people explicitly added can access this ${docWord}.`
  }
})

// FIXED: Add privacy type 8 handling
// const privacyLabel = computed(() => {
//   switch (props.privacyType) {
//     case 1: return 'Anyone on the internet (view)'
//     case 2: return 'Anyone on the internet (edit)'
//     case 3: return 'Anyone with the link (view)'
//     case 4: return 'Anyone with the link (edit)'
//     case 5: return 'Your organization (view)'
//     case 6: return 'Your organization (edit)'
//     case 7: return 'Restricted (specific people)'
//     case 8: return 'Your organization (comment)'
//     default: return 'Restricted'
//   }
// })

// Permission labels for dropdown
const getPermissionLabel = (permission: GeneralPermission): string => {
  switch (permission) {
    case 'restricted':
      return 'Restricted'
    case 'organization':
      return props.organizationDomain || 'Your organization'
    case 'link':
      return 'Anyone with the link'
    case 'public':
      return 'Anyone on the internet'
    default:
      return 'Restricted'
  }
}

// Navigation functions
function goBackToMain() {
  currentPage.value = 'main'
  // Reset invite form
  inviteEmails.value = []
  newInviteEmail.value = ''
  inviteNote.value = ''
}

function openInvitePage() {
  currentPage.value = 'invite'
}

function openSettingsPage() {
  currentPage.value = 'settings'
}

function saveSettings() {
  emit('update-permission-settings', {
    allowEditorsToChangePermissions: settingsForm.value.allowEditorsToChangePermissions,
    allowEditorsToDownload: settingsForm.value.allowEditorsToDownload,
    allowCommentersToDownload: settingsForm.value.allowCommentersToDownload
  })
  currentPage.value = 'main'
}

function addInvitee() {
  const email = newInviteEmail.value.trim()
  if (email && !inviteEmails.value.find(inv => inv.email === email)) {
    inviteEmails.value.push({
      email: email,
      permission: 'view' // Default to viewer
    })
    newInviteEmail.value = ''
  }
}

function removeInvitee(index: number) {
  inviteEmails.value.splice(index, 1)
}

function updateInviteePermission(index: number, permission: Member['permission']) {
  if (inviteEmails.value[index]) {
    inviteEmails.value[index].permission = permission
  }
}

// FIXED: Use correct event emission and maintain full permission names
function sendInvites() {
  inviteEmails.value.forEach(invitee => {
    emit('invite', {
      email: invitee.email,
      permission: invitee.permission,
      code: INVITE_PERMISSION_CODES[invitee.permission],
      note: inviteNote.value.trim() || undefined
    })
  })

  // Return to main page
  goBackToMain()
}

function updateMember(email: string, perm: Member['permission']) {
  emit('update-member', { email, permission: perm })
}

function removeMember(email: string) {
  emit('remove-member', { email })
}

function copyLink() {
  emit('copy-link')
}

// FIXED: Just close the modal with debugging
function handleDone() {
  console.log('Done button clicked - emitting close event')
  emit('close')
}

function handleSettings() {
  openSettingsPage()
}

function handleHelp() {
  // Open help in a new tab/window
  window.open('/support', '_blank')
}

// Get status badge color
function getStatusColor(status?: string) {
  switch (status) {
    case 'accepted': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'pending': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    case 'declined': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
    default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
  }
}
</script>

<template>
  <div class="w-full max-w-2xl">
    <!-- Main Page -->
    <div v-if="currentPage === 'main'" class="space-y-6">
      <!-- Header with Title and Icons -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Share "{{ documentDisplayTitle }}"</h3>
        <div class="flex items-center gap-2">
          <button
            @click="handleSettings"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Settings"
          >
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            @click="handleHelp"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Help"
          >
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
        {{ privacySummary }}
      </p>

      <!-- Owner and People with Access Section -->
      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">People with access</h4>
        
        <!-- Owner -->
        <div v-if="ownerMember" class="mb-3">
          <div class="flex items-center gap-3 py-2">
            <div class="w-10 h-10 rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 flex items-center justify-center overflow-hidden">
              <img v-if="ownerMember.avatarUrl" :src="ownerMember.avatarUrl" class="w-full h-full object-cover" alt="" />
              <span v-else class="text-sm font-semibold">{{ (ownerMember.name || ownerMember.email).charAt(0).toUpperCase() }}</span>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ ownerMember.name || ownerMember.email }} (you)</p>
              <p class="text-xs text-gray-600 dark:text-gray-400" v-if="ownerMember.name">{{ ownerMember.email }}</p>
            </div>
            <span class="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Owner</span>
          </div>
        </div>

        <!-- Other Members -->
        <div v-if="otherMembers.length > 0" class="space-y-2">
          <div v-for="member in otherMembers" :key="member.email" class="flex items-center justify-between py-2">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-8 h-8 rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 flex items-center justify-center overflow-hidden">
                <img v-if="member.avatarUrl" :src="member.avatarUrl" class="w-full h-full object-cover" alt="" />
                <span v-else class="text-xs font-semibold">{{ (member.name || member.email).charAt(0).toUpperCase() }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ member.name || member.email }}</p>
                  <span v-if="member.status" :class="getStatusColor(member.status)" class="text-xs px-2 py-0.5 rounded-full">
                    {{ member.status }}
                  </span>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 truncate" v-if="member.name">{{ member.email }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 ml-4">
              <select
                :value="member.permission"
                @change="updateMember(member.email, ($event.target as HTMLSelectElement).value as any)"
                class="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="view">Viewer</option>
                <option value="comment">Commenter</option>
                <option value="edit">Editor</option>
              </select>
              <button
                class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                @click="removeMember(member.email)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- General Permissions -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">General permissions</h4>
        
        <div class="flex items-center gap-3">
          <div class="relative flex-1" ref="dropdownRef">
            <button
              @click="showGeneralPermissionDropdown = !showGeneralPermissionDropdown"
              class="w-full flex items-center justify-between p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-left"
            >
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ getPermissionLabel(generalPermission) }}
              </span>
              <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <div v-if="showGeneralPermissionDropdown" class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-10">
              <div class="p-1">
                <button
                  @click="generalPermission = 'restricted'"
                  class="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm font-medium text-gray-900 dark:text-gray-100"
                  :class="{ 'bg-gray-100 dark:bg-gray-800': generalPermission === 'restricted' }"
                >
                  Restricted
                </button>

                <button
                  @click="generalPermission = 'organization'"
                  class="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm font-medium text-gray-900 dark:text-gray-100"
                  :class="{ 'bg-gray-100 dark:bg-gray-800': generalPermission === 'organization' }"
                >
                  {{ props.organizationDomain || 'Your organization' }}
                </button>

                <button
                  @click="generalPermission = 'link'"
                  class="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm font-medium text-gray-900 dark:text-gray-100"
                  :class="{ 'bg-gray-100 dark:bg-gray-800': generalPermission === 'link' }"
                >
                  Anyone with the link
                </button>

                <button
                  @click="generalPermission = 'public'"
                  class="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm font-medium text-gray-900 dark:text-gray-100"
                  :class="{ 'bg-gray-100 dark:bg-gray-800': generalPermission === 'public' }"
                >
                  Anyone on the internet
                </button>
              </div>
            </div>
          </div>
          
          <!-- Organization permission dropdown when domain is selected -->
          <select
            v-if="availableLevels.length"
            :value="generalPermissionLevel"
            @change="handleGeneralPermissionLevelChange"
            class="text-sm border rounded-lg px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option v-for="level in availableLevels" :key="level" :value="level">
              {{ permissionLevelLabel(level) }}
            </option>
          </select>
        </div>

        <!-- Description shows below after selection -->
        <div class="ml-3 text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
          <div>• {{ privacySummary }}</div>
          <div>{{ generalPermissionDescription }}</div>
        </div>
      </div>

      <!-- Add People Button -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <Button variant="outline" @click="openInvitePage" class="w-full justify-center">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Add people by email
        </Button>
      </div>

      <!-- Copy Link and Done Button Row -->
      <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700 gap-4">
        <Button variant="outline" @click="copyLink" class="flex items-center">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy link
        </Button>
        <Button variant="default" @click="handleDone">Done</Button>
      </div>
    </div>

    <!-- Settings Page -->
    <div v-else-if="currentPage === 'settings'" class="space-y-6">
      <!-- Header with Back Button -->
      <div class="flex items-center gap-3">
        <button
          @click="goBackToMain"
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h3>
      </div>

      <!-- Permissions Section -->
      <div class="space-y-6">
        <!-- Allow Editors to Change Permissions -->
        <div class="space-y-4">
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">Permissions</h4>
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              v-model="settingsForm.allowEditorsToChangePermissions"
              class="mt-1 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-700 rounded focus:ring-primary-500 dark:focus:ring-primary-400 dark:bg-gray-950"
            />
            <div>
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Allow editors to change permissions and share</span>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Editors will be able to change permissions and share this {{ mode === 'sheet' ? 'sheet' : 'document' }} with others</p>
            </div>
          </label>
        </div>

        <!-- Download, Copy, and Print Permissions -->
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">People who can download, copy and print</h4>
          
          <div class="space-y-3">
            <!-- Editors -->
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="settingsForm.allowEditorsToDownload"
                class="mt-1 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-700 rounded focus:ring-primary-500 dark:focus:ring-primary-400 dark:bg-gray-950"
              />
              <div>
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Editors</span>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">People with edit access can download, copy, and print</p>
              </div>
            </label>

            <!-- Commenters and Viewers -->
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="settingsForm.allowCommentersToDownload"
                class="mt-1 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-700 rounded focus:ring-primary-500 dark:focus:ring-primary-400 dark:bg-gray-950"
              />
              <div>
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Commenters and viewers</span>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">People with comment or view access can download, copy, and print</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" @click="goBackToMain">Cancel</Button>
        <Button variant="default" @click="saveSettings">Save settings</Button>
      </div>
    </div>

    <!-- Invite Page -->
    <div v-else-if="currentPage === 'invite'" class="space-y-6">
      <!-- Header with Back Button -->
      <div class="flex items-center gap-3">
        <button
          @click="goBackToMain"
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Share with others</h3>
      </div>

      <!-- Email Fields with Individual Permissions -->
      <div>
        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Add people</h4>
        
        <!-- Current invitees - each with their own permission dropdown -->
        <div v-if="inviteEmails.length > 0" class="space-y-3 mb-4">
          <div v-for="(invitee, index) in inviteEmails" :key="index" class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 flex items-center justify-center">
              <span class="text-xs font-semibold">{{ invitee.email.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-sm text-gray-900 dark:text-gray-100 truncate">{{ invitee.email }}</span>
            </div>
            <!-- Individual permission dropdown for each email -->
            <select
              :value="invitee.permission"
              @change="updateInviteePermission(index, ($event.target as HTMLSelectElement).value as any)"
              class="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="view">Viewer</option>
              <option value="comment">Commenter</option>
              <option value="edit">Editor</option>
            </select>
            <button @click="removeInvitee(index)" class="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Add new invitee -->
        <div class="flex gap-2">
          <input
            v-model="newInviteEmail"
            type="email"
            placeholder="Enter email address"
            class="flex-1 border rounded-lg px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            @keyup.enter="addInvitee"
          />
          <Button variant="outline" @click="addInvitee" :disabled="!newInviteEmail.trim()">Add</Button>
        </div>
      </div>

      <!-- Message -->
      <div>
        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Add a note (optional)</h4>
        <textarea
          v-model="inviteNote"
          placeholder="Write a message to include with the invitation..."
          rows="4"
          class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 resize-none"
        />
      </div>

      <!-- Actions -->
      <div class="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" @click="goBackToMain">Cancel</Button>
        <Button variant="default" @click="sendInvites" :disabled="inviteEmails.length === 0">
          Share with {{ inviteEmails.length }} {{ inviteEmails.length !== 1 ? 'people' : 'person' }}
        </Button>
      </div>
    </div>
  </div>
</template>
