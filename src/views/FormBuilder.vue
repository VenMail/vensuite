<template>
  <div class="form-builder-new min-h-screen bg-gray-50 dark:bg-gray-900">
     
    <div
      class="form-builder-new__topbar sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800"
    >
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0"
            @click="handleBack"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div class="min-w-0 flex-1">
            <input
              v-model="formTitle"
              type="text"
              placeholder="Untitled Form"
              class="text-base sm:text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 w-full"
              @input="handleTitleChange"
            />
            <div
              class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1"
            >
              <span v-if="isSaving">Saving...</span>
              <span v-else-if="lastSaved">Saved {{ lastSaved }}</span>
              <span v-else>{{$t('Commons.text.unsaved_changes')}}</span>
            </div>
          </div>
        </div>

         
        <div class="hidden lg:flex items-center gap-3">
           
          <button
            class="p-2 rounded-lg transition-colors"
            :class="
              settingsStore.state.header.enabled
                ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            "
            title="Logo"
            @click="ensureLogoVisible"
          >
            <ImageIcon class="w-5 h-5" />
          </button>

           
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="handlePreview"
          >
            <Eye class="w-4 h-4" />
            {{$t('Commons.button.preview')}}
          </button>

           
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="openShareModal"
          >
            <Share2 class="w-4 h-4" />
            {{$t('Commons.button.share')}}
          </button>

          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="openIntegrationsModal"
          >
            <Plug class="w-4 h-4" />
            Integrations
          </button>

           
          <button
            v-if="isFormPublished && acceptingResponses"
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="handleToggleAccepting"
            title="Stop accepting responses"
          >
            {{$t('Commons.button.stop_responses')}}
          </button>

           
          <button
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isPublishing || blocks.length === 0"
            @click="handlePublish"
          >
            <Send class="w-4 h-4" />
            {{ isPublishing ? "Publishing..." : $t('Commons.button.publish') }}
          </button>

           
          <div class="relative">
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              @click="toggleDropdown('more')"
              title="More options"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
            <div
              v-if="openDropdown === 'more'"
              class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              @click.stop
            >
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  handleSettings();
                  openDropdown = null;
                "
              >
                <Settings class="w-4 h-4" />
                {{$t('Commons.button.form_settings')}}
              </button>
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  openPaymentDialog();
                  openDropdown = null;
                "
              >
                <DollarSign class="w-4 h-4" />
                <span>Payment</span>
                <span class="ml-auto text-xs text-gray-500 dark:text-gray-400">{{
                  settingsStore.state.payment.enabled ? `${paymentAmount}` : "Off"
                }}</span>
              </button>
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  handleWebhooksClick();
                  openDropdown = null;
                "
              >
                <Webhook class="w-4 h-4" />
                {{$t('Commons.button.webhooks')}}
              </button>
              <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                @click="
                  handleDeleteForm();
                  openDropdown = null;
                "
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
                {{$t('Commons.button.delete')}}
              </button>
            </div>
          </div>
        </div>

         
        <div class="flex lg:hidden items-center gap-2 shrink-0">
           
          <div class="relative">
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              @click="toggleDropdown('hamburger')"
              title="Menu"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </button>
            <div
              v-if="openDropdown === 'hamburger'"
              class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              @click.stop
            >
               
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                :class="
                  settingsStore.state.header.enabled
                    ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                "
                @click="
                  ensureLogoVisible();
                  openDropdown = null;
                "
              >
                <ImageIcon class="w-4 h-4" />
                {{$t('Commons.button.logo')}}
              </button>

               
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  handlePreview();
                  openDropdown = null;
                "
              >
                <Eye class="w-4 h-4" />
                {{$t('Commons.button.preview')}}
              </button>

               
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  openShareModal();
                  openDropdown = null;
                "
              >
                <Share2 class="w-4 h-4" />
                {{$t('Commons.button.share')}}
              </button>

              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  openIntegrationsModal();
                  openDropdown = null;
                "
              >
                <Plug class="w-4 h-4" />
                Integrations
              </button>

               
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  handleToggleAccepting();
                  openDropdown = null;
                "
                :title="
                  acceptingResponses
                    ? 'Stop accepting responses'
                    : 'Resume accepting responses'
                "
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  ></path>
                </svg>
                {{ acceptingResponses ? $t('Commons.button.stop_responses') : $t('Commons.button.resume_responses') }}
              </button>

              <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>

               
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isPublishing || blocks.length === 0"
                @click="
                  handlePublish();
                  openDropdown = null;
                "
              >
                <Send class="w-4 h-4" />
                {{ isPublishing ? "Publishing..." : $t('Commons.button.publish') }}
              </button>
            </div>
          </div>

           
          <div class="relative">
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              @click="toggleDropdown('more')"
              title="More options"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
            <div
              v-if="openDropdown === 'more'"
              class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              @click.stop
            >
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  handleSettings();
                  openDropdown = null;
                "
              >
                <Settings class="w-4 h-4" />
                {{$t('Commons.button.form_settings')}}
              </button>
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  openPaymentDialog();
                  openDropdown = null;
                "
              >
                <DollarSign class="w-4 h-4" />
                <span>Payment</span>
                <span class="ml-auto text-xs text-gray-500 dark:text-gray-400">{{
                  settingsStore.state.payment.enabled ? `${paymentAmount}` : "Off"
                }}</span>
              </button>
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                @click="
                  handleWebhooksClick();
                  openDropdown = null;
                "
              >
                <Webhook class="w-4 h-4" />
                {{$t('Commons.button.webhooks')}}
              </button>
              <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                @click="
                  handleDeleteForm();
                  openDropdown = null;
                "
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
                {{$t('Commons.button.delete')}}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
     
    <div v-if="isLoading" class="max-w-3xl mx-auto px-6 py-24 animate-pulse">
      <div class="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
      <div class="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
      <div class="space-y-6">
        <div
          v-for="n in 4"
          :key="n"
          class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-6"
        >
          <div class="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
          <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div class="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>

    <div v-else class="form-builder-new__content max-w-3xl mx-auto px-6 py-12">
       
      <div class="form-builder-new__header mb-12">
         
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
                  <div
                    class="relative group flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl p-2"
                  >
                    <img
                      :src="settingsStore.state.header.logo_url"
                      alt="Logo"
                      class="rounded-lg object-contain"
                      :style="logoStyle"
                    />
                    <div
                      class="absolute inset-0 rounded-xl border border-dashed border-transparent group-hover:border-blue-400 group-hover:bg-blue-500/5 transition-colors"
                    ></div>
                  </div>
                  <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                      class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                      @click="handleLogoClick"
                    >
                      {{$t('Commons.button.change')}}
                    </button>
                    <button
                      class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                      @click="removeLogo"
                    >
                      {{$t('Commons.button.remove')}}
                    </button>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <span
                    class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >{{$t('Commons.text.align')}}</span
                  >
                  <button
                    class="p-2 rounded-lg border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="
                      headerAlignment === 'left'
                        ? 'bg-primary-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    "
                    @click="setLogoAlignment('left')"
                    title="Align left"
                  >
                    <AlignLeft class="w-4 h-4" />
                  </button>
                  <button
                    class="p-2 rounded-lg border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="
                      headerAlignment === 'center'
                        ? 'bg-primary-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    "
                    @click="setLogoAlignment('center')"
                    title="Align center"
                  >
                    <AlignCenter class="w-4 h-4" />
                  </button>
                  <button
                    class="p-2 rounded-lg border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="
                      headerAlignment === 'right'
                        ? 'bg-primary-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    "
                    @click="setLogoAlignment('right')"
                    title="Align right"
                  >
                    <AlignRight class="w-4 h-4" />
                  </button>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <span
                    class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >{{$t('Commons.button.size')}}</span
                  >
                  <div class="flex items-center gap-2">
                    <label class="sr-only" for="logo-size">{{$t('Commons.label.logo_width')}}</label>
                    <input
                      id="logo-size"
                      type="range"
                      min="40"
                      max="200"
                      step="4"
                      v-model.number="logoWidth"
                      class="w-32 accent-blue-600"
                    />
                    <span class="text-xs text-gray-500 dark:text-gray-400 w-12 text-right"
                      >{{ logoWidth }}px</span
                    >
                  </div>
                  <button
                    class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    @click="resetLogoSize"
                  >
                    {{$t('Commons.button.reset')}}
                  </button>
                </div>
              </div>

              <div
                class="rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6"
              >
                <div class="w-full flex" :class="logoAlignmentClass">
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
              <span class="text-sm">{{$t('Commons.text.add_logo')}}</span>
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

       
      <div class="form-builder-new__blocks space-y-3">
        <TransitionGroup name="block-list">
          <div
            v-for="(block, index) in blocks"
            :key="block.id"
            :class="[
              'block-wrapper group rounded-2xl transition-shadow',
              draggingBlockId === block.id ? 'opacity-60 cursor-grabbing' : 'cursor-grab',
              dropIndex === index && draggingBlockId !== block.id
                ? 'ring-2 ring-blue-400 dark:ring-blue-500'
                : '',
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
          :class="
            dropIndex === blocks.length
              ? 'border-blue-400 dark:border-blue-500 bg-blue-500/10 dark:bg-blue-500/10'
              : 'border-gray-200 dark:border-gray-700'
          "
          @dragenter="onDragEnter(blocks.length)"
          @dragover.prevent="onDragOverEnd"
          @drop.prevent="onDropToEnd"
        ></div>
      </div>

       
      <div class="mt-6">
        <button
          class="add-block-button group w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          @click="handleAddBlock"
        >
          <Plus class="w-5 h-5" />
          <span class="text-sm font-medium">{{$t('Views.FormBuilder.text.add_a_question')}}</span>
          <span class="text-xs text-gray-400 dark:text-gray-500 ml-auto"
            >{{$t('Commons.text.or_press')}}
            <kbd
              class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-xs font-mono"
              >/</kbd
            ></span
          >
        </button>
      </div>

       
      <div v-if="blocks.length === 0" class="empty-state mt-20 text-center">
        <div
          class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 mb-6"
        >
          <Sparkles class="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {{$t('Views.FormBuilder.heading.start_building_your_form')}}
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          {{$t('Views.FormBuilder.text.add_questions_customize_fields')}}
        </p>
        <div class="flex items-center justify-center gap-3">
          <button
            class="px-6 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg transition-colors"
            @click="handleAddBlock"
          >
            <Plus class="w-4 h-4 inline mr-2" />
            {{$t('Views.FormBuilder.button.add_first_question')}}
          </button>
          <button
            class="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="handleUseAI"
          >
            <Wand2 class="w-4 h-4 inline mr-2" />
            {{$t('Views.FormBuilder.button.generate_with_ai')}}
          </button>
        </div>
      </div>
    </div>

     
    <SlashMenu
      v-if="showSlashMenu"
      :filter="slashMenuFilter"
      :position="slashMenuPosition"
      @select="handleSlashSelect"
      @close="closeSlashMenu"
    />

     
    <FormConfigWizard
      v-if="showConfigWizard"
      :initial-config="formConfig ?? undefined"
      @complete="handleConfigComplete"
      @skip="handleConfigSkip"
    />

     
    <Teleport to="body">
      <div
        v-if="showPaymentDialog"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="closePaymentDialog"
      >
        <div
          class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{$t('Commons.heading.payment_settings')}}
            </h3>
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="closePaymentDialog"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >{{$t('Views.FormBuilder.label.amount_to_charge')}}</label
              >
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

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >{{$t('Commons.label.payment_mode')}}</label
              >
              <select
                v-model="paymentMode"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="platform">{{$t('Views.FormBuilder.text.use_platform_account')}}</option>
                <option value="custom">{{$t('Views.FormBuilder.text.use_my_own_stripe')}}</option>
              </select>
            </div>

            <div v-if="paymentMode === 'custom'" class="space-y-4">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >{{$t('Views.FormBuilder.label.stripe_publishable_key')}}</label
                >
                <input
                  v-model="publishableKey"
                  type="text"
                  placeholder="pk_live_... or pk_test_..."
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >{{$t('Views.FormBuilder.label.stripe_account_id')}}</label
                >
                <input
                  v-model="stripeAccountId"
                  type="text"
                  placeholder="acct_..."
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div class="flex items-center justify-between">
              <button
                class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                @click="disablePayments"
              >
                {{$t('Commons.button.disable_payments')}}
              </button>
              <div class="flex items-center gap-3">
                <button
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  @click="closePaymentDialog"
                >
                  {{$t('Commons.button.cancel')}}
                </button>
                <button
                  class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg"
                  @click="updatePaymentAmount"
                >
                  {{$t('Commons.button.date')}}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

     
    <Teleport to="body">
      <div
        v-if="showWebhooksPanel"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="closeWebhooksModal"
      >
        <div
          class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full p-0 md:p-6"
        >
          <div class="flex items-start flex-col md:flex-row gap-6">
            <aside
              class="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 px-6 py-4 md:py-0 md:px-0"
            >
              <nav class="flex md:flex-col gap-4 md:gap-3">
                <div
                  class="flex items-center gap-3"
                  :class="
                    webhookStep === 'intro'
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  "
                >
                  <span
                    class="flex items-center justify-center w-7 h-7 rounded-full border"
                    :class="
                      webhookStep === 'intro'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-700'
                    "
                    >1</span
                  >
                  <div>
                    <p class="text-sm leading-none">{{$t('Commons.text.overview')}}</p>
                    <span class="text-xs text-gray-400 dark:text-gray-500"
                      >{{$t('Views.FormBuilder.text.why_webhooks')}}</span
                    >
                  </div>
                </div>
                <div
                  class="flex items-center gap-3"
                  :class="
                    webhookStep === 'configure'
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  "
                >
                  <span
                    class="flex items-center justify-center w-7 h-7 rounded-full border"
                    :class="
                      webhookStep === 'configure'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-700'
                    "
                    >2</span
                  >
                  <div>
                    <p class="text-sm leading-none">{{$t('Commons.text.configure')}}</p>
                    <span class="text-xs text-gray-400 dark:text-gray-500"
                      >{{$t('Commons.text.add_endpoints')}}</span
                    >
                  </div>
                </div>
              </nav>
            </aside>
            <div class="flex-1 px-6 pb-6 md:px-0 md:pb-0">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {{
                      webhookStep === "intro"
                        ? $t('Commons.heading.connect_webhooks')
                        : $t('Views.FormBuilder.heading.configure_webhook_endpoints')
                    }}
                  </h3>
                  <p
                    class="text-sm text-gray-600 dark:text-gray-400"
                    v-if="webhookStep === 'intro'"
                  >
                    {{$t('Views.FormBuilder.text.send_form_responses_and')}}
                  </p>
                </div>
                <button
                  class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  @click="closeWebhooksModal"
                >
                  <X class="w-5 h-5" />
                </button>
              </div>

              <Transition name="fade" mode="out-in">
                <div v-if="webhookStep === 'intro'" key="webhook-intro" class="space-y-6">
                  <div class="grid gap-4">
                    <div
                      class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {{$t('Views.FormBuilder.heading.when_do_webhooks_fire')}}
                      </h4>
                      <ul
                        class="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 space-y-1"
                      >
                        <li>{{$t('Commons.text.form_completed')}}</li>
                        <li>{{$t('Views.FormBuilder.text.payment_succeeded_or_failed')}}</li>
                        <li>{{$t('Commons.text.charge_refunded')}}</li>
                        <li>{{$t('Views.FormBuilder.text.any_custom_events_you')}}</li>
                      </ul>
                    </div>
                    <div
                      class="p-4 rounded-xl border border-gray-200 dark:border-gray-800"
                    >
                      <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {{$t('Views.FormBuilder.heading.how_it_works')}}
                      </h4>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        Provide a secure HTTPS endpoint and we will POST a signed payload
                        whenever the selected events occur. You can pause delivery at any
                        time.
                      </p>
                    </div>
                  </div>
                  <div
                    class="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <button
                      class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      @click="closeWebhooksModal"
                    >
                      {{$t('Views.FormBuilder.button.skip_for_now')}}
                    </button>
                    <div class="flex items-center gap-3">
                      <button
                        class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg"
                        @click="webhookStep = 'configure'"
                      >
                        {{$t('Views.FormBuilder.button.set_up_webhooks')}}
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else key="webhook-configure" class="space-y-6">
                  <WebhooksPanel :form-id="formId" key="webhooks-config" />
                  <div
                    class="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <button
                      class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      @click="webhookStep = 'intro'"
                    >
                      Back
                    </button>
                    <div class="flex items-center gap-3">
                      <button
                        class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg"
                        @click="closeWebhooksModal"
                      >
                        {{$t('Commons.button.date')}}
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

     
    <Teleport to="body">
      <div
        v-if="showImagePicker"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="handleImagePickerCancel"
      >
        <div
          class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ imagePickerMode === "logo" ? $t('Views.FormBuilder.heading.choose_a_logo') : $t('Views.FormBuilder.heading.choose_a_footer_image') }}
            </h3>
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleImagePickerCancel"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <ImagePicker
            :initial-url="
              imagePickerMode === 'logo'
                ? settingsStore.state.header.logo_url
                : settingsStore.state.header.footer_image_url
            "
            :submit-label="imagePickerMode === 'logo' ? 'Use logo' : 'Use image'"
            @submit="handleImageSelected"
            @cancel="handleImagePickerCancel"
          />
        </div>
      </div>
    </Teleport>

     
    <Teleport to="body">
      <div
        v-if="showAIDialog"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="showAIDialog = false"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{$t('Views.FormBuilder.heading.generate_with_ai')}}
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
              {{$t('Commons.button.cancel')}}
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg disabled:opacity-50"
              :disabled="!aiPrompt.trim() || isGenerating"
              @click="handleGenerateAI"
            >
              {{ isGenerating ? "Generating..." : $t('Commons.button.generate') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

     
    <Dialog
      :open="showShareModal"
      @update:open="(value) => (value ? null : closeShareModal())"
    >
      <DialogContent class="w-full max-w-md sm:max-h-[80vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
            <span v-if="!showShareAccessView">
              Share "{{ formTitle || $t('Commons.text.untitled_form') }}"
            </span>
            <span v-else>
              {{$t('Commons.button.manage_access')}}
            </span>
          </DialogTitle>
          <DialogDescription
            v-if="!showShareAccessView"
            class="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400"
          >
            {{$t('Views.FormBuilder.heading.send_the_live_form')}}
          </DialogDescription>
          <DialogDescription
            v-else
            class="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400"
          >
            {{$t('Views.FormBuilder.heading.choose_who_in_your')}}
          </DialogDescription>
        </DialogHeader>

        <div v-if="!showShareAccessView" class="space-y-4 py-2">
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {{$t('Commons.label.share_link')}}
            </label>
            <div class="flex flex-col gap-2 md:flex-row">
              <Input
                :model-value="computedShareLink"
                readonly
                class="sm:flex-1 font-mono text-sm"
                @focus="handleShareLinkFocus"
              />
              <Button
                type="button"
                variant="default"
                :disabled="!computedShareLink"
                @click="copyShareLink"
                >{{$t('Commons.button.copy_link')}}</Button
              >
            </div>
            <div class="flex items-center justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400 gap-3">
              <span class="truncate">
                {{$t('Views.FormBuilder.text.anyone_with_the_link')}}
              </span>
              <Button
                v-if="shareHelperItems.length"
                type="button"
                variant="link"
                size="sm"
                class="px-0 text-xs"
                @click="shareHelperItems[0].action"
              >
                {{$t('Commons.button.open_form')}}
              </Button>
            </div>
          </div>

          <div
            class="space-y-2 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40 p-3"
          >
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div class="space-y-1">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {{$t('Commons.text.visibility')}}
                </p>
                <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {{ shareVisibilityDescription }}
                </p>
              </div>
              <div class="inline-flex rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden mt-2 sm:mt-0">
                <Button
                  type="button"
                  size="sm"
                  :variant="isSharePublic ? 'secondary' : 'ghost'"
                  class="px-3 py-1 text-xs rounded-none"
                  :disabled="isUpdatingShareVisibility"
                  @click="setShareVisibility(true)"
                >
                  {{$t('Commons.button.public')}}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  :variant="!isSharePublic ? 'secondary' : 'ghost'"
                  class="px-3 py-1 text-xs rounded-none border-l border-gray-200 dark:border-gray-700"
                  :disabled="isUpdatingShareVisibility"
                  @click="setShareVisibility(false)"
                >
                  {{$t('Commons.button.org_only')}}
                </Button>
              </div>
            </div>

            <p
              v-if="shareAutoPublic"
              class="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400"
            >
              We've set this form to Public so anyone with the link can respond. You can
              switch it back to organization-only access here.
            </p>
          </div>

          <div
            v-if="isPublishingShare"
            class="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400"
          >
            {{$t('Views.FormBuilder.text.publishing_form_to_generate')}}
          </div>

          <div class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
            <div class="space-y-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <p class="font-semibold">{{$t('Views.FormBuilder.text.collaborators_workspace_access')}}</p>
              <p>{{$t('Views.FormBuilder.text.manage_who_in_your')}}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="showShareAccessView = true"
            >
              {{$t('Commons.button.manage_access')}}
            </Button>
          </div>
        </div>

        <div v-else class="space-y-4 py-2">
          <ShareCard
            mode="doc"
            :share-link="internalShareLink"
            :privacy-type="privacyType"
            :members="shareMembersForCard"
            :can-edit-privacy="true"
            :document-title="formTitle"
            @copy-link="handleInternalCopyLink"
            @change-privacy="handleChangeFormPrivacy"
            @invite="handleInviteCollaborator"
            @update-member="handleUpdateCollaborator"
            @remove-member="handleRemoveCollaborator"
            @close="showShareModal = false"
          />

          <div class="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              @click="showShareAccessView = false"
            >
              {{$t('Views.FormBuilder.button.back_to_share_link')}}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="handleInternalCopyLink"
            >
              {{$t('Views.FormBuilder.button.copy_editor_link')}}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose as-child>
            <Button type="button" variant="secondary" :disabled="isPublishingShare"
              >{{$t('Commons.button.close')}}</Button
            >
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showIntegrationsModal">
      <DialogContent class="w-full max-w-md sm:max-w-2xl sm:max-h-[80vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
            Integrations
          </DialogTitle>
          <DialogDescription class="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Embed your form or submit entries via the public insert API.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-6">
          <div class="space-y-3">
            <div class="text-sm font-medium">Public Insert API (authenticated controls)</div>
            <div class="flex items-center justify-between gap-3">
              <div class="text-xs text-gray-500">Enable API-key-based inserts for this form</div>
              <Switch
                :checked="formPublicApiEnabled"
                :disabled="isUpdatingPublicApi"
                @update:checked="handleSetFormPublicApiEnabled"
              />
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="text-xs text-gray-500">Rotate / generate API key</div>
              <Button
                variant="outline"
                size="sm"
                :disabled="isUpdatingPublicApi || !formId"
                @click="handleRotateFormPublicApiKey"
              >
                {{$t('Commons.button.refresh')}}
              </Button>
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-sm font-medium">Embed form</div>
            <div class="grid gap-2">
              <div class="text-xs text-gray-500">Public URL</div>
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  class="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                  :value="formPublicUrl"
                  readonly
                  @focus="(e:any)=>e?.target?.select?.()"
                />
                <Button size="sm" class="w-full sm:w-auto" variant="outline" :disabled="!formPublicUrl" @click="copyToClipboard(formPublicUrl, 'Public URL copied')">
                  {{$t('Commons.button.copy')}}
                </Button>
              </div>

              <details class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 p-3">
                <summary class="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-200">
                  Show iframe snippet
                </summary>
                <div class="mt-3 space-y-2">
                  <div class="text-xs text-gray-500">Iframe snippet</div>
                  <div class="flex flex-col sm:flex-row gap-2">
                    <textarea
                      class="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                      :value="embedFormSnippet"
                      rows="3"
                      readonly
                      @focus="(e:any)=>e?.target?.select?.()"
                    />
                    <Button size="sm" class="w-full sm:w-auto" variant="outline" :disabled="!embedFormSnippet" @click="copyToClipboard(embedFormSnippet, 'Embed snippet copied')">
                      {{$t('Commons.button.copy')}}
                    </Button>
                  </div>
                </div>
              </details>
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-sm font-medium">Use this form in a website/app</div>
            <div class="text-xs text-gray-500">
              You can submit entries using either the share slug (when public/published/accepting) or the API key (when enabled).
            </div>

            <div class="space-y-3">
              <div class="space-y-2">
                <div class="text-xs text-gray-500">Endpoint (share slug)</div>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input
                    class="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    :value="formPublicInsertEndpointShareSlug"
                    readonly
                    @focus="(e:any)=>e?.target?.select?.()"
                  />
                  <Button size="sm" class="w-full sm:w-auto" variant="outline" :disabled="!formPublicInsertEndpointShareSlug" @click="copyToClipboard(formPublicInsertEndpointShareSlug, 'Endpoint copied')">
                    {{$t('Commons.button.copy')}}
                  </Button>
                </div>
              </div>

              <div class="space-y-2">
                <div class="text-xs text-gray-500">Endpoint (API key)</div>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input
                    class="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    :value="formPublicInsertEndpointApiKey"
                    readonly
                    @focus="(e:any)=>e?.target?.select?.()"
                  />
                  <Button size="sm" class="w-full sm:w-auto" variant="outline" :disabled="!formPublicInsertEndpointApiKey" @click="copyToClipboard(formPublicInsertEndpointApiKey, 'Endpoint copied')">
                    {{$t('Commons.button.copy')}}
                  </Button>
                </div>
              </div>

              <details class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 p-3">
                <summary class="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-200">
                  Show example payload
                </summary>
                <div class="mt-3">
                  <div class="text-xs text-gray-500">Example payload</div>
                  <pre class="text-xs rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 overflow-auto">{
  "answers": [
    { "question_id": 123, "value": "test@example.com" },
    { "question_id": 124, "value": "Alice" }
  ],
  "submit": true,
  "source": "public_api",
  "meta": { "campaign": "winter" }
}</pre>
                </div>
              </details>
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-sm font-medium">Get API Form Secret</div>
            <div class="text-xs text-gray-500">This is the form's public API key used in the endpoint path.</div>
            <details class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 p-3">
              <summary class="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-200">
                Reveal API key
              </summary>
              <div class="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  class="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                  :value="formPublicApiKey"
                  readonly
                  @focus="(e:any)=>e?.target?.select?.()"
                />
                <Button size="sm" class="w-full sm:w-auto" variant="outline" :disabled="!formPublicApiKey" @click="copyToClipboard(formPublicApiKey, 'API key copied')">
                  {{$t('Commons.button.copy')}}
                </Button>
              </div>
            </details>
          </div>
        </div>

        <DialogFooter>
          <DialogClose as-child>
            <Button type="button" variant="secondary">{{$t('Commons.button.close')}}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Eye,
  Send,
  Plus,
  Sparkles,
  Wand2,
  X,
  Settings,
  DollarSign,
  Image as ImageIcon,
  Webhook,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Share2,
  Plug,
} from "lucide-vue-next";
import { toast } from "@/composables/useToast";
import BlockItemNew from "@/components/forms/blocks/BlockItemNew.vue";
import SlashMenu from "@/components/forms/blocks/SlashMenu.vue";
import FormConfigWizard from "@/components/forms/FormConfigWizardSimple.vue";
import WebhooksPanel from "@/components/forms/WebhooksPanel.vue";
import ImagePicker from "@/components/ImagePicker.vue";
import ShareCard from "@/components/ShareCard.vue";
import axios from "axios";
import type { FormBlock } from "@/components/forms/blocks/types";
import type { FormConfig } from "@/components/forms/FormConfigWizardSimple.vue";
import type { FormDefinition, FormPage, FormQuestion, Option } from "@/types";
import { useFormStore } from "@/store/forms";
import { useFormSettingsStore } from "@/store/formSettings";
import { useAuthStore } from "@/store/auth";
import {
  parseSharingInfoString,
  serializeSharingInfoString,
  labelToShareLevel,
  type ShareMember,
  type ShareLevel,
  type ShareLevelLabel,
} from "@/utils/sharing";
import { generateCompleteForm } from "../services/ai";
import Input from "@/components/ui/input/Input.vue";
import Button from "@/components/ui/button/Button.vue";
import Switch from "@/components/ui/switch/Switch.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { t } from '@/i18n';

const route = useRoute();
const router = useRouter();
const formStore = useFormStore();
const settingsStore = useFormSettingsStore();
const authStore = useAuthStore();

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
const webhookStep = ref<"intro" | "configure">("intro");
const showImagePicker = ref(false);
const imagePickerMode = ref<"logo" | "footer">("logo");
const showPaymentDialog = ref(false);
const paymentAmount = ref("5.00");
const paymentMode = ref(settingsStore.state.payment.mode || "platform");
const publishableKey = ref(settingsStore.state.payment.stripe_publishable_key || "");
const stripeAccountId = ref(settingsStore.state.payment.stripe_account_id || "");

const acceptingResponses = ref(true);
const showShareModal = ref(false);
const showIntegrationsModal = ref(false);
const formPublicApiEnabled = ref(false);
const formPublicApiKey = ref('');
const isUpdatingPublicApi = ref(false);
const isPublishingShare = ref(false);
const shareTarget = ref<any>(null);
const shareAutoPublic = ref(false);
const showShareAccessView = ref(false);
const isUpdatingShareVisibility = ref(false);
const privacyType = ref<number>(7);
const shareMembers = ref<ShareMember[]>([]);
const shareMembersForCard = computed(() => shareMembers.value);

const formOwnerId = ref<string | null>(null);
const currentUserId = computed(() => authStore.employeeId || authStore.userId || "");
const isFormOwner = computed(() => {
  if (!formOwnerId.value || !currentUserId.value) return false;
  return String(formOwnerId.value) === String(currentUserId.value);
});

const canEditPayments = computed(() => {
  const mode = settingsStore.state.payment.mode || "platform";
  if (mode === "platform" && !isFormOwner.value) {
    return false;
  }
  return true;
});

// Dropdown state management
const openDropdown = ref<string | null>(null);
const toggleDropdown = (dropdownName: string) => {
  openDropdown.value = openDropdown.value === dropdownName ? null : dropdownName;
};

// Check if form is published
const isFormPublished = computed(() => {
  const form = formStore.allForms.find((f) => f.id === formId.value);
  return form?.status === "published";
});

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const FORMS_ENDPOINT = `${API_BASE_URI}/app-forms`;

const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;

const formShareSlug = computed(() => {
  const form = formStore.allForms.find((f) => f.id === formId.value) as any;
  return (form?.sharing?.share_slug ?? form?.slug ?? '') as string;
});

const formPublicUrl = computed(() => {
  if (formShareSlug.value) return `${SHARE_BASE_URL}/share/form/${formShareSlug.value}`;
  if (formId.value) return `${window.location.origin}/f/by-id/${formId.value}`;
  return '';
});

const embedFormSnippet = computed(() => {
  const link = formPublicUrl.value;
  if (!link) return '';
  return `<iframe src="${link}" style="width:100%;height:700px;border:0" loading="lazy" referrerpolicy="no-referrer"></iframe>`;
});

const formPublicInsertEndpointShareSlug = computed(() => {
  if (!formShareSlug.value) return '';
  return `${API_BASE_URI}/public/forms/${formShareSlug.value}/entries`;
});

const formPublicInsertEndpointApiKey = computed(() => {
  if (!formPublicApiKey.value) return '';
  return `${API_BASE_URI}/public/forms/${formPublicApiKey.value}/entries`;
});

const computedShareLink = computed(() => {
  const target: any = shareTarget.value;
  if (!target) return "";
  const shareSlug = target?.sharing?.share_slug ?? target?.slug;
  if (shareSlug) return `${SHARE_BASE_URL}/share/form/${shareSlug}`;
  if (target?.id) return `${window.location.origin}/f/by-id/${target.id}`;
  return "";
});

const internalShareLink = computed(() => {
  return window.location.href;
});

const isSharePublic = computed(() => {
  const target: any = shareTarget.value;
  return Boolean(target?.sharing?.is_public);
});

const shareVisibilityDescription = computed(() => {
  if (!shareTarget.value) return "";
  return isSharePublic.value
    ? "Anyone with the link can respond."
    : "Only people in your organization (and invited collaborators) can access this form.";
});

const shareHelperItems = computed(() => {
  const link = computedShareLink.value;
  if (!link) return [] as any[];
  return [
    {
      label: "Open form",
      action: () => window.open(link, "_blank", "noopener,noreferrer"),
    },
  ];
});
const copyShareLink = async () => {
  const link = computedShareLink.value;
  if (!link) {
    toast.error("Share link unavailable. Publish the form to get a shareable link.");
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    toast.success("Share link copied to clipboard");
  } catch {
    toast.error("Unable to copy link. Try copying manually.");
  }
};
const handleInternalCopyLink = async () => {
  const link = internalShareLink.value;
  try {
    await navigator.clipboard.writeText(link);
    toast.success("Editor link copied to clipboard");
  } catch {
    toast.error("Unable to copy link. Try copying manually.");
  }
};
const handleShareLinkFocus = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement | null;
  target?.select();
};

const copyToClipboard = async (value: string, successMessage: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error("Unable to copy. Try copying manually.");
  }
};
const closeShareModal = () => {
  if (isPublishingShare.value) return;
  showShareModal.value = false;
  shareTarget.value = null;
  shareAutoPublic.value = false;
};
const openShareModal = async () => {
  shareAutoPublic.value = false;
  showShareAccessView.value = false;
  const target = formStore.allForms.find((f) => f.id === formId.value) ?? {
    id: formId.value,
  };
  shareTarget.value = target;
  showShareModal.value = true;
  const hasShareSlug = (target as any).sharing?.share_slug || (target as any).slug;
  if (hasShareSlug) return;
  try {
    isPublishingShare.value = true;
    const updated = await ensurePublishedShareSlug();
    if (updated?.sharing?.share_slug) {
      shareTarget.value = updated;
      await navigator.clipboard.writeText(
        `${SHARE_BASE_URL}/share/form/${updated.sharing.share_slug}`
      );
      toast.success("Form published. Share link copied to clipboard.");
    } else {
      toast.error("Unable to generate share slug. Please publish manually.");
    }
  } finally {
    isPublishingShare.value = false;
  }
};

const hydrateFormSharing = async () => {
  if (!formId.value) return;
  try {
    const response = await axios.get(`${FORMS_ENDPOINT}/${formId.value}`);
    const payload = response.data?.data || response.data?.form || response.data || {};
    if (typeof payload.privacy_type === "number") {
      privacyType.value = Number(payload.privacy_type);
    }
    shareMembers.value = parseSharingInfoString(payload.sharing_info);
    formPublicApiEnabled.value = Boolean(payload.public_api_enabled);
    formPublicApiKey.value = (payload.public_api_key || payload.publicApiKey || '') as string;
  } catch (error) {
    console.warn("Failed to hydrate form sharing details", error);
  }
};

const openIntegrationsModal = async () => {
  await hydrateFormSharing();
  showIntegrationsModal.value = true;
};

const handleSetFormPublicApiEnabled = async (enabled: boolean) => {
  if (!formId.value) return;
  if (isUpdatingPublicApi.value) return;
  isUpdatingPublicApi.value = true;
  try {
    const res = await axios.put(`${FORMS_ENDPOINT}/${formId.value}/public-api`, { enabled });
    const payload = res.data?.data || res.data || {};
    formPublicApiEnabled.value = Boolean(payload.public_api_enabled ?? enabled);
    formPublicApiKey.value = (payload.public_api_key || formPublicApiKey.value || '') as string;
    toast.success(formPublicApiEnabled.value ? 'Public API enabled' : 'Public API disabled');
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to update Public API settings');
  } finally {
    isUpdatingPublicApi.value = false;
  }
};

const handleRotateFormPublicApiKey = async () => {
  if (!formId.value) return;
  if (isUpdatingPublicApi.value) return;
  isUpdatingPublicApi.value = true;
  try {
    const res = await axios.post(`${FORMS_ENDPOINT}/${formId.value}/public-api/key`);
    const payload = res.data?.data || res.data || {};
    formPublicApiEnabled.value = Boolean(payload.public_api_enabled ?? formPublicApiEnabled.value);
    formPublicApiKey.value = (payload.public_api_key || payload.publicApiKey || '') as string;
    toast.success('API key updated');
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to rotate API key');
  } finally {
    isUpdatingPublicApi.value = false;
  }
};

const handleChangeFormPrivacy = async (next: number) => {
  if (!formId.value) return;
  try {
    const response = await axios.patch(`${FORMS_ENDPOINT}/${formId.value}`, {
      privacy_type: next,
    });
    const payload = response.data?.data || response.data?.form || response.data || {};
    privacyType.value = Number(payload.privacy_type ?? next);
    toast.success("Visibility updated");
  } catch (error) {
    console.error("Failed to update form privacy_type", error);
    toast.error("Unable to update access level");
  }
};

type ShareCardPayload = {
  email: string;
  shareLevel?: ShareLevel;
  label?: ShareLevelLabel;
  note?: string;
  permission?: "view" | "comment" | "edit" | "owner";
};

const handleInviteCollaborator = async (payload: ShareCardPayload) => {
  if (!formId.value) return;
  const resolvedLevel: ShareLevel = (() => {
    if (payload.shareLevel) return payload.shareLevel;
    if (payload.permission) {
      const mapped = payload.permission === "owner" ? "edit" : payload.permission;
      return labelToShareLevel(mapped as ShareLevelLabel);
    }
    if (payload.label) return labelToShareLevel(payload.label);
    return "v";
  })();

  const newMembers: ShareMember[] = [
    ...shareMembers.value.filter((member) => member.email !== payload.email),
    { email: payload.email, shareLevel: resolvedLevel },
  ];

  const sharingInfo = serializeSharingInfoString(newMembers);

  try {
    await axios.patch(`${FORMS_ENDPOINT}/${formId.value}`, { sharing_info: sharingInfo });
    shareMembers.value = newMembers;
    toast.success("Collaborator updated");
  } catch (error) {
    console.error("Failed to update collaborators", error);
    toast.error("Unable to update collaborators");
  }
};

const handleUpdateCollaborator = (payload: ShareCardPayload) => {
  return handleInviteCollaborator(payload);
};

const handleRemoveCollaborator = async (payload: { email: string }) => {
  if (!formId.value) return;
  const newMembers: ShareMember[] = shareMembers.value.filter(
    (member) => member.email !== payload.email,
  );
  const sharingInfo = serializeSharingInfoString(newMembers);
  try {
    await axios.patch(`${FORMS_ENDPOINT}/${formId.value}`, { sharing_info: sharingInfo });
    shareMembers.value = newMembers;
    toast.success("Access removed");
  } catch (error) {
    console.error("Failed to remove collaborator", error);
    toast.error("Unable to remove collaborator");
  }
};

const DEFAULT_LOGO_WIDTH = 96;
const MIN_LOGO_WIDTH = 40;
const MAX_LOGO_WIDTH = 200;
const clampLogoWidth = (value: number) =>
  Math.round(Math.min(MAX_LOGO_WIDTH, Math.max(MIN_LOGO_WIDTH, value)));

const logoWidth = ref<number>(
  typeof settingsStore.state.header.logo_width === "number"
    ? clampLogoWidth(settingsStore.state.header.logo_width)
    : DEFAULT_LOGO_WIDTH
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

const setShareVisibility = async (makePublic: boolean): Promise<boolean> => {
  if (!formId.value) {
    return false;
  }

  if (isUpdatingShareVisibility.value) {
    // Another visibility update is in progress; treat as no-op.
    return isSharePublic.value === makePublic;
  }

  // No-op if already in requested state
  if (isSharePublic.value === makePublic) {
    return true;
  }

  isUpdatingShareVisibility.value = true;
  try {
    const updated = await formStore.updateFormSharing(formId.value, {
      is_public: makePublic,
    });

    if (updated) {
      const current: any = shareTarget.value ?? { id: formId.value };
      shareTarget.value = {
        ...current,
        sharing: {
          ...(current.sharing ?? {}),
          ...updated,
        },
      };
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to update form visibility:", error);
    return false;
  } finally {
    isUpdatingShareVisibility.value = false;
  }
};

const resetLogoSize = () => {
  logoWidth.value = DEFAULT_LOGO_WIDTH;
};

const handleToggleAccepting = async () => {
  const next = !acceptingResponses.value;
  const nextSettings: any = { integrations: undefined, responses: { accepting: next } };
  const updated = await formStore.updateForm(formId.value, ({
    settings: nextSettings,
  } as unknown) as FormDefinition);
  if (updated) {
    acceptingResponses.value = next;
    if (next) {
      toast.success("Form will accept new submissions.");
    } else {
      toast.info("Form will not accept new submissions.");
    }
  } else {
    toast.error("Unable to update response settings.");
  }
};

const handleDeleteForm = async () => {
  if (!formId.value) return;
  if (!window.confirm("Delete this form? This action cannot be undone.")) return;
  const ok = await formStore.deleteForm(formId.value);
  if (ok) {
    router.push({ name: "forms" });
  } else {
    toast.error("Could not delete form.");
  }
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
  const type = mapToSupportedType((block.type as unknown) as string);
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

const serializeBlockToQuestion = (
  block: NormalizedFormBlock,
  pageId: string
): Partial<FormQuestion> => {
  const question: Partial<FormQuestion> & Record<string, unknown> = {
    id: block.id,
    page_id: pageId,
    type: block.type as any,
    category: block.category as any,
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
  fontFamily:
    (settingsStore.state.typography.body_font_family?.toLowerCase() as FormConfig["fontFamily"]) ||
    "system",
  primaryColor: settingsStore.state.theme.primary_color ?? "#3B82F6",
  enableWebhooks: Boolean((settingsStore.state.settings as any)?.webhook_url),
  webhookUrl: (settingsStore.state.settings as any)?.webhook_url || "",
  showLogo: Boolean(
    settingsStore.state.header.enabled && settingsStore.state.header.logo_url
  ),
  logoUrl: settingsStore.state.header.logo_url || "",
  showFooter: Boolean(settingsStore.state.header.footer_image_url),
  footerImageUrl: settingsStore.state.header.footer_image_url || "",
  labelPlacement: settingsStore.state.settings.label_placement ?? "stacked",
  formDensity: settingsStore.state.settings.form_density ?? "comfortable",
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
  if (!canEditPayments.value) {
    toast.error(
      "Only the form owner can update payment settings when using platform payments.",
    );
    return;
  }
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
  paymentMode.value = settingsStore.state.payment.mode || "platform";
  publishableKey.value = settingsStore.state.payment.stripe_publishable_key || "";
  stripeAccountId.value = settingsStore.state.payment.stripe_account_id || "";
  showPaymentDialog.value = true;
};

const closePaymentDialog = () => {
  syncPaymentAmountFromStore();
  showPaymentDialog.value = false;
};

const disablePayments = () => {
  if (!canEditPayments.value) {
    toast.error(
      "Only the form owner can update payment settings when using platform payments.",
    );
    return;
  }
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
    label_placement: config.labelPlacement,
    form_density: config.formDensity,
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
    lastSaved.value = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
  const index = blocks.value.findIndex((b) => b.id === updatedBlock.id);
  if (index !== -1) {
    blocks.value[index] = updatedBlock;
    triggerSave();
  }
};

const handleBlockDelete = (blockId: string) => {
  blocks.value = blocks.value.filter((b) => b.id !== blockId);
  triggerSave();
};

const handleBlockDuplicate = (blockId: string) => {
  const index = blocks.value.findIndex((b) => b.id === blockId);
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
  const index = blocks.value.findIndex((b) => b.id === blockId);
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
  const index = blocks.value.findIndex((b) => b.id === blockId);
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

const openSlashMenu = (payload: {
  blockId: string;
  filter: string;
  position: { top: number; left: number };
}) => {
  showSlashMenu.value = true;
  slashMenuFilter.value = payload.filter;
  slashMenuPosition.value = payload.position;
  focusedBlockId.value = payload.blockId;
};

const draggingBlockId = ref<string | null>(null);
const dropIndex = ref<number | null>(null);

const applyBlockReorder = (fromIndex: number, toIndex: number) => {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= blocks.value.length
  ) {
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

  if (
    (type === "radio" || type === "checkbox" || type === "select") &&
    (!block.options || block.options.length === 0)
  ) {
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
  if (!canEditPayments.value) {
    toast.error(
      "Only the form owner can update payment settings when using platform payments.",
    );
    return;
  }
  const amount = parseFloat(paymentAmount.value) || 5;
  const clamped = Math.max(1, Math.min(100, amount));
  paymentAmount.value = clamped.toFixed(2);
  settingsStore.updatePayment({
    amount_cents: Math.round(clamped * 100),
    mode: paymentMode.value as any,
    stripe_publishable_key:
      paymentMode.value === "custom" ? publishableKey.value || undefined : undefined,
    stripe_account_id:
      paymentMode.value === "custom" ? stripeAccountId.value || undefined : undefined,
  });
  showPaymentDialog.value = false;
  triggerSave();
};

const handleLogoClick = () => {
  imagePickerMode.value = "logo";
  showImagePicker.value = true;
};

const handleImageSelected = (url: string) => {
  if (imagePickerMode.value === "logo") {
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
  webhookStep.value = "intro";
  showWebhooksPanel.value = true;
};

const closeWebhooksModal = () => {
  showWebhooksPanel.value = false;
};

const ensurePublishedShareSlug = async (): Promise<FormDefinition | null> => {
  if (!formId.value) return null;
  console.log("Ensure published share slug for form:", formId.value);
  const latest = await formStore.fetchForm(formId.value);
  console.log("Latest form:", latest);

  const alreadyPublished = latest?.status === "published";
  const existingShareSlug = latest?.sharing?.share_slug;
  console.log("Already published:", alreadyPublished);
  console.log("Existing share slug:", existingShareSlug);

  if (alreadyPublished && existingShareSlug) {
    return latest;
  }

  const published = await formStore.publishForm(formId.value);
  console.log("Published form:", published);
  if (published?.status === "published" && published?.sharing?.share_slug) {
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
  const shareSlug = definition?.sharing?.share_slug;
  const target =
    isPublished && shareSlug ? `/f/${shareSlug}` : `/f/by-id/${formId.value}`;

  window.open(target, "_blank");
};

const handlePublish = async () => {
  if (!formId.value || blocks.value.length === 0) return;
  console.log("Publishing form...");

  isPublishing.value = true;
  try {
    await saveForm();
    const definition = await ensurePublishedShareSlug();
    console.log("Published form:", definition);
    if (definition) {
      let effectiveDefinition: any = definition;
      let autoMadePublic = false;

      // Ensure the form is public on publish so anyone with the link can respond
      if (!definition.sharing?.is_public) {
        try {
          const updatedSharing = await formStore.updateFormSharing(formId.value, {
            is_public: true,
          });
          if (updatedSharing) {
            effectiveDefinition = {
              ...definition,
              sharing: {
                ...(definition.sharing ?? {}),
                ...updatedSharing,
              },
            };
            autoMadePublic = Boolean(updatedSharing.is_public);
          }
        } catch (error) {
          console.error("Failed to auto-set form visibility to public on publish:", error);
        }
      }

      const shareSlug = effectiveDefinition.sharing?.share_slug;
      toast.success(
        shareSlug
          ? `Form published${autoMadePublic ? " and set to public" : ""}. Share link ready.`
          : "Form published but share slug is unavailable"
      );

      // Show Share dialog so user can immediately see and, if desired, change visibility back
      shareTarget.value = effectiveDefinition;
      shareAutoPublic.value = autoMadePublic;
      showShareModal.value = true;
    }
  } catch (error) {
    console.error("Failed to publish form:", error);
    const fallbackMessage = t('Views.FormBuilder.text.failed_to_publish_form_2');
    if (
      error &&
      typeof error === "object" &&
      "data" in error &&
      typeof (error as any).data?.message === "string"
    ) {
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

// Close dropdowns on route change
watch(
  () => route.path,
  () => {
    openDropdown.value = null;
  }
);

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
    formConfig.value.showLogo = Boolean(
      settingsStore.state.header.enabled && settingsStore.state.header.logo_url
    );
    if (typeof settingsStore.state.header.logo_width === "number") {
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
      // Initialize accepting responses from form settings if present
      try {
        const accepting = (form as any)?.settings?.responses?.accepting;
        if (typeof accepting === "boolean") {
          acceptingResponses.value = accepting;
        }
      } catch {}

      // Load settings from form
      settingsStore.hydrateFromDefinition(form as any);
      formConfig.value = buildConfigFromSettings();
      syncPaymentAmountFromStore();

      formOwnerId.value = (form as any).owner_id ?? null;

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
          question_order: Array.isArray((p as any).question_order)
            ? (p as any).question_order
            : [],
          ...((p as any).metadata ? { metadata: (p as any).metadata } : {}),
        }));

        sortedPages.forEach((page, pageIndex) => {
          if (pageIndex === 0 && page.description) {
            formDescription.value = page.description;
          }
          const pageQuestions =
            form.questions?.filter((q) => q.page_id === page.id) || [];
          const sortedQuestions = [...pageQuestions].sort((a, b) => {
            const posA = (a as any).position || 0;
            const posB = (b as any).position || 0;
            return posA - posB;
          });
          sortedQuestions.forEach((q) => {
            allBlocks.push(
              normalizeBlock({
                id: q.id,
                type: q.type as any,
                category: q.category as any,
                question: q.question || "",
                description: q.description,
                placeholder: q.placeholder,
                required: q.required || false,
                options: (q as any).options?.map((opt: any) =>
                  typeof opt === "string" ? opt : opt.label || opt.value
                ),
                pageId: q.page_id,
              } as any)
            );
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
  await hydrateFormSharing();
  isLoading.value = false;

  // Close dropdowns on outside click and Escape
  const handleClickOutside = (e: MouseEvent) => {
    const topbar = document.querySelector(".form-builder-new__topbar");
    if (topbar && !topbar.contains(e.target as Node)) {
      openDropdown.value = null;
    }
  };
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      openDropdown.value = null;
    }
  };
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleEscape);

  onBeforeUnmount(() => {
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleEscape);
  });
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
