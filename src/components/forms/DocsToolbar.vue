<template>
  <div class="tiptap-toolbar bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700" :class="{ 'is-expanded': isExpanded }">
    <div class="tiptap-toolbar__main">
      <!-- Toggle Expand/Collapse -->
      <button
        class="tiptap-toolbar__crystal-toggle bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 dark:from-blue-500 dark:via-blue-700 dark:to-blue-900"
        :class="{ 'is-expanded': isExpanded }"
        :title="isExpanded ? 'Collapse toolbar' : 'Expand toolbar'"
        @click="toggleExpanded"
      >
        <span class="crystal-icon">▼</span>
      </button>

      <span class="tiptap-toolbar__divider" />

      <!-- File Section (Expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label text-gray-500 dark:text-gray-400">New</div>
      <!-- New File Menu -->
      <button
        class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
        title="New Document"
        @click="showNewFileDialog = true"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <div v-if="isExpanded" class="tiptap-toolbar__group">

      <span class="tiptap-toolbar__divider bg-gray-300 dark:bg-gray-600" />
        <button class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Export PDF" @click="handleExport('pdf')">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </button>
        <button class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400" @click="handleExport('docx')" title="Export Word">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400" @click="handleExport('html')" title="Export HTML">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
        <button class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400" @click="handlePrint" title="Print">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
      </div>
      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Undo/Redo -->
      <div class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          title="Undo (Ctrl+Z)"
          :disabled="!editor?.can().undo()"
          @click="editor?.chain().focus().undo().run()"
        >
          ↶
        </button>
        <button
          class="tiptap-toolbar__btn"
          title="Redo (Ctrl+Y)"
          :disabled="!editor?.can().redo()"
          @click="editor?.chain().focus().redo().run()"
        >
          ↷
        </button>
      </div>

      <span class="tiptap-toolbar__divider" />

      <!-- Font -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Font</div>
      <div class="tiptap-toolbar__group">
        <select
          class="tiptap-toolbar__select bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm"
          :value="selectedFontFamily"
          title="Font Family"
          @change="onFontFamilyChange"
        >
          <option value="">Default</option>
          <option v-for="font in fontFamilies" :key="font.value" :value="font.value">
            {{ font.label }}
          </option>
        </select>
        <select
          class="tiptap-toolbar__select tiptap-toolbar__select--small bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm"
          :value="selectedFontSize"
          title="Font Size"
          @change="onFontSizeChange"
        >
          <option value="">Auto</option>
          <option v-for="size in fontSizes" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </div>

      <span class="tiptap-toolbar__divider" />

      <!-- Text Formatting (label only in expanded) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Text Formatting</div>
      <div class="tiptap-toolbar__group">
        <!-- Basic Formatting (Always visible) -->
        <button
          :class="['tiptap-toolbar__btn', btnClasses, editor?.isActive('bold') && btnActiveClasses]"
          title="Bold (Ctrl+B)"
          @click="editor?.chain().focus().toggleBold().run()"
        >
          <strong>B</strong>
        </button>
        <button
          :class="['tiptap-toolbar__btn', btnClasses, editor?.isActive('italic') && btnActiveClasses]"
          title="Italic (Ctrl+I)"
          @click="editor?.chain().focus().toggleItalic().run()"
        >
          <em>I</em>
        </button>
        <button
          :class="['tiptap-toolbar__btn', btnClasses, editor?.isActive('underline') && btnActiveClasses]"
          title="Underline (Ctrl+U)"
          @click="editor?.chain().focus().toggleUnderline().run()"
        >
          <u>U</u>
        </button>
        <button
          :class="['tiptap-toolbar__btn', btnClasses, editor?.isActive('strike') && btnActiveClasses]"
          title="Strikethrough"
          @click="editor?.chain().focus().toggleStrike().run()"
        >
          <s>S</s>
        </button>
        <button
          v-if="isExpanded"
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('code') }"
          title="Inline Code"
          @click="editor?.chain().focus().toggleCode().run()"
        >
          &lt;/&gt;
        </button>
        <span v-if="isExpanded" class="tiptap-toolbar__divider" />

        <!-- Text & Background Colors (Expanded) -->
        <div v-if="isExpanded" class="tiptap-toolbar__section-label">Colors</div>

        <div v-if="isExpanded" class="tiptap-toolbar__color-picker">
          <label title="Text Color" :style="{ borderBottomColor: currentTextColor, borderBottomWidth: '3px', borderBottomStyle: 'solid' }">
            <span class="tiptap-toolbar__color-label" :style="{ color: currentTextColor }">A</span>
            <input 
              type="color" 
              :value="currentTextColor"
              @input="onTextColorChange"
              class="tiptap-toolbar__color-input"
            />
          </label>
        </div>
        <div v-if="isExpanded" class="tiptap-toolbar__color-picker">
          <label title="Background Color" :style="{ backgroundColor: currentBgColor }">
            <span class="tiptap-toolbar__color-label" style="text-decoration: underline;">A</span>
            <input 
              type="color" 
              :value="currentBgColor"
              @input="onBgColorChange"
              class="tiptap-toolbar__color-input"
            />
          </label>
        </div>
      </div>

      <span class="tiptap-toolbar__divider" />

      <!-- Paragraph (label only in expanded) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Paragraph</div>
      <div class="tiptap-toolbar__group">
        <!-- Text Align (Always visible) -->
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }"
          title="Align Left"
          @click="editor?.chain().focus().setTextAlign('left').run()"
        >
          ⫴
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }"
          title="Center"
          @click="editor?.chain().focus().setTextAlign('center').run()"
        >
          ≡
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }"
          title="Align Right"
          @click="editor?.chain().focus().setTextAlign('right').run()"
        >
          ⫵
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('bulletList') }"
          title="Bullet List"
          @click="editor?.chain().focus().toggleBulletList().run()"
        >
          ☰
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('orderedList') }"
          title="Numbered List"
          @click="editor?.chain().focus().toggleOrderedList().run()"
        >
          ≡
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Page Layout (Expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Page</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <select
          class="tiptap-toolbar__select"
          :value="pageSize || 'a4'"
          title="Page Size"
          @change="onPageSizeChange"
        >
          <option value="a4">A4 (210 × 297mm)</option>
          <option value="a3">A3 (297 × 420mm)</option>
          <option value="letter">Letter (8.5 × 11")</option>
          <option value="legal">Legal (8.5 × 14")</option>
          <option value="card">Card (3.5 × 2")</option>
        </select>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': (pageOrientation || 'portrait') === 'portrait' }"
          @click="handleOrientation('portrait')"
          title="Portrait"
        >
          📄
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': (pageOrientation || 'portrait') === 'landscape' }"
          @click="handleOrientation('landscape')"
          title="Landscape"
        >
          📃
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Headings (expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Headings</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
          title="Heading 1"
          @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
        >
          H1
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
          title="Heading 2"
          @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
        >
          H2
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
          title="Heading 3"
          @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
        >
          H3
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 4 }) }"
          title="Heading 4"
          @click="editor?.chain().focus().toggleHeading({ level: 4 }).run()"
        >
          H4
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 5 }) }"
          title="Heading 5"
          @click="editor?.chain().focus().toggleHeading({ level: 5 }).run()"
        >
          H5
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 6 }) }"
          title="Heading 6"
          @click="editor?.chain().focus().toggleHeading({ level: 6 }).run()"
        >
          H6
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Advanced (expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Advanced</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('subscript') }"
          title="Subscript"
          @click="editor?.chain().focus().toggleSubscript().run()"
        >
          X<sub style="font-size: 0.6em;">₂</sub>
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('superscript') }"
          title="Superscript"
          @click="editor?.chain().focus().toggleSuperscript().run()"
        >
          X<sup style="font-size: 0.6em;">²</sup>
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Blocks (expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Blocks</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('blockquote') }"
          title="Blockquote"
          @click="editor?.chain().focus().toggleBlockquote().run()"
        >
          "
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('codeBlock') }"
          title="Code Block"
          @click="editor?.chain().focus().toggleCodeBlock().run()"
        >
          {
        </button>
        <button
          class="tiptap-toolbar__btn"
          title="Horizontal Line"
          @click="editor?.chain().focus().setHorizontalRule().run()"
        >
          ─
        </button>
      </div>

      <span class="tiptap-toolbar__divider" />

      <!-- More -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">More</div>
      <div class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('taskList') }"
          title="Task List"
          @click="editor?.chain().focus().toggleTaskList().run()"
        >
          ☑
        </button>
        
        <!-- Table Insert with Dialog -->
        <button
          class="tiptap-toolbar__btn"
          title="Insert Table"
          @click="showTableDialog = true"
        >
          ⊞
        </button>
        
        <!-- Link Insert with Dialog -->
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('link') }"
          title="Insert/Edit Link"
          @click="openLinkDialog"
        >
          🔗
        </button>
        
        <!-- Image Insert with Dialog -->
        <button
          v-if="isExpanded"
          class="tiptap-toolbar__btn"
          title="Insert Image"
          @click="showImageDialog = true"
        >
          🖼️
        </button>
      </div>
      
      <!-- Comment/Chat Icon (Always visible at end) -->
      <div class="tiptap-toolbar__group" style="margin-left: auto;">
        <button
          class="tiptap-toolbar__btn"
          title="Comments & Chat"
          @click="$emit('toggle-comments')"
        >
          💬
        </button>
      </div>
    </div>
  </div>

  <!-- Dialogs -->
  <!-- Table Insert Dialog -->
  <Dialog v-model:open="showTableDialog">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Insert Table</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <label class="text-right text-sm font-medium">Rows:</label>
          <input type="number" v-model.number="tableRows" min="1" max="20" class="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <label class="text-right text-sm font-medium">Columns:</label>
          <input type="number" v-model.number="tableCols" min="1" max="10" class="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <label class="text-right text-sm font-medium">Style:</label>
          <select v-model="tableStyle" class="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="default">Default</option>
            <option value="striped">Striped Rows</option>
            <option value="bordered">Bordered</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="tableWithHeader" id="header-check" class="h-4 w-4" />
          <label for="header-check" class="text-sm font-medium">Include header row</label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showTableDialog = false">Cancel</Button>
        <Button @click="insertTable">Insert</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Link Insert Dialog -->
  <Dialog v-model:open="showLinkDialog">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ linkUrl ? 'Edit' : 'Insert' }} Link</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <label class="text-sm font-medium">URL:</label>
          <input type="url" v-model="linkUrl" placeholder="https://example.com" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" @keydown.enter="applyLink" />
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="linkOpenInNewTab" id="new-tab-check" class="h-4 w-4" />
          <label for="new-tab-check" class="text-sm font-medium">Open in new tab</label>
        </div>
      </div>
      <DialogFooter>
        <Button v-if="editor?.isActive('link')" variant="destructive" @click="removeLink">Remove</Button>
        <Button variant="outline" @click="showLinkDialog = false">Cancel</Button>
        <Button @click="applyLink">Apply</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Image Insert Dialog -->
  <Dialog v-model:open="showImageDialog">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Insert Image</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <label class="text-sm font-medium">Image URL:</label>
          <input type="url" v-model="imageUrl" placeholder="https://example.com/image.jpg" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" @keydown.enter="applyImage" />
        </div>
        <div class="grid gap-2">
          <label class="text-sm font-medium">Alt Text (optional):</label>
          <input type="text" v-model="imageAlt" placeholder="Description of image" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showImageDialog = false">Cancel</Button>
        <Button @click="applyImage">Insert</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- New File Dialog with Templates -->
  <Dialog v-model:open="showNewFileDialog">
    <DialogContent class="sm:max-w-4xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle>Create New Document</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
        <div class="grid grid-cols-3 gap-4">
          <!-- Blank Document -->
          <button @click="createFromTemplate('blank')" class="group flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all">
            <div class="w-full h-32 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded mb-3 flex items-center justify-center">
              <svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Blank Document</span>
          </button>

          <!-- Business Letter -->
          <button @click="createFromTemplate('letter')" class="group flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all">
            <div class="w-full h-32 bg-gradient-to-b from-blue-50 to-white dark:from-blue-900 dark:to-gray-800 border border-gray-300 dark:border-gray-600 rounded mb-3 p-2">
              <div class="h-2 w-16 bg-blue-400 rounded mb-2"></div>
              <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
              <div class="h-1 w-3/4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Business Letter</span>
          </button>

          <!-- Report -->
          <button @click="createFromTemplate('report')" class="group flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all">
            <div class="w-full h-32 bg-gradient-to-b from-purple-50 to-white dark:from-purple-900 dark:to-gray-800 border border-gray-300 dark:border-gray-600 rounded mb-3 p-2">
              <div class="h-3 w-20 bg-purple-500 rounded mb-2"></div>
              <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
              <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
              <div class="h-1 w-2/3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Report</span>
          </button>

          <!-- Resume -->
          <button @click="createFromTemplate('resume')" class="group flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all">
            <div class="w-full h-32 bg-gradient-to-b from-green-50 to-white dark:from-green-900 dark:to-gray-800 border border-gray-300 dark:border-gray-600 rounded mb-3 p-2">
              <div class="h-2 w-24 bg-green-500 rounded mb-2"></div>
              <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
              <div class="h-1 w-4/5 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Resume/CV</span>
          </button>

          <!-- Meeting Notes -->
          <button @click="createFromTemplate('notes')" class="group flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all">
            <div class="w-full h-32 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900 dark:to-gray-800 border border-gray-300 dark:border-gray-600 rounded mb-3 p-2">
              <div class="h-2 w-16 bg-yellow-500 rounded mb-2"></div>
              <div class="flex gap-1 mb-1">
                <div class="h-1 w-1 bg-gray-400 rounded-full"></div>
                <div class="h-1 flex-1 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <div class="flex gap-1">
                <div class="h-1 w-1 bg-gray-400 rounded-full"></div>
                <div class="h-1 flex-1 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            </div>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Meeting Notes</span>
          </button>

          <!-- Article -->
          <button @click="createFromTemplate('article')" class="group flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all">
            <div class="w-full h-32 bg-gradient-to-b from-red-50 to-white dark:from-red-900 dark:to-gray-800 border border-gray-300 dark:border-gray-600 rounded mb-3 p-2">
              <div class="h-3 w-full bg-red-500 rounded mb-2"></div>
              <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
              <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
              <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Article/Blog</span>
          </button>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showNewFileDialog = false">Cancel</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Button from '@/components/ui/button/Button.vue';

const props = defineProps<{
  editor: Editor | null | undefined;
  pageSize?: string;
  pageOrientation?: 'portrait' | 'landscape';
}>();

const emit = defineEmits<{
  (e: 'export', format: string): void;
  (e: 'update:pageSize', value: string): void;
  (e: 'update:pageOrientation', value: 'portrait' | 'landscape'): void;
  (e: 'toggle-comments'): void;
  (e: 'toggle-expanded', value: boolean): void;
}>();

// State
const isExpanded = ref(false);

// Reusable button classes
const btnClasses = 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm';
const btnActiveClasses = '!bg-blue-100 dark:!bg-blue-900 !border-blue-500 dark:!border-blue-400 !text-blue-700 dark:!text-blue-300';

// Dialog states
const showTableDialog = ref(false);
const showLinkDialog = ref(false);
const showImageDialog = ref(false);
const showNewFileDialog = ref(false);

// Table insert state
const tableRows = ref(3);
const tableCols = ref(3);
const tableStyle = ref('default');
const tableWithHeader = ref(true);

// Link insert state
const linkUrl = ref('');
const linkOpenInNewTab = ref(true);

// Image insert state
const imageUrl = ref('');
const imageAlt = ref('');

// Font options - Beautiful, print-friendly fonts
const fontFamilies = [
  // Sans-serif fonts - Modern & Professional
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Source Sans 3', label: 'Source Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Verdana', label: 'Verdana' },
  
  // Serif fonts - Excellent for print & academic
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Crimson Text', label: 'Crimson Text' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville' },
  { value: 'PT Serif', label: 'PT Serif' },
  { value: 'EB Garamond', label: 'EB Garamond' },
  { value: 'Spectral', label: 'Spectral' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  
  // Monospace
  { value: 'Courier New', label: 'Courier New' },
];

const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];

const selectedFontFamily = ref('');
const selectedFontSize = ref('');
const currentTextColor = ref('#000000');
const currentBgColor = ref('#ffffff');

// Update font and color state when editor selection changes
const updateFontState = () => {
  if (!props.editor) return;
  const attrs = props.editor.getAttributes('textStyle') ?? {};
  const ff = (attrs.fontFamily ?? attrs['font-family']) as string | undefined;
  const fs = (attrs.fontSize ?? attrs['font-size']) as string | undefined;
  selectedFontFamily.value = ff ?? '';
  const rawSize = fs ?? '';
  selectedFontSize.value = rawSize.endsWith('pt') ? rawSize.replace(/pt$/, '') : rawSize;
  
  // Update text color
  const color = attrs.color as string | undefined;
  if (color) {
    currentTextColor.value = color;
  }
  
  // Update background color from highlight
  const highlightAttrs = props.editor.getAttributes('highlight');
  if (highlightAttrs.color) {
    currentBgColor.value = highlightAttrs.color as string;
  }
};

watch(
  () => props.editor,
  (next, prev) => {
    prev?.off?.('selectionUpdate', updateFontState);
    prev?.off?.('transaction', updateFontState);

    if (next) {
      next.on?.('selectionUpdate', updateFontState);
      next.on?.('transaction', updateFontState);
      updateFontState();
    } else {
      selectedFontFamily.value = '';
      selectedFontSize.value = '';
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  const instance = props.editor;
  instance?.off?.('selectionUpdate', updateFontState);
  instance?.off?.('transaction', updateFontState);
});

function onFontFamilyChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLSelectElement;
  const value = target.value;
  const chain = props.editor.chain().focus();

  if (value) {
    chain.setFontFamily(value).run();
  } else {
    chain.unsetFontFamily?.().run?.();
  }
  selectedFontFamily.value = value;
  updateFontState();
}

function onFontSizeChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLSelectElement;
  const value = target.value;

  if (value) {
    (props.editor.chain().focus() as any).setFontSize(`${value}pt`).run();
    selectedFontSize.value = value;
  } else {
    (props.editor.chain().focus() as any).unsetFontSize().run();
    selectedFontSize.value = '';
  }
  updateFontState();
}

// Dialog open functions
function openLinkDialog() {
  if (!props.editor) return;
  
  const previousUrl = props.editor.getAttributes('link').href;
  linkUrl.value = previousUrl || '';
  
  showLinkDialog.value = true;
}

// Table insert function
function insertTable() {
  if (!props.editor) return;
  
  props.editor.chain().focus().insertTable({
    rows: tableRows.value,
    cols: tableCols.value,
    withHeaderRow: tableWithHeader.value,
  }).run();
  
  // Apply table style class
  if (tableStyle.value !== 'default') {
    // Add custom class to table (will be styled via CSS)
    const tableNode = props.editor.state.selection.$anchor.node(-1);
    if (tableNode && tableNode.type.name === 'table') {
      props.editor.commands.updateAttributes('table', {
        class: `table-${tableStyle.value}`,
      });
    }
  }
  
  showTableDialog.value = false;
}

// Link functions
function applyLink() {
  if (!props.editor || !linkUrl.value) return;
  
  let finalUrl = linkUrl.value;
  if (!finalUrl.match(/^https?:\/\//i)) {
    finalUrl = 'https://' + finalUrl;
  }
  
  const target = linkOpenInNewTab.value ? '_blank' : undefined;
  props.editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl, target }).run();
  
  showLinkDialog.value = false;
  linkUrl.value = '';
}

function removeLink() {
  if (!props.editor) return;
  props.editor.chain().focus().extendMarkRange('link').unsetLink().run();
  showLinkDialog.value = false;
  linkUrl.value = '';
}

// Image function
function applyImage() {
  if (!props.editor || !imageUrl.value) return;
  
  let finalUrl = imageUrl.value;
  if (!finalUrl.match(/^https?:\/\//i)) {
    finalUrl = 'https://' + finalUrl;
  }
  
  props.editor.chain().focus().setImage({ 
    src: finalUrl,
    alt: imageAlt.value || undefined,
  }).run();
  
  showImageDialog.value = false;
  imageUrl.value = '';
  imageAlt.value = '';
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
  emit('toggle-expanded', isExpanded.value);
}

function handleExport(format: string) {
  emit('export', format);
}

function handlePrint() {
  window.print();
}

function createFromTemplate(template: string) {
  if (!props.editor) return;
  
  const templates: Record<string, string> = {
    blank: '<p>Start typing...</p>',
    letter: '<p style="text-align: right">Your Name<br>Your Address<br>City, State ZIP<br>Email<br>Phone</p><p><br></p><p>Date</p><p><br></p><p>Recipient Name<br>Company<br>Address</p><p><br></p><p>Dear [Recipient],</p><p><br></p><p>Start your letter here...</p><p><br></p><p>Sincerely,<br>Your Name</p>',
    report: '<h1>Report Title</h1><p><em>Author Name | Date</em></p><h2>Executive Summary</h2><p>Brief overview of the report...</p><h2>Introduction</h2><p>Background and context...</p><h2>Findings</h2><p>Key findings and analysis...</p><h2>Conclusion</h2><p>Summary and recommendations...</p>',
    resume: '<h1>Your Name</h1><p>Email | Phone | LinkedIn</p><h2>Professional Summary</h2><p>Brief professional summary highlighting key skills and experience...</p><h2>Experience</h2><p><strong>Job Title</strong> - Company Name<br><em>Start Date - End Date</em></p><ul><li>Key achievement or responsibility</li><li>Key achievement or responsibility</li></ul><h2>Education</h2><p><strong>Degree</strong> - University Name<br><em>Graduation Year</em></p><h2>Skills</h2><ul><li>Skill 1</li><li>Skill 2</li><li>Skill 3</li></ul>',
    notes: '<h1>Meeting Notes</h1><p><strong>Date:</strong> [Date]<br><strong>Attendees:</strong> [Names]<br><strong>Topic:</strong> [Topic]</p><h2>Agenda</h2><ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul><h2>Discussion Points</h2><p>Key discussion points...</p><h2>Action Items</h2><ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Action item 1</p></div></li><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Action item 2</p></div></li></ul>',
    article: '<h1>Article Title</h1><p><em>By Author Name | Published Date</em></p><p><br></p><p>Opening paragraph that hooks the reader...</p><h2>Section Heading</h2><p>Content for this section...</p><blockquote>A relevant quote or highlight</blockquote><p>More content...</p><h2>Conclusion</h2><p>Wrap up your article...</p>',
  };
  
  const content = templates[template] || templates.blank;
  props.editor.commands.setContent(content);
  showNewFileDialog.value = false;
}

function onPageSizeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update:pageSize', target.value);
}

function handleOrientation(orientation: 'portrait' | 'landscape') {
  emit('update:pageOrientation', orientation);
}

function onTextColorChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLInputElement;
  const color = target.value;
  props.editor.chain().focus().setColor(color).run();
  currentTextColor.value = color;
}

function onBgColorChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLInputElement;
  const color = target.value;
  props.editor.chain().focus().setHighlight({ color }).run();
  currentBgColor.value = color;
}
</script>

<style scoped>
/* Toolbar Styles - Matching VenEditorToolbar */
.tiptap-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: background-color 0.2s, border-color 0.2s;
}

.tiptap-toolbar__main {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  flex-wrap: wrap;
}

.tiptap-toolbar__section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 8px;
  white-space: nowrap;
}

.tiptap-toolbar__divider {
  width: 1px;
  height: 24px;
  margin: 0 4px;
}

.tiptap-toolbar__group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tiptap-toolbar__btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.tiptap-toolbar__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tiptap-toolbar__btn--heading {
  width: 40px;
  font-weight: 600;
}

.tiptap-toolbar__select {
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tiptap-toolbar__select:focus {
  outline: none;
}

.tiptap-toolbar__select--small {
  min-width: 80px;
}

/* Crystal Toggle Button - Office-style */
.tiptap-toolbar__crystal-toggle {
  --orb-size: 40px;
  --office-blue: #0078d4;
  --office-blue-dark: #005a9e;
  --office-blue-light: #50a0e0;

  width: var(--orb-size);
  height: var(--orb-size);
  border-radius: 50%;
  border: 2px solid #e1e1e1;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  background: linear-gradient(135deg, var(--office-blue-light) 0%, var(--office-blue) 50%, var(--office-blue-dark) 100%);
  
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);

  transition: all 0.2s ease;
}

.tiptap-toolbar__crystal-toggle::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 4px;
  right: 4px;
  height: 40%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.4), transparent);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  z-index: 1;
}

.tiptap-toolbar__crystal-toggle .crystal-icon {
  font-size: 0.875rem;
  color: white;
  position: relative;
  z-index: 2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.tiptap-toolbar__crystal-toggle:hover {
  transform: translateY(-1px);
  border-color: var(--office-blue);
  box-shadow: 
    0 4px 8px rgba(0, 120, 212, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.tiptap-toolbar__crystal-toggle:active {
  transform: translateY(0);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.1),
    inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.tiptap-toolbar__crystal-toggle.is-expanded {
  background: linear-gradient(135deg, #e74856 0%, #d13438 50%, #a72828 100%);
  border-color: #d13438;
  transform: rotate(180deg);
  box-shadow: 
    0 2px 4px rgba(215, 52, 56, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.tiptap-toolbar__crystal-toggle.is-expanded:hover {
  transform: translateY(-1px) rotate(180deg);
  box-shadow: 
    0 4px 8px rgba(215, 52, 56, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.tiptap-toolbar.is-expanded .tiptap-toolbar__main {
  padding: 12px;
  gap: 8px;
}

/* Color Picker Styles */
.tiptap-toolbar__color-picker {
  position: relative;
  display: inline-flex;
}

.tiptap-toolbar__color-picker label {
  position: relative;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tiptap-toolbar__color-label {
  font-weight: 600;
  font-size: 0.875rem;
  pointer-events: none;
  position: relative;
  z-index: 1;
}

.tiptap-toolbar__color-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  top: 0;
  left: 0;
}

/* Custom scrollbar for dialogs */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

:deep(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

:deep(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

@media print {
  .tiptap-toolbar {
    display: none;
  }
}
</style>
