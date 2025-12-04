<template>
  <div class="tiptap-toolbar bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700" :class="{ 'is-expanded': isExpanded }">
    <div class="tiptap-toolbar__main overflow-x-auto whitespace-nowrap flex-nowrap">
       
      <button
        class="tiptap-toolbar__crystal-toggle border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        :class="{ 'is-expanded': isExpanded }"
        :title="isExpanded ? 'Collapse toolbar' : 'Expand toolbar'"
        @click="toggleExpanded"
      >
        <ChevronDown class="crystal-icon h-4 w-4" />
      </button>

      <span class="tiptap-toolbar__divider" />

       
      <div v-if="isExpanded" class="tiptap-toolbar__section-label text-gray-500 dark:text-gray-400">New</div>
       
      <button
        class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
        title="New Document"
        @click="showNewFileDialog = true"
      >
        <Plus class="h-4 w-4" />
      </button>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Export</div>
      <span class="tiptap-toolbar__divider bg-gray-300 dark:bg-gray-600" />
        <button class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Export PDF" @click="handleExport('pdf')">
          <FileDown class="h-4 w-4" />
        </button>
        <button class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400" @click="handleExport('docx')" title="Export Word">
          <FileText class="h-4 w-4" />
        </button>
        <button class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400" @click="handleExport('html')" title="Export HTML">
          <Code class="h-4 w-4" />
        </button>
        <button class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400" @click="$emit('print')" title="Print">
          <Printer class="h-4 w-4" />
        </button>
      </div>
      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

       
      <div class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          title="Undo (Ctrl+Z)"
          :disabled="!editor?.can().undo()"
          @click="editor?.chain().focus().undo().run()"
        >
          <Undo2 class="h-4 w-4" />
        </button>
        <button
          class="tiptap-toolbar__btn"
          title="Redo (Ctrl+Y)"
          :disabled="!editor?.can().redo()"
          @click="editor?.chain().focus().redo().run()"
        >
          <Redo2 class="h-4 w-4" />
        </button>
        <span class="tiptap-toolbar__divider" />
         
        <button
          class="tiptap-toolbar__btn"
          title="Save (Ctrl+S)"
          @click="$emit('manual-save')"
        >
          <Save class="h-4 w-4" />
        </button>
      </div>

      <span class="tiptap-toolbar__divider" />

       
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

       
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Text</div>
      <div class="tiptap-toolbar__group">
         
        <button
          :class="['tiptap-toolbar__btn', btnClasses, editor?.isActive('bold') && btnActiveClasses]"
          title="Bold (Ctrl+B)"
          @click="editor?.chain().focus().toggleBold().run()"
        >
          <Bold class="h-4 w-4" />
        </button>
        <button
          :class="['tiptap-toolbar__btn', btnClasses, editor?.isActive('italic') && btnActiveClasses]"
          title="Italic (Ctrl+I)"
          @click="editor?.chain().focus().toggleItalic().run()"
        >
          <Italic class="h-4 w-4" />
        </button>
        <button
          :class="['tiptap-toolbar__btn', btnClasses, editor?.isActive('underline') && btnActiveClasses]"
          title="Underline (Ctrl+U)"
          @click="editor?.chain().focus().toggleUnderline().run()"
        >
          <UnderlineIcon class="h-4 w-4" />
        </button>
        <button
          :class="['tiptap-toolbar__btn', btnClasses, editor?.isActive('strike') && btnActiveClasses]"
          title="Strikethrough"
          @click="editor?.chain().focus().toggleStrike().run()"
        >
          <Strikethrough class="h-4 w-4" />
        </button>
        <button
          v-if="isExpanded"
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('code') }"
          title="Inline Code"
          @click="editor?.chain().focus().toggleCode().run()"
        >
          <Code2 class="h-4 w-4" />
        </button>
        <span v-if="isExpanded" class="tiptap-toolbar__divider" />

         
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

       
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Paragraph</div>
      <div class="tiptap-toolbar__group">
         
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }"
          title="Align Left"
          @click="editor?.chain().focus().setTextAlign('left').run()"
        >
          <AlignLeft class="h-4 w-4" />
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }"
          title="Center"
          @click="editor?.chain().focus().setTextAlign('center').run()"
        >
          <AlignCenter class="h-4 w-4" />
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }"
          title="Align Right"
          @click="editor?.chain().focus().setTextAlign('right').run()"
        >
          <AlignRight class="h-4 w-4" />
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'justify' }) }"
          title="Align Justify"
          @click="editor?.chain().focus().setTextAlign('justify').run()"
        >
          <AlignJustify class="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              class="inline-flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              title="Line & paragraph spacing"
            >
              <span class="font-semibold">{{ activeSpacingLabel }}</span>
              <ChevronDown class="h-3 w-3 opacity-60 inline-flex" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-56 p-1">
            <div class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Line height
            </div>
            <DropdownMenuRadioGroup :model-value="selectedLineHeight" @update:model-value="applyLineHeight">
              <DropdownMenuRadioItem
                v-for="option in lineHeights"
                :key="option.value"
                :value="option.value"
                class="flex items-center justify-between gap-2"
              >
                <span>{{ option.label }}</span>
                <Check v-if="selectedLineHeight === option.value" class="h-3.5 w-3.5 text-blue-500" />
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <div class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Paragraph spacing
            </div>
            <DropdownMenuRadioGroup :model-value="selectedParagraphSpacing" @update:model-value="applyParagraphSpacing">
              <DropdownMenuRadioItem
                v-for="option in paragraphSpacings"
                :key="option.value"
                :value="option.value"
                class="flex items-center justify-between gap-2"
              >
                <span>{{ option.label }}</span>
                <Check v-if="selectedParagraphSpacing === option.value" class="h-3.5 w-3.5 text-blue-500" />
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('bulletList') }"
          title="Bullet List"
          @click="editor?.chain().focus().toggleBulletList().run()"
        >
          <List class="h-4 w-4" />
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('orderedList') }"
          title="Numbered List"
          @click="editor?.chain().focus().toggleOrderedList().run()"
        >
          <ListOrdered class="h-4 w-4" />
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

       
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Page</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button class="tiptap-toolbar__btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-blue-600 dark:hover:text-blue-400" @click="showPaginationDialog = true" title="Page Settings">
          <Settings class="h-4 w-4" />
        </button>
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
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

       
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

       
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Advanced</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('subscript') }"
          title="Subscript"
          @click="editor?.chain().focus().toggleSubscript().run()"
        >
          <Subscript class="h-4 w-4" />
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('superscript') }"
          title="Superscript"
          @click="editor?.chain().focus().toggleSuperscript().run()"
        >
          <Superscript class="h-4 w-4" />
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

       
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Blocks</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('blockquote') }"
          title="Blockquote"
          @click="editor?.chain().focus().toggleBlockquote().run()"
        >
          <Quote class="h-4 w-4" />
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('codeBlock') }"
          title="Code Block"
          @click="editor?.chain().focus().toggleCodeBlock().run()"
        >
          <SquareCode class="h-4 w-4" />
        </button>
        <button
          class="tiptap-toolbar__btn"
          title="Horizontal Line"
          @click="editor?.chain().focus().setHorizontalRule().run()"
        >
          <Minus class="h-4 w-4" />
        </button>
      </div>

      <span class="tiptap-toolbar__divider" />

       
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">More</div>
      <div class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('taskList') }"
          title="Task List"
          @click="editor?.chain().focus().toggleTaskList().run()"
        >
          <ListChecks class="h-4 w-4" />
        </button>
        <button
          class="tiptap-toolbar__btn"
          title="Insert Chart"
          @click="openChartDialog"
        >
          <BarChart3 class="h-4 w-4" />
        </button>
        
         
        <button
          class="tiptap-toolbar__btn"
          title="Insert Table"
          @click="showTableDialog = true"
        >
          <Table class="h-4 w-4" />
        </button>
        
         
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('link') }"
          title="Insert/Edit Link"
          @click="openLinkDialog"
        >
          <Link2 class="h-4 w-4" />
        </button>
        
         
        <button
          v-if="isExpanded"
          class="tiptap-toolbar__btn"
          title="Insert Image"
          @click="showImageDialog = true"
        >
          <ImageIcon class="h-4 w-4" />
        </button>
      </div>
      
       
      <div class="tiptap-toolbar__group" style="margin-left: auto;">
        <button
          class="tiptap-toolbar__btn relative"
          title="Comments & Chat"
          @click="$emit('toggle-comments')"
        >
          <MessageSquare class="h-4 w-4" />
          <span
            v-if="props.unreadCount && props.unreadCount > 0"
            class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5"
          >
            {{ props.unreadCount > 99 ? '99+' : props.unreadCount }}
          </span>
        </button>
      </div>
    </div>
  </div>

   
   
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
          <label for="header-check" class="text-sm font-medium">{{$t('Forms.DocsToolbar.label.include_header_row')}}</label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showTableDialog = false">Cancel</Button>
        <Button @click="insertTable">Insert</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

   
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
          <label for="new-tab-check" class="text-sm font-medium">{{$t('Forms.DocsToolbar.label.open_in_new_tab')}}</label>
        </div>
      </div>
      <DialogFooter>
        <Button v-if="editor?.isActive('link')" variant="destructive" @click="removeLink">Remove</Button>
        <Button variant="outline" @click="showLinkDialog = false">Cancel</Button>
        <Button @click="applyLink">Apply</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

   
  <Dialog v-model:open="showImageDialog">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Insert Image</DialogTitle>
      </DialogHeader>
      <ImagePicker
        submit-label="Insert"
        @submit="applyImage"
        @cancel="showImageDialog = false"
      />
    </DialogContent>
  </Dialog>

   
  <Dialog v-model:open="showPaginationDialog">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Page Settings</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <div class="space-y-3">
          <label class="text-sm font-medium">Orientation</label>
          <select
            v-model="paginationSettings.orientation"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" v-model="paginationSettings.showPageNumbers" class="rounded" />
          Show Page Numbers
        </label>

        <div v-if="paginationSettings.showPageNumbers" class="space-y-3 pl-6">
          <label class="text-sm font-medium">{{$t('Forms.DocsToolbar.label.page_number_position')}}</label>
          <select
            v-model="paginationSettings.pageNumberPosition"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="top-left">Top Left</option>
            <option value="top-center">Top Center</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-center">Bottom Center</option>
            <option value="bottom-right">Bottom Right</option>
          </select>

          <label class="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" v-model="paginationSettings.printPageNumbers" class="rounded" />
            Show page numbers when printing
          </label>
           
        </div>
      </div>

     <div class="space-y-3">
       <h3 class="text-sm font-semibold">Page Margins (px)</h3>
       <div class="grid grid-cols-2 gap-4">
         <label class="grid gap-2 text-sm font-medium">
           Top
           <input type="number" v-model.number="paginationSettings.marginTop" min="0" max="200" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
         </label>
         <label class="grid gap-2 text-sm font-medium">
           Bottom
           <input type="number" v-model.number="paginationSettings.marginBottom" min="0" max="200" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
         </label>
         <label class="grid gap-2 text-sm font-medium">
           Left
           <input type="number" v-model.number="paginationSettings.marginLeft" min="0" max="200" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
         </label>
         <label class="grid gap-2 text-sm font-medium">
           Right
           <input type="number" v-model.number="paginationSettings.marginRight" min="0" max="200" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
         </label>
       </div>
     </div>

     <div class="space-y-2">
       <label class="flex items-center gap-2 text-sm font-medium">
         <input type="checkbox" v-model="paginationSettings.pageBorder" class="rounded" />
         Show Page Border
       </label>
       <label class="flex items-center gap-2 text-sm font-medium">
         <input type="checkbox" v-model="paginationSettings.pageShadow" class="rounded" />
         Show Page Shadow
       </label>
     </div>
      <DialogFooter>
        <Button variant="outline" @click="showPaginationDialog = false">Cancel</Button>
        <Button @click="applyPaginationSettings">Apply</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

   
  <Dialog v-model:open="showNewFileDialog">
    <DialogContent class="sm:max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="text-xl">Create New Document</DialogTitle>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{$t('Forms.DocsToolbar.text.choose_a_template_to')}}</p>
      </DialogHeader>
      <div class="overflow-y-auto flex-1 py-6 px-1 custom-scrollbar">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-5">
           
          <button @click="createFromTemplate('blank')" class="group relative flex flex-col p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent dark:from-gray-800/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative w-full aspect-[4/5] max-h-[180px]  bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg mb-4 flex items-center justify-center shadow-sm">
              <svg class="h-14 w-14 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="relative text-center">
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Blank Document</span>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{$t('Forms.DocsToolbar.text.start_from_scratch')}}</p>
            </div>
          </button>

           
          <button @click="createFromTemplate('letter')" class="group relative flex flex-col p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative w-full aspect-[4/5] max-h-[180px]  bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-950/40 dark:via-gray-800 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg mb-4 p-4 shadow-sm">
              <div class="h-2.5 w-20 bg-blue-500 rounded mb-3"></div>
              <div class="space-y-1.5">
                <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div class="h-1 w-4/5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            </div>
            <div class="relative text-center">
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Business Letter</span>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{$t('Forms.DocsToolbar.text.professional_correspondence')}}</p>
            </div>
          </button>

           
          <button @click="createFromTemplate('report')" class="group relative flex flex-col p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative w-full aspect-[4/5] max-h-[180px]  bg-gradient-to-b from-purple-50 via-white to-white dark:from-purple-950/40 dark:via-gray-800 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg mb-4 p-4 shadow-sm">
              <div class="h-3.5 w-24 bg-purple-600 rounded mb-3"></div>
              <div class="space-y-2">
                <div class="h-1.5 w-16 bg-purple-400 rounded"></div>
                <div class="space-y-1">
                  <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div class="h-1 w-3/4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
            <div class="relative text-center">
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Report</span>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Structured analysis</p>
            </div>
          </button>

           
          <button @click="createFromTemplate('resume')" class="group relative flex flex-col p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent dark:from-green-900/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative w-full aspect-[4/5] max-h-[180px]  bg-gradient-to-b from-green-50 via-white to-white dark:from-green-950/40 dark:via-gray-800 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg mb-4 p-4 shadow-sm">
              <div class="h-3 w-28 bg-green-600 rounded mb-2"></div>
              <div class="h-1 w-20 bg-green-400 rounded mb-3"></div>
              <div class="space-y-2">
                <div class="h-1.5 w-20 bg-gray-400 dark:bg-gray-500 rounded"></div>
                <div class="space-y-1">
                  <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div class="h-1 w-4/5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
            <div class="relative text-center">
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Resume/CV</span>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Professional profile</p>
            </div>
          </button>

           
          <button @click="createFromTemplate('notes')" class="group relative flex flex-col p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-yellow-50 to-transparent dark:from-yellow-900/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative w-full aspect-[4/5] max-h-[180px]  bg-gradient-to-b from-yellow-50 via-white to-white dark:from-yellow-950/40 dark:via-gray-800 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg mb-4 p-4 shadow-sm">
              <div class="h-2.5 w-20 bg-yellow-600 rounded mb-3"></div>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <div class="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                  <div class="h-1 flex-1 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                  <div class="h-1 flex-1 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                  <div class="h-1 flex-1 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
            <div class="relative text-center">
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Meeting Notes</span>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Capture discussions</p>
            </div>
          </button>

           
          <button @click="createFromTemplate('article')" class="group relative flex flex-col p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent dark:from-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative w-full aspect-[4/5] max-h-[180px]  bg-gradient-to-b from-red-50 via-white to-white dark:from-red-950/40 dark:via-gray-800 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg mb-4 p-4 shadow-sm">
              <div class="h-3.5 w-full bg-red-600 rounded mb-2"></div>
              <div class="h-1 w-24 bg-red-400 rounded mb-3"></div>
              <div class="space-y-1">
                <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div class="h-1 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div class="h-1 w-4/5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            </div>
            <div class="relative text-center">
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Article/Blog</span>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Long-form content</p>
            </div>
          </button>
        </div>
      </div>
      <DialogFooter class="flex-shrink-0">
        <Button variant="outline" @click="showNewFileDialog = false">Cancel</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ChartConfigurator
    v-model:open="showChartDialog"
    :initial-value="chartInitialValue"
    @submit="handleChartSubmit"
    @cancel="handleChartCancel"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import type { Editor } from '@tiptap/vue-3';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  BarChart3,
  Bold,
  Check,
  ChevronDown,
  Code,
  Code2,
  FileDown,
  FileText,
  Image as ImageIcon,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Link2,
  MessageSquare,
  Minus,
  Plus,
  Printer,
  Quote,
  Redo2,
  Save,
  Settings,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Undo2,
  Underline as UnderlineIcon,
} from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Button from '@/components/ui/button/Button.vue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ChartConfigurator from '@/components/editor/ChartConfigurator.vue';
import ImagePicker from '@/components/ImagePicker.vue';
import type { ChartAttrs } from '@/extensions/chart';
import { NodeSelection } from '@tiptap/pm/state';

const props = defineProps<{
  editor: Editor | null | undefined;
  pageSize?: string;
  pageOrientation?: 'portrait' | 'landscape';
  unreadCount?: number;
}>();

const emit = defineEmits<{
  (e: 'export', format: string): void;
  (e: 'update:pageSize', value: string): void;
  (e: 'update:pageOrientation', value: 'portrait' | 'landscape'): void;
  (e: 'toggle-comments'): void;
  (e: 'toggle-expanded', value: boolean): void;
  (e: 'update-pagination', value: {
    showPageNumbers: boolean;
    pageNumberPosition: string;
    footerHeight: number;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    pageBorder: boolean;
    pageShadow: boolean;
    printPageNumbers: boolean;
  }): void;
  (e: 'print'): void;
  (e: 'manual-save'): void;
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
const showPaginationDialog = ref(false);
const showChartDialog = ref(false);

const chartInitialValue = ref<Partial<ChartAttrs> | null>(null);

// Pagination settings
const paginationSettings = ref({
  showPageNumbers: true,
  pageNumberPosition: 'bottom-right' as 'bottom-right' | 'bottom-center' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left' | 'none',
  footerHeight: 30,
  marginTop: 50,
  marginBottom: 50,
  marginLeft: 50,
  marginRight: 50,
  pageBorder: true,
  pageShadow: true,
  printPageNumbers: false,
  orientation: (props.pageOrientation || 'portrait') as 'portrait' | 'landscape',
});

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
const lineHeights = [
  { value: '1', label: '1.0', description: 'Default line height' },
  { value: '1.15', label: '1.15' },
  { value: '1.25', label: '1.25' },
  { value: '1.5', label: '1.5' },
  { value: '1.75', label: '1.75' },
  { value: '2', label: '2.0' },
  { value: '2.5', label: '2.5' },
  { value: '3', label: '3.0' },
];
// Paragraph spacing options expressed as factors of current line-height
const paragraphSpacings = [
  { value: '0', label: '0', description: 'No extra spacing' },
  { value: '0.5', label: '0.5' },
  { value: '1', label: '1.0' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2.0' },
];

const selectedFontFamily = ref('');
const selectedFontSize = ref('');
const selectedLineHeight = ref('1');
const selectedParagraphSpacing = ref('0');
const activeSpacingLabel = computed(() => {
  const lh = lineHeights.find((item) => item.value === selectedLineHeight.value);
  const ps = paragraphSpacings.find((item) => item.value === selectedParagraphSpacing.value);
  return `${lh?.value ?? '1.0'} / ${ps?.value ?? '0px'}`;
});
const currentTextColor = ref('#000000');
const currentBgColor = ref('#ffffff');

const lineHeightTargets = ['paragraph', 'heading', 'listItem', 'taskItem'] as const;
const paragraphSpacingTargets = lineHeightTargets;

// Update font and color state when editor selection changes
const updateFontState = () => {
  chartInitialValue.value = null;
  if (!props.editor) return;
  const attrs = props.editor.getAttributes('textStyle') ?? {};
  const ff = (attrs.fontFamily ?? attrs['font-family']) as string | undefined;
  const fs = (attrs.fontSize ?? attrs['font-size']) as string | undefined;
  selectedFontFamily.value = ff ?? '';
  const rawSize = fs ?? '';
  selectedFontSize.value = rawSize.endsWith('pt') ? rawSize.replace(/pt$/, '') : rawSize;

  let detectedLineHeight: string | undefined;
  for (const type of lineHeightTargets) {
    const nodeAttrs = props.editor.getAttributes(type as string) as { lineHeight?: string };
    if (nodeAttrs?.lineHeight) {
      detectedLineHeight = nodeAttrs.lineHeight;
      break;
    }
  }


  selectedLineHeight.value = detectedLineHeight ?? '1';

  let detectedParagraphSpacing: string | undefined;
  for (const type of paragraphSpacingTargets) {
    const nodeAttrs = props.editor.getAttributes(type as string) as { paragraphSpacing?: string };
    if (nodeAttrs?.paragraphSpacing) {
      detectedParagraphSpacing = nodeAttrs.paragraphSpacing;
      break;
    }
  }

  selectedParagraphSpacing.value = detectedParagraphSpacing ?? '0';
  
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

  updateChartSelectionState();
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
      selectedLineHeight.value = '1';
      selectedParagraphSpacing.value = '0px';
      chartInitialValue.value = null;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  const instance = props.editor;
  instance?.off?.('selectionUpdate', updateFontState);
  instance?.off?.('transaction', updateFontState);
});

function applyLineHeight(value: string) {
  if (!props.editor) return;
  const chain = props.editor.chain().focus();
  if (value && value !== '1') {
    chain.setLineHeight?.(value).run?.();
  } else {
    chain.unsetLineHeight?.().run?.();
  }
  selectedLineHeight.value = value || '1';
  updateFontState();
}

function onFontFamilyChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLSelectElement;
  const value = target.value;

  if (value) {
    props.editor.chain().focus().setFontFamily?.(value).run?.();
    selectedFontFamily.value = value;
  } else {
    props.editor.chain().focus().unsetFontFamily?.().run?.();
    selectedFontFamily.value = '';
  }

  updateFontState();
}

function applyParagraphSpacing(value: string) {
  if (!props.editor) return;
  const chain = props.editor.chain().focus();
  if (value && value !== '0') {
    chain.setParagraphSpacing?.(value).run?.();
  } else {
    chain.unsetParagraphSpacing?.().run?.();
  }
  selectedParagraphSpacing.value = value || '0';
  updateFontState();
}

function onFontSizeChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLSelectElement;
  const value = target.value;
  const currentAttrs = { ...(props.editor.getAttributes('textStyle') ?? {}) } as Record<string, unknown>;

  if (value) {
    const nextAttrs = { ...currentAttrs, fontSize: `${value}pt` };
    props.editor.chain().focus().setMark('textStyle', nextAttrs).run();
    selectedFontSize.value = value;
  } else {
    delete currentAttrs.fontSize;
    const chain = props.editor.chain().focus();
    if (Object.keys(currentAttrs).length) {
      chain.setMark('textStyle', currentAttrs).run();
    } else {
      chain.unsetMark?.('textStyle')?.run?.();
    }
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

function insertTable() {
  if (!props.editor) return;

  // Insert table at current position - PaginationPlus handles page breaks automatically
  props.editor.chain().focus()
    .insertTable({
      rows: tableRows.value,
      cols: tableCols.value,
      withHeaderRow: tableWithHeader.value,
    })
    .run();

  if (tableStyle.value !== 'default') {
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
function applyImage(url: string) {
  if (!props.editor || !url) return;
  
  let finalUrl = url;
  if (!finalUrl.match(/^https?:\/\//i) && !finalUrl.startsWith('data:')) {
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


function showChartConfigurator(attrs?: ChartAttrs | null) {
  if (!props.editor) return;
  chartInitialValue.value = attrs ?? getSelectedChartAttrs();
  showChartDialog.value = true;
}

function openChartDialog() {
  if (!props.editor) return;
  showChartConfigurator(getSelectedChartAttrs());
}

function getSelectedChartAttrs(): ChartAttrs | null {
  const editor = props.editor;
  if (!editor) return null;
  const { state } = editor;
  const { selection } = state;

  if (selection instanceof NodeSelection && selection.node.type.name === 'chart') {
    return { ...(selection.node.attrs as ChartAttrs) };
  }

  let attrs: ChartAttrs | null = null;
  state.doc.nodesBetween(selection.from, selection.to, node => {
    if (!attrs && node.type.name === 'chart') {
      attrs = { ...(node.attrs as ChartAttrs) };
      return false;
    }
    return undefined;
  });
  return attrs;
}

function handleChartSubmit(attrs: ChartAttrs) {
  if (!props.editor) return;
  props.editor.chain().focus().setChart(attrs).run();
  showChartDialog.value = false;
}

function handleChartCancel() {
  showChartDialog.value = false;
}

function updateChartSelectionState() {
  chartInitialValue.value = getSelectedChartAttrs();
}

defineExpose({
  openChartConfigurator: showChartConfigurator,
  chartDialogOpen: showChartDialog,
});

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
  emit('toggle-expanded', isExpanded.value);
}

function handleExport(format: string) {
  emit('export', format);
}

const router = useRouter();

// Template cache
const templateCache = new Map<string, string>();

const docsTemplateLoaders = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../assets/docs/templates/*.html', { as: 'raw' })
  ).map(([path, loader]) => {
    const fileName = path.split('/').pop() ?? '';
    const templateKey = fileName.replace(/\.html$/, '');
    return [templateKey, loader as () => Promise<string>];
  })
) as Record<string, () => Promise<string>>;

async function loadTemplate(templateName: string): Promise<string> {
  // Check cache first
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  try {
    const loader = docsTemplateLoaders[templateName];
    if (!loader) {
      console.error(`Template not found: ${templateName}`);
      return '<p></p>';
    }

    const content = await loader();
    
    // Cache the template
    templateCache.set(templateName, content);
    return content;
  } catch (error) {
    console.error(`Failed to load template: ${templateName}`, error);
    // Fallback to blank template
    return '<p></p>';
  }
}

function isDocumentBlank(): boolean {
  if (!props.editor) return true;
  const json = props.editor.getJSON();
  // Check if document only has empty paragraph
  if (json.content?.length === 1) {
    const firstNode = json.content[0];
    if (firstNode.type === 'paragraph' && (!firstNode.content || firstNode.content.length === 0)) {
      return true;
    }
  }
  return false;
}

async function createFromTemplate(template: string) {
  if (!props.editor) return;
  
  showNewFileDialog.value = false;
  
  // If document is not blank, open template in new tab
  if (!isDocumentBlank()) {
    const url = router.resolve({ name: 'docs-template', params: { template } }).href;
    window.open(url, '_blank');
    return;
  }
  
  // Load and apply template to current document
  const content = await loadTemplate(template);
  props.editor.commands.setContent(content);
}

function applyPaginationSettings() {
  emit('update-pagination', paginationSettings.value);
  // Also emit orientation update explicitly for parent convenience
  emit('update:pageOrientation', paginationSettings.value.orientation);
  showPaginationDialog.value = false;
}

function onPageSizeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update:pageSize', target.value);
}

// handleOrientation removed; orientation now controlled via Page Settings dialog

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

/* Crystal Toggle Button */
.tiptap-toolbar__crystal-toggle {
  --orb-size: 40px;
  width: var(--orb-size);
  height: var(--orb-size);
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
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
  color: currentColor;
  position: relative;
  z-index: 2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.tiptap-toolbar__crystal-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.2),
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
  transform: rotate(180deg);
}

.tiptap-toolbar__crystal-toggle.is-expanded:hover {
  transform: translateY(-1px) rotate(180deg);
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.2),
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
  width: 6px;
  height: 6px;
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
