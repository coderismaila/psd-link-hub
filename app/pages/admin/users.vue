<script setup lang="ts">
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  type CreateUserBody,
  type UpdateUserBody
} from '#shared/schemas/user'
import type { UserDTO } from '#shared/types/user'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Users — PSD Link Hub' })

const toast = useToast()
const { user: currentUser } = useUserSession()

const { data: users, status, refresh } = useFetch<UserDTO[]>('/api/admin/users', {
  key: 'admin-users',
  default: () => []
})

const pending = computed(() => status.value === 'pending')

const formOpen = ref(false)
const editing = ref<UserDTO | null>(null)
const saving = ref(false)

const createState = reactive<CreateUserBody>({ name: '', email: '', role: 'viewer', password: '' })
const editState = reactive<UpdateUserBody>({ name: '', role: 'viewer', isActive: true })

const resetOpen = ref(false)
const resetTarget = ref<UserDTO | null>(null)
const resetState = reactive({ password: '' })
const resetting = ref(false)

const roleItems = [
  { label: 'Viewer', value: 'viewer', description: 'Browse, pin and keep a personal archive' },
  { label: 'Admin', value: 'admin', description: 'Also manage links, categories, users and settings' }
]

function reportError(title: string, error: unknown) {
  const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
  toast.add({ title, description: message || 'Please try again.', color: 'error' })
}

function openCreate() {
  editing.value = null
  Object.assign(createState, { name: '', email: '', role: 'viewer', password: '' })
  formOpen.value = true
}

function openEdit(user: UserDTO) {
  editing.value = user
  Object.assign(editState, { name: user.name, role: user.role, isActive: user.isActive })
  formOpen.value = true
}

function openReset(user: UserDTO) {
  resetTarget.value = user
  resetState.password = ''
  resetOpen.value = true
}

async function onCreate(event: FormSubmitEvent<CreateUserBody>) {
  saving.value = true

  try {
    await $fetch('/api/admin/users', { method: 'POST', body: event.data })
    toast.add({
      title: 'User created',
      description: 'Share the temporary password with them directly.',
      icon: 'i-lucide-check',
      color: 'success'
    })
    formOpen.value = false
    await refresh()
  } catch (error) {
    reportError('Could not create the user', error)
  } finally {
    saving.value = false
  }
}

async function onUpdate(event: FormSubmitEvent<UpdateUserBody>) {
  if (!editing.value) return

  saving.value = true

  try {
    await $fetch(`/api/admin/users/${editing.value.id}`, { method: 'PATCH', body: event.data })
    toast.add({ title: 'User updated', icon: 'i-lucide-check', color: 'success' })
    formOpen.value = false
    await refresh()
  } catch (error) {
    // The server refuses to strip the last active admin, or your own admin access.
    reportError('Could not update the user', error)
  } finally {
    saving.value = false
  }
}

async function onReset(event: FormSubmitEvent<{ password: string }>) {
  if (!resetTarget.value) return

  resetting.value = true

  try {
    await $fetch(`/api/admin/users/${resetTarget.value.id}/reset-password`, {
      method: 'POST',
      body: event.data
    })
    toast.add({
      title: 'Password reset',
      description: 'Give them the new password directly.',
      icon: 'i-lucide-check',
      color: 'success'
    })
    resetOpen.value = false
  } catch (error) {
    reportError('Could not reset the password', error)
  } finally {
    resetting.value = false
  }
}

const columns: TableColumn<UserDTO>[] = [
  { accessorKey: 'name', header: 'User' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'isActive', header: 'Status' },
  { id: 'actions', header: '' }
]

function isSelf(user: UserDTO) {
  return user.id === currentUser.value?.id
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-muted">
        {{ users.length }} {{ users.length === 1 ? 'user' : 'users' }}
      </p>

      <UButton icon="i-lucide-user-plus" class="min-h-10" @click="openCreate">
        New user
      </UButton>
    </div>

    <UTable :data="users" :columns="columns" :loading="pending" class="hidden sm:block">
      <template #name-cell="{ row }">
        <div class="flex flex-col">
          <span class="font-medium">
            {{ row.original.name }}
            <span v-if="isSelf(row.original)" class="text-xs text-dimmed">(you)</span>
          </span>
          <span class="text-xs text-muted">{{ row.original.email }}</span>
        </div>
      </template>

      <template #role-cell="{ row }">
        <UBadge
          :color="row.original.role === 'admin' ? 'primary' : 'neutral'"
          variant="subtle"
          size="sm"
        >
          {{ row.original.role }}
        </UBadge>
      </template>

      <template #isActive-cell="{ row }">
        <UBadge
          :color="row.original.isActive ? 'success' : 'neutral'"
          variant="subtle"
          size="sm"
        >
          {{ row.original.isActive ? 'Active' : 'Deactivated' }}
        </UBadge>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-pencil"
            :aria-label="`Edit ${row.original.name}`"
            @click="openEdit(row.original)"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-key-round"
            :aria-label="`Reset password for ${row.original.name}`"
            @click="openReset(row.original)"
          />
        </div>
      </template>

      <template #empty>
        <EmptyState icon="i-lucide-users" title="No users yet" />
      </template>
    </UTable>

    <div class="flex flex-col gap-3 sm:hidden">
      <div
        v-for="user in users"
        :key="user.id"
        class="flex flex-col gap-2 rounded-lg border border-default p-4"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex min-w-0 flex-col">
            <span class="truncate font-medium">
              {{ user.name }}
              <span v-if="isSelf(user)" class="text-xs text-dimmed">(you)</span>
            </span>
            <span class="truncate text-xs text-muted">{{ user.email }}</span>
          </div>

          <div class="flex gap-1">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-pencil"
              class="min-h-10"
              :aria-label="`Edit ${user.name}`"
              @click="openEdit(user)"
            />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-key-round"
              class="min-h-10"
              :aria-label="`Reset password for ${user.name}`"
              @click="openReset(user)"
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <UBadge :color="user.role === 'admin' ? 'primary' : 'neutral'" variant="subtle" size="sm">
            {{ user.role }}
          </UBadge>
          <UBadge :color="user.isActive ? 'success' : 'neutral'" variant="subtle" size="sm">
            {{ user.isActive ? 'Active' : 'Deactivated' }}
          </UBadge>
        </div>
      </div>
    </div>

    <USlideover
      v-model:open="formOpen"
      :title="editing ? 'Edit user' : 'New user'"
      :description="editing ? editing.email : 'They cannot sign themselves up, so set a password to hand over.'"
    >
      <template #body>
        <UForm
          v-if="editing"
          id="user-form"
          :schema="updateUserSchema"
          :state="editState"
          class="space-y-4"
          @submit="onUpdate"
        >
          <UFormField label="Name" name="name" required>
            <UInput v-model="editState.name" class="w-full" />
          </UFormField>

          <UFormField label="Role" name="role" required>
            <URadioGroup v-model="editState.role" :items="roleItems" variant="card" />
          </UFormField>

          <UFormField label="Status" name="isActive">
            <USwitch
              v-model="editState.isActive"
              label="Active"
              description="A deactivated user is signed out on their next request."
            />
          </UFormField>

          <UAlert
            v-if="isSelf(editing)"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="This is your own account"
            description="You cannot remove your own admin access or deactivate yourself."
          />
        </UForm>

        <UForm
          v-else
          id="user-form"
          :schema="createUserSchema"
          :state="createState"
          class="space-y-4"
          @submit="onCreate"
        >
          <UFormField label="Name" name="name" required>
            <UInput v-model="createState.name" class="w-full" />
          </UFormField>

          <UFormField label="Email" name="email" required>
            <UInput v-model="createState.email" type="email" class="w-full" />
          </UFormField>

          <UFormField label="Role" name="role" required>
            <URadioGroup v-model="createState.role" :items="roleItems" variant="card" />
          </UFormField>

          <UFormField
            label="Temporary password"
            name="password"
            required
            description="At least 8 characters. Share it with them directly and ask them to change it."
          >
            <UInput v-model="createState.password" type="password" class="w-full" />
          </UFormField>
        </UForm>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :disabled="saving" @click="formOpen = false">
            Cancel
          </UButton>
          <UButton type="submit" form="user-form" :loading="saving">
            {{ editing ? 'Save changes' : 'Create user' }}
          </UButton>
        </div>
      </template>
    </USlideover>

    <UModal
      v-model:open="resetOpen"
      title="Reset password"
      :description="resetTarget ? `Set a new password for ${resetTarget.name}.` : undefined"
    >
      <template #body>
        <UForm
          id="reset-form"
          :schema="resetPasswordSchema"
          :state="resetState"
          class="space-y-4"
          @submit="onReset"
        >
          <UFormField label="New password" name="password" required>
            <UInput v-model="resetState.password" type="password" class="w-full" />
          </UFormField>
        </UForm>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :disabled="resetting" @click="resetOpen = false">
            Cancel
          </UButton>
          <UButton type="submit" form="reset-form" :loading="resetting">
            Reset password
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
