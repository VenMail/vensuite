<template>
  <div class="form-builder-new min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Top Bar -->
    <div class="form-builder-new__topbar sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            @click="handleBack"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div>
            <input
              v-model="formTitle"
              type="text"
              placeholder="Untitled Form"
              class="text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              @input="handleTitleChange"
            />
            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span v-if="isSaving">Saving...</span>
              <span v-else-if="lastSaved">Saved {{ lastSaved }}</span>
              <span v-else>Unsaved changes</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- Logo Toggle -->
          <button
            class="p-2 rounded-lg transition-colors"
            :class="settingsStore.state.header.enabled ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            title="Logo"
            @click="ensureLogoVisible"
          >
            <ImageIcon class="w-5 h-5" />
          </button>

          <!-- Payment Button (opens modal) -->
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
            :class="settingsStore.state.payment.enabled ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="openPaymentDialog"
            title="Configure Payments"
          >
            <DollarSign class="w-4 h-4" />
            <span>
              {{ settingsStore.state.payment.enabled ? `$${paymentAmount}` : 'Enable payments' }}
            </span>
          </button>

          <!-- Webhooks Button (modal) -->
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            @click="handleWebhooksClick"
            title="Configure Webhooks"
          >
            <Webhook class="w-5 h-5" />
          </button>

          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="handleSettings"
            title="Form Settings"
          >
            <Settings class="w-4 h-4 inline mr-2" />
            Settings
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="handlePreview"
          >
            <Eye class="w-4 h-4 inline mr-2" />
            Preview
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isPublishing || blocks.length === 0"
            @click="handlePublish"
          >
            <Send class="w-4 h-4 inline mr-2" />
            {{ isPublishing ? 'Publishing...' : 'Publish' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="isLoading" class="max-w-3xl mx-auto px-6 py-24 animate-pulse">
      <div class="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
      <div class="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
      <div class="space-y-6">
        <div v-for="n in 4" :key="n" class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-6">
          <div class="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
          <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div class="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>

    <div v-else class="form-builder-new__content max-w-3xl mx-auto px-6 py-12">
      <!-- Form Header -->
      <div class="form-builder-new__header mb-12">
        <!-- Logo block inside document -->
        <div v-if="formConfig?.showLogo !== false" class="mb-6">
          <Transition name="fade" mode="out-in">
            <div
              v-if="settingsStore.state.header.logo_url"
              key="logo-config"
              class="space-y-4"
            >
              <div
                class="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 px-4 py-3"
              >
                <div class="flex items-center gap-4">
                  <div class="relative group flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl p-2">
                    <img
                      :src="settingsStore.state.header.logo_url"
                      alt="Logo"
                      class="rounded-lg object-contain"
                      :style="logoStyle"
                    />
                    <div class="absolute inset-0 rounded-xl border border-dashed border-transparent group-hover:border-blue-400 group-hover:bg-blue-500/5 transition-colors"></div>
                  </div>
                  <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                    <button class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800" @click="handleLogoClick">
                      Change
                    </button>
                    <button class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800" @click="removeLogo">
                      Remove
                    </button>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <span class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Align</span>
                  <button
                    class="p-2 rounded-lg border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="headerAlignment === 'left' ? 'bg-primary-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600'"
                    @click="setLogoAlignment('left')"
                    title="Align left"
                  >
                    <AlignLeft class="w-4 h-4" />
                  </button>
                  <button
                    class="p-2 rounded-lg border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="headerAlignment === 'center' ? 'bg-primary-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600'"
                    @click="setLogoAlignment('center')"
                    title="Align center"
                  >
                    <AlignCenter class="w-4 h-4" />
                  </button>
                  <button
                    class="p-2 rounded-lg border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="headerAlignment === 'right' ? 'bg-primary-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600'"
                    @click="setLogoAlignment('right')"
                    title="Align right"
                  >
                    <AlignRight class="w-4 h-4" />
                  </button>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <span class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Size</span>
                  <div class="flex items-center gap-2">
                    <label class="sr-only" for="logo-size">Logo width</label>
                    <input
                      id="logo-size"
                      type="range"
                      min="40"
                      max="200"
                      step="4"
                      v-model.number="logoWidth"
                      class="w-32 accent-blue-600"
                    />
                    <span class="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{{ logoWidth }}px</span>
                  </div>
                  <button
                    class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    @click="resetLogoSize"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div class="rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6">
                <div
                  class="w-full flex"
                  :class="logoAlignmentClass"
                >
                  <img
                    :src="settingsStore.state.header.logo_url"
                    alt="Logo preview"
                    class="rounded-xl object-contain shadow-sm"
                    :style="logoStyle"
                  />
                </div>
              </div>
            </div>
            <button
              v-else
              key="logo-add"
              class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              @click="ensureLogoVisible"
            >
              <ImageIcon class="w-4 h-4" />
              <span class="text-sm">Add logo</span>
            </button>
          </Transition>
        </div>

        <input
          v-model="formTitle"
          type="text"
          placeholder="Untitled Form"
          class="text-5xl font-bold w-full bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 mb-4"
          @input="handleTitleChange"
        />
        <textarea
          v-model="formDescription"
          placeholder="Add a description to help people understand your form..."
          rows="2"
          class="text-lg w-full bg-transparent border-none outline-none text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          @input="handleDescriptionChange"
        />
      </div>

      <!-- Blocks -->
      <div class="form-builder-new__blocks space-y-3">
        <TransitionGroup name="block-list">
          <div
            v-for="(block, index) in blocks"
            :key="block.id"
            :class="[
              'block-wrapper group rounded-2xl transition-shadow',
              draggingBlockId === block.id ? 'opacity-60 cursor-grabbing' : 'cursor-grab',
              dropIndex === index && draggingBlockId !== block.id ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''
            ]"
            draggable="true"
            @dragstart="onDragStart($event, block.id)"
            @dragenter="onDragEnter(index)"
            @dragover="onDragOver($event, index)"
            @dragleave="onDragLeave(index)"
            @drop="onDrop($event, index)"
            @dragend="onDragEnd"
          >
            <BlockItemNew
              :block="block"
              :index="index"
              :is-focused="focusedBlockId === block.id"
              @focus="handleBlockFocus(block.id)"
              @blur="handleBlockBlur"
              @update="handleBlockUpdate"
              @delete="handleBlockDelete"
              @duplicate="handleBlockDuplicate"
              @move-up="handleMoveUp"
              @move-down="handleMoveDown"
              @insert-below="handleInsertBelow"
              @request-slash-menu="openSlashMenu"
              @close-slash-menu="closeSlashMenu"
            />
          </div>
        </TransitionGroup>
        <div
          v-if="draggingBlockId"
          class="h-6 border-2 border-dashed border-transparent rounded-xl transition-colors"
          :class="dropIndex === blocks.length ? 'border-blue-400 dark:border-blue-500 bg-blue-500/10 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-700'"
          @dragenter="onDragEnter(blocks.length)"
          @dragover.prevent="onDragOverEnd"
          @drop.prevent="onDropToEnd"
        ></div>
      </div>

      <!-- Add Block Button -->
      <div class="mt-6">
        <button
          class="add-block-button group w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          @click="handleAddBlock"
        >
          <Plus class="w-5 h-5" />
          <span class="text-sm font-medium">Add a question</span>
          <span class="text-xs text-gray-400 dark:text-gray-500 ml-auto">or press <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-xs font-mono">/</kbd></span>
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-if="blocks.length === 0"
        class="empty-state mt-20 text-center"
      >
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 mb-6">
          <Sparkles class="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Start building your form
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Add questions, customize fields, and create the perfect form for your needs.
        </p>
        <div class="flex items-center justify-center gap-3">
          <button
            class="px-6 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg transition-colors"
            @click="handleAddBlock"
          >
            <Plus class="w-4 h-4 inline mr-2" />
            Add First Question
          </button>
          <button
            class="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="handleUseAI"
          >
            <Wand2 class="w-4 h-4 inline mr-2" />
            Generate with AI
          </button>
        </div>
      </div>
    </div>

    <!-- Slash Command Menu -->
    <SlashMenu
      v-if="showSlashMenu"
      :filter="slashMenuFilter"
      :position="slashMenuPosition"
      @select="handleSlashSelect"
      @close="closeSlashMenu"
    />

    <!-- Configuration Wizard -->
    <FormConfigWizard
      v-if="showConfigWizard"
      :initial-config="formConfig ?? undefined"
      @complete="handleConfigComplete"
      @skip="handleConfigSkip"
    />

    <!-- Payment Modal -->
    <Teleport to="body">
      <div
        v-if="showPaymentDialog"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="closePaymentDialog"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">Payment settings</h3>
            <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" @click="closePaymentDialog">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount to charge</label>
              <div class="flex items-center gap-2">
                <span class="text-gray-600 dark:text-gray-400">$</span>
                <input
                  v-model="paymentAmount"
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Payments can be configured between $1 and $100.
              </p>
            </div>

            <div class="flex items-center justify-between">
              <button
                class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                @click="disablePayments"
              >
                Disable payments
              </button>
              <div class="flex items-center gap-3">
                <button
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  @click="closePaymentDialog"
                >
                  Cancel
                </button>
                <button
                  class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg"
                  @click="updatePaymentAmount"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Webhooks Modal -->
    <Teleport to="body">
      <div
        v-if="showWebhooksPanel"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="closeWebhooksModal"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full p-0 md:p-6">
          <div class="flex items-start flex-col md:flex-row gap-6">
            <aside class="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 px-6 py-4 md:py-0 md:px-0">
              <nav class="flex md:flex-col gap-4 md:gap-3">
                <div
                  class="flex items-center gap-3"
                  :class="webhookStep === 'intro' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'"
                >
                  <span class="flex items-center justify-center w-7 h-7 rounded-full border"
                    :class="webhookStep === 'intro' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 dark:border-blue-500' : 'border-gray-300 dark:border-gray-700'"
                  >1</span>
                  <div>
                    <p class="text-sm leading-none">Overview</p>
                    <span class="text-xs text-gray-400 dark:text-gray-500">Why webhooks?</span>
                  </div>
                </div>
                <div
                  class="flex items-center gap-3"
                  :class="webhookStep === 'configure' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'"
                >
                  <span class="flex items-center justify-center w-7 h-7 rounded-full border"
                    :class="webhookStep === 'configure' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 dark:border-blue-500' : 'border-gray-300 dark:border-gray-700'"
                  >2</span>
                  <div>
                    <p class="text-sm leading-none">Configure</p>
                    <span class="text-xs text-gray-400 dark:text-gray-500">Add endpoints</span>
                  </div>
                </div>
              </nav>
            </aside>
            <div class="flex-1 px-6 pb-6 md:px-0 md:pb-0">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {{ webhookStep === 'intro' ? 'Connect webhooks' : 'Configure webhook endpoints' }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400" v-if="webhookStep === 'intro'">
                    Send form responses and payment events to your downstream systems in real time.
                  </p>
                </div>
                <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" @click="closeWebhooksModal">
                  <X class="w-5 h-5" />
                </button>
              </div>

              <Transition name="fade" mode="out-in">
                <div v-if="webhookStep === 'intro'" key="webhook-intro" class="space-y-6">
                  <div class="grid gap-4">
                    <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">When do webhooks fire?</h4>
                      <ul class="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 space-y-1">
                        <li>Form completed</li>
                        <li>Payment succeeded or failed</li>
                        <li>Charges refunded</li>
                        <li>Any custom events you define</li>
                      </ul>
                    </div>
                    <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                      <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">How it works</h4>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        Provide a secure HTTPS endpoint and we will POST a signed payload whenever the selected events occur.
                        You can pause delivery at any time.
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3">
                    <button class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" @click="closeWebhooksModal">
                      Skip for now
                    </button>
                    <div class="flex items-center gap-3">
                      <button class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg" @click="webhookStep = 'configure'">
                        Set up webhooks
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else key="webhook-configure" class="space-y-6">
                  <WebhooksPanel :form-id="formId" key="webhooks-config" />
                  <div class="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3">
                    <button class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" @click="webhookStep = 'intro'">
                      Back
                    </button>
                    <div class="flex items-center gap-3">
                      <button class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg" @click="closeWebhooksModal">
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Image Picker Modal -->
    <Teleport to="body">
      <div
        v-if="showImagePicker"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="handleImagePickerCancel"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ imagePickerMode === 'logo' ? 'Choose a logo' : 'Choose a footer image' }}
            </h3>
            <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" @click="handleImagePickerCancel">
              <X class="w-5 h-5" />
            </button>
          </div>
          <ImagePicker
            :initial-url="imagePickerMode === 'logo' ? settingsStore.state.header.logo_url : settingsStore.state.header.footer_image_url"
            :submit-label="imagePickerMode === 'logo' ? 'Use logo' : 'Use image'"
            @submit="handleImageSelected"
            @cancel="handleImagePickerCancel"
          />
        </div>
      </div>
    </Teleport>

    <!-- AI Generation Dialog -->
    <Teleport to="body">
      <div
        v-if="showAIDialog"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="showAIDialog = false"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              Generate with AI
            </h3>
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              @click="showAIDialog = false"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <textarea
            v-model="aiPrompt"
            rows="4"
            placeholder="Describe what questions you want to add..."
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none mb-4"
          />
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              @click="showAIDialog = false"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg disabled:opacity-50"
              :disabled="!aiPrompt.trim() || isGenerating"
              @click="handleGenerateAI"
            >
              {{ isGenerating ? 'Generating...' : 'Generate' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, Eye, Send, Plus, Sparkles, Wand2, X, Settings, DollarSign, Image as ImageIcon, Webhook, AlignLeft, AlignCenter, AlignRight } from "lucide-vue-next";
import { toast } from "@/composables/useToast";
import BlockItemNew from "@/components/forms/blocks/BlockItemNew.vue";
import SlashMenu from "@/components/forms/blocks/SlashMenu.vue";
import FormConfigWizard from "@/components/forms/FormConfigWizardSimple.vue";
import WebhooksPanel from "@/components/forms/WebhooksPanel.vue";
import ImagePicker from "@/components/ImagePicker.vue";
import type { FormBlock } from "@/components/forms/blocks/types";
import type { FormConfig } from "@/components/forms/FormConfigWizardSimple.vue";
import type {
  FormDefinition,
  FormPage,
  FormQuestion,
  Option,
} from "@/types";
import { useFormStore } from "@/store/forms";
import { useFormSettingsStore } from "@/store/formSettings";
import { generateCompleteForm } from "../services/ai";

const route = useRoute();
const router = useRouter();
const formStore = useFormStore();
const settingsStore = useFormSettingsStore();

const formId = computed(() => route.params.id as string);
const TEMPLATE_STORAGE_PREFIX = "VENX_FORM_TEMPLATE_";
const formTitle = ref("");
const formDescription = ref("");
const pagesState = ref<FormPage[]>([]);
const isLoading = ref(true);

const blocks = ref<FormBlock[]>([]);
const focusedBlockId = ref<string | null>(null);
const showSlashMenu = ref(false);
const slashMenuFilter = ref("");
const slashMenuPosition = ref({ top: 0, left: 0 });
const showAIDialog = ref(false);
const aiPrompt = ref("");
const isGenerating = ref(false);
const isSaving = ref(false);
const isPublishing = ref(false);
const lastSaved = ref("");
const showConfigWizard = ref(false);
const isNewForm = ref(false);
const formConfig = ref<FormConfig | null>(null);
const showWebhooksPanel = ref(false);
const webhookStep = ref<'intro' | 'configure'>('intro');
const showImagePicker = ref(false);
const imagePickerMode = ref<'logo' | 'footer'>('logo');
const showPaymentDialog = ref(false);
const paymentAmount = ref("5.00");

const DEFAULT_LOGO_WIDTH = 96;
const MIN_LOGO_WIDTH = 40;
const MAX_LOGO_WIDTH = 200;
const clampLogoWidth = (value: number) => Math.round(Math.min(MAX_LOGO_WIDTH, Math.max(MIN_LOGO_WIDTH, value)));

const logoWidth = ref<number>(
  typeof settingsStore.state.header.logo_width === 'number'
    ? clampLogoWidth(settingsStore.state.header.logo_width)
    : DEFAULT_LOGO_WIDTH,
);

const headerAlignment = computed(() => settingsStore.state.header.alignment ?? "center");

const logoStyle = computed(() => ({
  width: `${logoWidth.value}px`,
  maxWidth: "200px",
  height: "auto",
  maxHeight: "120px",
}));

const logoAlignmentClass = computed(() => {
  switch (headerAlignment.value) {
    case "left":
      return "justify-start";
    case "right":
      return "justify-end";
    default:
      return "justify-center";
  }
});

const resetLogoSize = () => {
  logoWidth.value = DEFAULT_LOGO_WIDTH;
};

const mapToSupportedType = (t: string): FormBlock["type"] => {
  if ((ALLOWED_BLOCK_TYPES as readonly string[]).includes(t)) {
    return t as FormBlock["type"];
  }
  switch (t) {
    case "fname":
    case "lname":
    case "fullName":
    case "website":
    case "number":
      return "short";
    case "address":
      return "long";
    case "range":
      return "slider";
    case "tags":
      return "checkbox";
    case "statement":
      return "long";
    default:
      return "short";
  }
};

const normalizeBlock = (block: FormBlock): NormalizedFormBlock => {
  const type = mapToSupportedType(block.type as unknown as string);
  const category = BLOCK_CATEGORY_BY_TYPE[type];
  return { ...(block as any), type, category } as NormalizedFormBlock;
};

const ALLOWED_BLOCK_TYPES: FormBlock["type"][] = [
  "short",
  "long",
  "email",
  "phone",
  "date",
  "time",
  "radio",
  "checkbox",
  "select",
  "rating",
  "slider",
  "file",
  "yesno",
];

type SupportedType = typeof ALLOWED_BLOCK_TYPES[number];
type NormalizedFormBlock = Omit<FormBlock, "type" | "category"> & {
  type: SupportedType;
  category: FormBlock["category"]; // derived from type map
};

const BLOCK_CATEGORY_BY_TYPE: Record<FormBlock["type"], FormBlock["category"]> = {
  short: "text",
  long: "text",
  email: "text",
  phone: "text",
  date: "text",
  time: "text",
  radio: "choice",
  checkbox: "choices",
  select: "choice",
  rating: "rating",
  slider: "rating",
  file: "file",
  yesno: "switch",
};

const ensurePagesInitialized = (description: string) => {
  if (pagesState.value.length === 0) {
    pagesState.value = [
      {
        id: crypto.randomUUID(),
        title: "Page 1",
        description,
        position: 1,
        question_order: [],
      },
    ];
  }
};

const getPrimaryPageId = (description: string) => {
  ensurePagesInitialized(description);
  return pagesState.value[0].id;
};

const assignBlockToPage = (block: FormBlock, description: string): string => {
  if (block.pageId) {
    const existing = pagesState.value.find((page) => page.id === block.pageId);
    if (existing) {
      return existing.id;
    }
  }

  const fallbackPageId = getPrimaryPageId(description);
  block.pageId = fallbackPageId;
  return fallbackPageId;
};

const serializeBlockToQuestion = (block: NormalizedFormBlock, pageId: string): Partial<FormQuestion> => {
  const question: Partial<FormQuestion> & Record<string, unknown> = {
    id: block.id,
    page_id: pageId,
    type: (block.type as any),
    category: (block.category as any),
    question: block.question,
    description: block.description,
    placeholder: block.placeholder,
    required: block.required,
    help_text: block.helpText,
    logic: block.logic,
    visibility_condition: block.visibilityCondition,
    metadata: block.metadata,
  };

  if (block.options || block.optionValues) {
    const options: Option[] = block.optionValues
      ? block.optionValues
      : (block.options ?? []).map((value) => ({ value, label: value }));
    question.options = options;
  }

  if (block.validation) {
    question.validation = block.validation;
  }

  if (block.type === "rating") {
    question.icon_type = block.iconType ?? "star";
    question.allow_half = block.allowHalf;
    question.min = block.min ?? 1;
    question.max = block.max ?? 5;
  }

  if (block.type === "slider") {
    question.min = block.min ?? 0;
    question.max = block.max ?? 100;
    question.step = block.step ?? 1;
    question.show_labels = block.showLabels;
  }

  if (block.type === "file") {
    question.allowed_types = block.allowedTypes;
    question.max_size_mb = block.maxSize;
    question.multiple = block.multiple;
  }

  return question;
};

const buildPagesPayload = (description: string, blockList: FormBlock[]): FormPage[] => {
  ensurePagesInitialized(description);

  const clonedPages: FormPage[] = pagesState.value.map((page, index) => ({
    id: page.id,
    title: page.title || `Page ${index + 1}`,
    description: index === 0 ? description : page.description,
    position: page.position ?? index + 1,
    question_order: [],
    ...(page.metadata ? { metadata: page.metadata } : {}),
  }));

  const pagesById = new Map(clonedPages.map((page) => [page.id, page]));

  blockList.forEach((block) => {
    const pageId = assignBlockToPage(block, description);
    const page = pagesById.get(pageId);
    if (page) {
      page.question_order = page.question_order ?? [];
      page.question_order.push(block.id);
    }
  });

  return clonedPages;
};

const syncPaymentAmountFromStore = () => {
  const cents = settingsStore.state.payment.amount_cents ?? 0;
  if (cents > 0) {
    paymentAmount.value = (cents / 100).toFixed(2);
  } else {
    paymentAmount.value = "5.00";
  }
};

const buildConfigFromSettings = (): FormConfig => ({
  theme: "auto",
  navigationType: settingsStore.state.navigation.allow_back ? "scroll" : "paginated",
  responseView: "table",
  showProgressBar: settingsStore.state.settings.progress_bar?.show ?? true,
  enablePayments: settingsStore.state.payment.enabled,
  fontFamily: (settingsStore.state.typography.body_font_family?.toLowerCase() as FormConfig["fontFamily"]) || "system",
  primaryColor: settingsStore.state.theme.primary_color ?? "#3B82F6",
  enableWebhooks: Boolean((settingsStore.state.settings as any)?.webhook_url),
  webhookUrl: (settingsStore.state.settings as any)?.webhook_url || "",
  showLogo: Boolean(settingsStore.state.header.enabled && settingsStore.state.header.logo_url),
  logoUrl: settingsStore.state.header.logo_url || "",
  showFooter: Boolean(settingsStore.state.header.footer_image_url),
  footerImageUrl: settingsStore.state.header.footer_image_url || "",
});

const ensureLogoVisible = () => {
  settingsStore.updateHeader({ enabled: true });
  if (formConfig.value) {
    formConfig.value.showLogo = true;
  }
  triggerSave();
  handleLogoClick();
};

const setLogoAlignment = (alignment: "left" | "center" | "right") => {
  if (settingsStore.state.header.alignment === alignment) return;
  settingsStore.updateHeader({ alignment });
  triggerSave();
};

watch(logoWidth, (value) => {
  const clamped = clampLogoWidth(value || DEFAULT_LOGO_WIDTH);
  if (clamped !== value) {
    logoWidth.value = clamped;
    return;
  }
  if (settingsStore.state.header.logo_width !== clamped) {
    settingsStore.updateHeader({ logo_width: clamped });
    triggerSave();
  }
});

const openPaymentDialog = () => {
  if (!settingsStore.state.payment.enabled) {
    settingsStore.setPaymentEnabled(true);
    if (!settingsStore.state.payment.amount_cents) {
      settingsStore.updatePayment({
        amount_cents: 500,
        currency: settingsStore.state.payment.currency || "USD",
      });
    }
    triggerSave();
  }
  syncPaymentAmountFromStore();
  showPaymentDialog.value = true;
};

const closePaymentDialog = () => {
  syncPaymentAmountFromStore();
  showPaymentDialog.value = false;
};

const disablePayments = () => {
  settingsStore.setPaymentEnabled(false);
  settingsStore.updatePayment({ amount_cents: 0 });
  showPaymentDialog.value = false;
  triggerSave();
};

const applyConfigToSettings = (config: FormConfig) => {
  formConfig.value = { ...config };

  settingsStore.updateTheme({
    primary_color: config.primaryColor,
  });

  settingsStore.updateTypography({
    body_font_family: config.fontFamily,
  });

  settingsStore.updateSettings({
    progress_bar: {
      ...(settingsStore.state.settings.progress_bar ?? { type: "percentage" }),
      show: config.showProgressBar,
    },
    webhook_url: config.enableWebhooks ? config.webhookUrl : undefined,
  } as any);

  settingsStore.updateNavigation({
    allow_back: config.navigationType === "scroll",
    show_progress: config.showProgressBar,
    progress_type: config.navigationType === "scroll" ? "percentage" : "steps",
  });

  if (config.enablePayments) {
    settingsStore.setPaymentEnabled(true);
    settingsStore.updatePayment({
      amount_cents: settingsStore.state.payment.amount_cents || 500,
      currency: settingsStore.state.payment.currency || "USD",
    });
  } else {
    settingsStore.setPaymentEnabled(false);
    settingsStore.updatePayment({ amount_cents: 0 });
  }

  settingsStore.updateHeader({
    enabled: config.showLogo && !!config.logoUrl,
    logo_url: config.showLogo ? config.logoUrl || undefined : undefined,
    footer_image_url: config.showFooter ? config.footerImageUrl || undefined : undefined,
  });

  syncPaymentAmountFromStore();
  triggerSave();
};

// Auto-save functionality
let saveTimeout: NodeJS.Timeout | null = null;
const triggerSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await saveForm();
  }, 2000);
};

const saveForm = async () => {
  if (!formId.value) return;

  isSaving.value = true;
  try {
    ensurePagesInitialized(formDescription.value);

    const sanitizedBlocks = blocks.value
      .map((block) => normalizeBlock(block))
      .filter((block) => ALLOWED_BLOCK_TYPES.includes(block.type));

    const pagesPayload = buildPagesPayload(formDescription.value, sanitizedBlocks);
    const questionsPayload = sanitizedBlocks.map((block) => {
      const pageId = assignBlockToPage(block, formDescription.value);
      return serializeBlockToQuestion(block, pageId);
    });

    await formStore.updateForm(formId.value, {
      title: formTitle.value,
      pages: pagesPayload,
      questions: questionsPayload as FormQuestion[],
      // Persist all settings
      layout_mode: settingsStore.state.layoutMode,
      settings: {
        ...settingsStore.state.settings,
        webhook_url: formConfig.value?.webhookUrl,
      } as any,
      header: settingsStore.state.header,
      typography: settingsStore.state.typography,
      theme: settingsStore.state.theme,
      navigation: settingsStore.state.navigation,
      welcome_screen: settingsStore.state.welcomeScreen,
      completion_screen: settingsStore.state.completionScreen,
      sharing: settingsStore.state.sharing,
      security: settingsStore.state.security,
      payment: settingsStore.state.payment,
    });

    const now = new Date();
    lastSaved.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error("Failed to save form:", error);
    console.error("Failed to save changes");
  } finally {
    isSaving.value = false;
  }
};

const handleTitleChange = () => {
  triggerSave();
};

const handleDescriptionChange = () => {
  triggerSave();
};

const handleBlockFocus = (blockId: string) => {
  focusedBlockId.value = blockId;
};

const handleBlockBlur = () => {
  focusedBlockId.value = null;
};

const handleBlockUpdate = (updatedBlock: FormBlock) => {
  const index = blocks.value.findIndex(b => b.id === updatedBlock.id);
  if (index !== -1) {
    blocks.value[index] = updatedBlock;
    triggerSave();
  }
};

const handleBlockDelete = (blockId: string) => {
  blocks.value = blocks.value.filter(b => b.id !== blockId);
  triggerSave();
};

const handleBlockDuplicate = (blockId: string) => {
  const index = blocks.value.findIndex(b => b.id === blockId);
  if (index !== -1) {
    const original = blocks.value[index];
    const duplicate = {
      ...original,
      id: crypto.randomUUID(),
      question: `${original.question} (copy)`,
    };
    blocks.value.splice(index + 1, 0, duplicate);
    triggerSave();
  }
};

const handleMoveUp = (blockId: string) => {
  const index = blocks.value.findIndex(b => b.id === blockId);
  if (index > 0) {
    // Create new array with swapped elements
    const newBlocks = [...blocks.value];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index - 1];
    newBlocks[index - 1] = temp;
    blocks.value = newBlocks;
    triggerSave();
  }
};

const handleMoveDown = (blockId: string) => {
  const index = blocks.value.findIndex(b => b.id === blockId);
  if (index < blocks.value.length - 1) {
    // Create new array with swapped elements
    const newBlocks = [...blocks.value];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + 1];
    newBlocks[index + 1] = temp;
    blocks.value = newBlocks;
    triggerSave();
  }
};

const handleInsertBelow = (blockId: string) => {
  const index = blocks.value.findIndex((b) => b.id === blockId);
  const newBlock: FormBlock = {
    id: crypto.randomUUID(),
    type: "short",
    category: "text",
    question: "",
    required: false,
  };
  blocks.value.splice(index + 1, 0, newBlock);
  focusedBlockId.value = newBlock.id;
};

const handleAddBlock = () => {
  const newBlock: FormBlock = {
    id: crypto.randomUUID(),
    type: "short",
    category: "text",
    question: "",
    required: false,
  };
  blocks.value.push(newBlock);
  focusedBlockId.value = newBlock.id;
  closeSlashMenu();
  triggerSave();
};

const openSlashMenu = (payload: { blockId: string; filter: string; position: { top: number; left: number } }) => {
  showSlashMenu.value = true;
  slashMenuFilter.value = payload.filter;
  slashMenuPosition.value = payload.position;
  focusedBlockId.value = payload.blockId;
};

const draggingBlockId = ref<string | null>(null);
const dropIndex = ref<number | null>(null);

const applyBlockReorder = (fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.value.length) {
    return;
  }

  const updated = [...blocks.value];
  const [moved] = updated.splice(fromIndex, 1);

  if (toIndex >= updated.length) {
    updated.push(moved);
  } else {
    updated.splice(toIndex, 0, moved);
  }

  blocks.value = updated;
  triggerSave();
};

const onDragStart = (event: DragEvent, blockId: string) => {
  draggingBlockId.value = blockId;
  const fromIndex = blocks.value.findIndex((b) => b.id === blockId);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(fromIndex));
  }
};

const onDragEnter = (index: number) => {
  if (draggingBlockId.value !== null) {
    dropIndex.value = index;
  }
};

const onDragOver = (event: DragEvent, index: number) => {
  if (!draggingBlockId.value) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  dropIndex.value = index;
};

const onDragLeave = (index: number) => {
  if (dropIndex.value === index) {
    dropIndex.value = null;
  }
};

const onDrop = (event: DragEvent, index: number) => {
  if (!draggingBlockId.value) return;
  event.preventDefault();
  const fromIndex = blocks.value.findIndex((b) => b.id === draggingBlockId.value);
  let targetIndex = index;
  if (fromIndex < targetIndex) {
    targetIndex -= 1;
  }
  applyBlockReorder(fromIndex, targetIndex);
  draggingBlockId.value = null;
  dropIndex.value = null;
};

const onDragOverEnd = (event: DragEvent) => {
  if (!draggingBlockId.value) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  dropIndex.value = blocks.value.length;
};

const onDropToEnd = () => {
  if (!draggingBlockId.value) return;
  const fromIndex = blocks.value.findIndex((b) => b.id === draggingBlockId.value);
  applyBlockReorder(fromIndex, blocks.value.length);
  draggingBlockId.value = null;
  dropIndex.value = null;
};

const onDragEnd = () => {
  draggingBlockId.value = null;
  dropIndex.value = null;
};

const handleSlashSelect = (type: FormBlock["type"]) => {
  if (!focusedBlockId.value) {
    closeSlashMenu();
    return;
  }

  const index = blocks.value.findIndex((block) => block.id === focusedBlockId.value);
  if (index === -1) {
    closeSlashMenu();
    return;
  }

  const block = { ...blocks.value[index] };
  if (block.question?.includes("/")) {
    const slashIndex = block.question.lastIndexOf("/");
    block.question = block.question.slice(0, slashIndex).trimEnd();
  }

  block.type = type;

  const categoryMap: Record<string, FormBlock["category"]> = {
    short: "text",
    long: "text",
    email: "text",
    phone: "text",
    date: "text",
    time: "text",
    radio: "choice",
    checkbox: "choices",
    select: "choice",
    rating: "rating",
    slider: "rating",
    file: "file",
    yesno: "switch",
  };
  block.category = categoryMap[type] ?? "text";

  if ((type === "radio" || type === "checkbox" || type === "select") && (!block.options || block.options.length === 0)) {
    block.options = ["Option 1", "Option 2", "Option 3"];
  }

  blocks.value.splice(index, 1, block);
  closeSlashMenu();
  triggerSave();
};

const closeSlashMenu = () => {
  showSlashMenu.value = false;
  slashMenuFilter.value = "";
};

const handleUseAI = () => {
  showAIDialog.value = true;
};

const handleGenerateAI = async () => {
  if (!aiPrompt.value.trim()) return;
  
  isGenerating.value = true;
  try {
    const result = await generateCompleteForm(aiPrompt.value);
    if (result.title) {
      formTitle.value = result.title;
    }
    if (result.description) {
      formDescription.value = result.description;
      if (pagesState.value.length > 0) {
        pagesState.value[0].description = result.description;
      }
    }

    if (Array.isArray(result.blocks) && result.blocks.length > 0) {
      const normalizedBlocks = result.blocks.map((block) => normalizeBlock(block));
      blocks.value.push(...normalizedBlocks);
    }
    showAIDialog.value = false;
    aiPrompt.value = "";
    console.log("Questions generated successfully!");
    triggerSave();
  } catch (error) {
    console.error("Failed to generate blocks:", error);
    console.error("Failed to generate questions. Please try again.");
  } finally {
    isGenerating.value = false;
  }
};

const handleBack = () => {
  if (isSaving.value) {
    console.log("Saving changes before leaving...");
    setTimeout(() => {
      router.push({ name: "forms" });
    }, 1000);
  } else {
    router.push({ name: "forms" });
  }
};

const handleConfigComplete = (config: FormConfig) => {
  showConfigWizard.value = false;
  applyConfigToSettings(config);
  // Focus first block after config
  setTimeout(() => {
    if (blocks.value.length > 0) {
      focusedBlockId.value = blocks.value[0].id;
    }
  }, 100);
};

const handleConfigSkip = () => {
  showConfigWizard.value = false;
  formConfig.value = buildConfigFromSettings();
  // Focus first block after skip
  setTimeout(() => {
    if (blocks.value.length > 0) {
      focusedBlockId.value = blocks.value[0].id;
    }
  }, 100);
};

const handleSettings = () => {
  formConfig.value = buildConfigFromSettings();
  showConfigWizard.value = true;
};

const updatePaymentAmount = () => {
  const amount = parseFloat(paymentAmount.value) || 5;
  const clamped = Math.max(1, Math.min(100, amount));
  paymentAmount.value = clamped.toFixed(2);
  settingsStore.updatePayment({
    amount_cents: Math.round(clamped * 100),
  });
  showPaymentDialog.value = false;
  triggerSave();
};

const handleLogoClick = () => {
  imagePickerMode.value = 'logo';
  showImagePicker.value = true;
};

const handleImageSelected = (url: string) => {
  if (imagePickerMode.value === 'logo') {
    settingsStore.updateHeader({
      logo_url: url,
      enabled: true,
    });
  } else {
    settingsStore.updateHeader({
      footer_image_url: url,
    });
  }
  showImagePicker.value = false;
  triggerSave();
};

const handleImagePickerCancel = () => {
  showImagePicker.value = false;
};

const removeLogo = () => {
  settingsStore.updateHeader({ logo_url: undefined, enabled: false });
  if (formConfig.value) {
    formConfig.value.showLogo = false;
    formConfig.value.logoUrl = "";
  }
  triggerSave();
};

const handleWebhooksClick = () => {
  webhookStep.value = 'intro';
  showWebhooksPanel.value = true;
};

const closeWebhooksModal = () => {
  showWebhooksPanel.value = false;
};

const ensurePublishedSlug = async (): Promise<FormDefinition | null> => {
  if (!formId.value) return null;
  const latest = await formStore.fetchForm(formId.value);

  if (latest?.sharing?.share_slug || latest?.slug) {
    return latest;
  }

  const published = await formStore.publishForm(formId.value);
  if (published) {
    return published;
  }

  toast.error("Publish failed. Please try again.");
  return null;
};

const handlePreview = async () => {
  if (!formId.value) return;

  await saveForm();

  const definition = await formStore.fetchForm(formId.value);
  const isPublished = definition?.status === "published";
  const target = isPublished
    ? `/f/${definition?.sharing?.share_slug ?? definition?.slug}`
    : `/f/by-id/${formId.value}`;

  window.open(target, "_blank");
};

const handlePublish = async () => {
  if (!formId.value || blocks.value.length === 0) return;

  isPublishing.value = true;
  try {
    await saveForm();
    const definition = await ensurePublishedSlug();
    if (definition) {
      const shareSlug = definition.sharing?.share_slug ?? definition.slug;
      toast.success(
        shareSlug
          ? `Form published. Share link: /f/${shareSlug}`
          : "Form published and ready to share"
      );
    }
  } catch (error) {
    console.error("Failed to publish form:", error);
    const fallbackMessage = "Failed to publish form";
    if (error && typeof error === "object" && "data" in error && typeof (error as any).data?.message === "string") {
      toast.error((error as any).data.message as string);
    } else if (error instanceof Error && error.message) {
      toast.error(error.message);
    } else {
      toast.error(fallbackMessage);
    }
  } finally {
    isPublishing.value = false;
  }
};

// Load form data
watch(
  () => settingsStore.state.payment.amount_cents,
  () => {
    syncPaymentAmountFromStore();
  },
  { immediate: true }
);

watch(
  () => settingsStore.state.header.logo_url,
  () => {
    if (!formConfig.value) return;
    formConfig.value.logoUrl = settingsStore.state.header.logo_url || "";
    formConfig.value.showLogo = Boolean(settingsStore.state.header.enabled && settingsStore.state.header.logo_url);
    if (typeof settingsStore.state.header.logo_width === 'number') {
      logoWidth.value = clampLogoWidth(settingsStore.state.header.logo_width);
    }
  }
);

watch(
  () => settingsStore.state.header.footer_image_url,
  () => {
    if (!formConfig.value) return;
    formConfig.value.footerImageUrl = settingsStore.state.header.footer_image_url || "";
    formConfig.value.showFooter = Boolean(settingsStore.state.header.footer_image_url);
  }
);

const normalizeTemplateBlock = (block: any): FormBlock => ({
  id: block.id ?? crypto.randomUUID(),
  type: block.type ?? "short",
  category: block.category ?? "text",
  question: block.question ?? "Untitled question",
  description: block.description ?? "",
  placeholder: block.placeholder ?? "",
  required: Boolean(block.required),
  options: block.options ? [...block.options] : undefined,
  validation: block.validation,
  iconType: block.iconType,
  allowHalf: block.allowHalf,
  min: block.min,
  max: block.max,
  allowedTypes: block.allowedTypes,
  maxSize: block.maxSize,
  multiple: block.multiple,
});

onMounted(async () => {
  if (formId.value) {
    const form = await formStore.fetchForm(formId.value);
    if (form) {
      formTitle.value = form.title || "";
      
      // Load settings from form
      settingsStore.hydrateFromDefinition(form as any);
      formConfig.value = buildConfigFromSettings();
      syncPaymentAmountFromStore();
      
      // Check if this is a new form (no questions yet)
      isNewForm.value = !form.questions || form.questions.length === 0;

      let hydratedFromTemplate = false;

      if (isNewForm.value && form.id) {
        const storageKey = `${TEMPLATE_STORAGE_PREFIX}${form.id}`;
        const templatePayload = sessionStorage.getItem(storageKey);
        if (templatePayload) {
          try {
            const parsed = JSON.parse(templatePayload) as {
              title?: string;
              description?: string;
              blocks?: any[];
            };

            formTitle.value = parsed.title || formTitle.value;
            formDescription.value = parsed.description || formDescription.value;
            const templateBlocks = parsed.blocks?.map(normalizeTemplateBlock) ?? [];
            if (templateBlocks.length) {
              blocks.value = templateBlocks.map((b) => normalizeBlock(b as any));
              hydratedFromTemplate = true;
              showConfigWizard.value = false;
              isNewForm.value = false;
              focusedBlockId.value = templateBlocks[0].id;
            }
          } catch (error) {
            console.error("Failed to hydrate template payload:", error);
          } finally {
            sessionStorage.removeItem(storageKey);
          }
        }
      }
      
      if (isNewForm.value && !hydratedFromTemplate) {
        // Show configuration wizard for new forms
        showConfigWizard.value = true;
      }
      
      // Convert backend pages and questions to blocks; preserve page IDs
      const allBlocks: FormBlock[] = [];
      if (!hydratedFromTemplate && form.pages && form.pages.length > 0) {
        const sortedPages = [...form.pages].sort((a, b) => a.position - b.position);
        // hydrate pages state
        pagesState.value = sortedPages.map((p, idx) => ({
          id: p.id,
          title: p.title || `Page ${idx + 1}`,
          description: p.description,
          position: p.position ?? idx + 1,
          question_order: Array.isArray((p as any).question_order) ? (p as any).question_order : [],
          ...(p as any).metadata ? { metadata: (p as any).metadata } : {},
        }));

        sortedPages.forEach((page, pageIndex) => {
          if (pageIndex === 0 && page.description) {
            formDescription.value = page.description;
          }
          const pageQuestions = form.questions?.filter(q => q.page_id === page.id) || [];
          const sortedQuestions = [...pageQuestions].sort((a, b) => {
            const posA = (a as any).position || 0;
            const posB = (b as any).position || 0;
            return posA - posB;
          });
          sortedQuestions.forEach(q => {
            allBlocks.push(normalizeBlock({
              id: q.id,
              type: q.type as any,
              category: q.category as any,
              question: q.question || "",
              description: q.description,
              placeholder: q.placeholder,
              required: q.required || false,
              options: (q as any).options?.map((opt: any) => typeof opt === "string" ? opt : (opt.label || opt.value)),
              pageId: q.page_id,
            } as any));
          });
        });
      }

      if (!hydratedFromTemplate) {
        blocks.value = allBlocks;

        // Auto-focus first block after loading
        setTimeout(() => {
          if (!isNewForm.value && blocks.value.length > 0) {
            focusedBlockId.value = blocks.value[0].id;
          }
        }, 300);
      }
    }
  }
  isLoading.value = false;
});

onBeforeUnmount(() => {
  if (saveTimeout) clearTimeout(saveTimeout);
});
</script>

<style scoped>
.block-list-move,
.block-list-enter-active,
.block-list-leave-active {
  transition: all 0.3s ease;
}

.block-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.block-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.block-list-leave-active {
  position: absolute;
}
</style>
