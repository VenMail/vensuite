<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'

type Member = {
  email: string
  name?: string
  avatarUrl?: string
  permission: 'view' | 'comment' | 'edit'
}

const props = defineProps<{
  mode?: 'doc' | 'sheet'
  shareLink: string
  privacyType: number // 1=everyone_view,2=everyone_edit,3=link_view,4=link_edit,5=org_view,6=org_edit,7=explicit
  members?: Member[]
  canEditPrivacy?: boolean
}>()

const emit = defineEmits<{
  (e: 'copy-link'): void
  (e: 'change-privacy', value: number): void
  (e: 'update-member', payload: { email: string; permission: Member['permission'] }): void
  (e: 'remove-member', payload: { email: string }): void
  (e: 'invite', payload: { email: string; permission: Member['permission'] }): void
}>()

const membersSafe = computed(() => props.members || [])
const inviteEmail = ref('')
const invitePerm = ref<Member['permission']>('view')

const privacyLabel = computed(() => {
  switch (props.privacyType) {
    case 1: return 'Anyone on the internet (view)'
    case 2: return 'Anyone on the internet (edit)'
    case 3: return 'Anyone with the link (view)'
    case 4: return 'Anyone with the link (edit)'
    case 5: return 'Your organization (view)'
    case 6: return 'Your organization (edit)'
    case 7: return 'Restricted (specific people)'
    default: return 'Restricted'
  }
})

function handleInvite() {
  const email = inviteEmail.value.trim()
  if (!email) return
  emit('invite', { email, permission: invitePerm.value })
  inviteEmail.value = ''
  invitePerm.value = 'view'
}

function updatePrivacy(p: number) {
  if (props.canEditPrivacy === false) return
  emit('change-privacy', p)
}

function updateMember(email: string, perm: Member['permission']) {
  emit('update-member', { email, permission: perm })
}

function removeMember(email: string) {
  emit('remove-member', { email })
}
</script>

<template>
  <div class="w-full max-w-2xl">
    <div class="mb-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Share settings</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ privacyLabel }}</p>
    </div>

    <!-- Link row -->
    <div class="flex gap-2 items-center">
      <input
        class="flex-1 border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        :value="shareLink"
        readonly
      />
      <Button variant="secondary" @click="emit('copy-link')">Copy link</Button>
    </div>

    <!-- Privacy options -->
    <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button
        class="text-left px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        :class="props.privacyType===7 ? 'bg-gray-100 dark:bg-gray-800' : ''"
        @click="updatePrivacy(7)"
      >
        Restricted (specific people)
      </button>
      <button
        class="text-left px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        :class="props.privacyType===3 ? 'bg-gray-100 dark:bg-gray-800' : ''"
        @click="updatePrivacy(3)"
      >
        Anyone with link (view)
      </button>
      <button
        class="text-left px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        :class="props.privacyType===4 ? 'bg-gray-100 dark:bg-gray-800' : ''"
        @click="updatePrivacy(4)"
      >
        Anyone with link (edit)
      </button>
      <button
        class="text-left px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        :class="props.privacyType===1 ? 'bg-gray-100 dark:bg-gray-800' : ''"
        @click="updatePrivacy(1)"
      >
        Public on the web (view)
      </button>
      <button
        class="text-left px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        :class="props.privacyType===2 ? 'bg-gray-100 dark:bg-gray-800' : ''"
        @click="updatePrivacy(2)"
      >
        Public on the web (edit)
      </button>
      <button
        class="text-left px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        :class="props.privacyType===5 ? 'bg-gray-100 dark:bg-gray-800' : ''"
        @click="updatePrivacy(5)"
      >
        Organization only (view)
      </button>
      <button
        class="text-left px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        :class="props.privacyType===6 ? 'bg-gray-100 dark:bg-gray-800' : ''"
        @click="updatePrivacy(6)"
      >
        Organization only (edit)
      </button>
    </div>

    <!-- Invite row -->
    <div class="mt-6">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">Add people</h4>
      <div class="mt-2 flex flex-col sm:flex-row gap-2">
        <input
          v-model="inviteEmail"
          type="email"
          placeholder="name@example.com"
          class="flex-1 border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        />
        <select
          v-model="invitePerm"
          class="border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="view">Can view</option>
          <option value="comment">Can comment</option>
          <option value="edit">Can edit</option>
        </select>
        <Button variant="default" class="shrink-0" :disabled="!inviteEmail" @click="handleInvite">Invite</Button>
      </div>
    </div>

    <!-- Members list -->
    <div class="mt-6">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">People with access</h4>
      <div v-if="membersSafe.length === 0" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        No people have been added yet.
      </div>
      <ul v-else class="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="m in membersSafe" :key="m.email" class="py-3 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 flex items-center justify-center overflow-hidden">
              <img v-if="m.avatarUrl" :src="m.avatarUrl" class="w-full h-full object-cover" alt="" />
              <span v-else class="text-xs font-semibold">{{ (m.name || m.email).charAt(0).toUpperCase() }}</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ m.name || m.email }}</p>
              <p class="text-xs text-gray-600 dark:text-gray-400 truncate" v-if="m.name">{{ m.email }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <select
              :value="m.permission"
              @change="updateMember(m.email, ($event.target as HTMLSelectElement).value as any)"
              class="border rounded px-2 py-1 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="view">Can view</option>
              <option value="comment">Can comment</option>
              <option value="edit">Can edit</option>
            </select>
            <button
              class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1"
              @click="removeMember(m.email)"
            >
              Remove
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
