<template>
  <div class="w-80 max-w-80 min-w-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
    <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
          {{ markdownElement ? $t('Commons.heading.markdown_element') : (selectedElement ? $t('Commons.heading.element_properties') : $t('Commons.heading.slide_properties')) }}
        </h3>
        <div class="flex items-center gap-1">
          <button
            v-if="markdownElement || selectedElement"
            @click="emit('show-animation-panel')"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Animate Element"
          >
            <Zap class="h-4 w-4 text-gray-500" />
          </button>
          <button
            @click="emit('toggle-panel')"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Toggle Properties Panel"
          >
            <Settings class="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
      <!-- Markdown Element Properties -->
      <template v-if="markdownElement">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.element_type')}}</label>
          <div class="text-sm px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md capitalize">
            {{ markdownElement.type }}
            <span v-if="markdownElement.level" class="text-xs text-gray-500 ml-1">({{ markdownElement.level }})</span>
            <span v-if="markdownElement.language" class="text-xs text-gray-500 ml-1">({{ markdownElement.language }})</span>
          </div>
        </div>

        <!-- Content Preview -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.content')}}</label>
          <div class="text-sm px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md max-h-32 overflow-y-auto font-mono text-xs">
            {{ markdownElement.content.substring(0, 200) }}{{ markdownElement.content.length > 200 ? '...' : '' }}
          </div>
        </div>

        <!-- Position Info -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.position')}}</label>
          <div class="text-sm px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md">
            Line: {{ markdownElement.startLine + 1 }}{{ markdownElement.endLine > markdownElement.startLine ? `-${markdownElement.endLine + 1}` : '' }}
          </div>
        </div>

        <!-- Layout (UnoCSS): Position, Margin, Padding - for heading, paragraph, image -->
        <template v-if="['heading', 'paragraph', 'image'].includes(markdownElement.type)">
          <div class="pt-1 border-t border-gray-200 dark:border-gray-700 first:border-t-0 first:pt-0">
            <span class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 block mb-2">Layout</span>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Position</label>
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="pos in positionTypes"
                :key="pos.value"
                class="px-2 py-1 text-xs rounded border transition-colors"
                :class="blockLayout.position === pos.value ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="applyBlockLayout({ position: pos.value })"
              >
                {{ pos.label }}
              </button>
            </div>
          </div>
          <div v-if="blockLayout.position === 'absolute'" class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-gray-500 block mb-0.5">Top</label>
                <select
                  :value="blockLayout.top"
                  class="w-full text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                  @change="applyBlockLayout({ top: ($event.target as HTMLSelectElement).value })"
                >
                  <option value="">—</option>
                  <option value="top-0">0</option>
                  <option value="top-4">4</option>
                  <option value="top-8">8</option>
                  <option value="top-1/2 -translate-y-1/2">50%</option>
                </select>
              </div>
              <div>
                <label class="text-[10px] text-gray-500 block mb-0.5">Left</label>
                <select
                  :value="blockLayout.left"
                  class="w-full text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                  @change="applyBlockLayout({ left: ($event.target as HTMLSelectElement).value })"
                >
                  <option value="">—</option>
                  <option value="left-0">0</option>
                  <option value="left-4">4</option>
                  <option value="left-8">8</option>
                  <option value="left-1/2 -translate-x-1/2">50%</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-gray-500 block mb-0.5">Top (custom)</label>
                <input
                  :value="blockLayoutTopCustom"
                  type="text"
                  class="w-full text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono"
                  placeholder="e.g. 20% or 100px"
                  @input="applyBlockLayoutTopCustom(($event.target as HTMLInputElement).value)"
                />
              </div>
              <div>
                <label class="text-[10px] text-gray-500 block mb-0.5">Left (custom)</label>
                <input
                  :value="blockLayoutLeftCustom"
                  type="text"
                  class="w-full text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono"
                  placeholder="e.g. 30% or 80px"
                  @input="applyBlockLayoutLeftCustom(($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </div>
          <div class="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
            <span class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 block mb-2">Spacing</span>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Margin</label>
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="m in marginPresets"
                :key="m.value"
                class="px-2 py-1 text-[10px] rounded border transition-colors"
                :class="blockLayout.margin === m.value ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="applyBlockLayout({ margin: m.value })"
              >
                {{ m.label }}
              </button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Padding</label>
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="p in paddingPresets"
                :key="p.value"
                class="px-2 py-1 text-[10px] rounded border transition-colors"
                :class="blockLayout.padding === p.value ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="applyBlockLayout({ padding: p.value })"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
          <template v-if="['heading', 'paragraph'].includes(markdownElement.type)">
            <div class="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <span class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 block mb-2">Typography</span>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Font</label>
              <div class="flex gap-1 flex-wrap">
                <button
                  v-for="f in fontFamilyPresets"
                  :key="f.value"
                  class="px-2 py-1 text-[10px] rounded border transition-colors"
                  :class="blockLayout.font === f.value ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                  @click="applyBlockLayout({ font: f.value })"
                >
                  {{ f.label }}
                </button>
              </div>
            </div>
          </template>
        </template>

        <!-- Mermaid/Code Specific Controls -->
        <template v-if="markdownElement.type === 'mermaid' || markdownElement.type === 'code'">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.scale')}}</label>
            <div class="space-y-2">
              <input
                :value="componentScale"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                class="w-full"
                @input="updateComponentScale(parseFloat(($event.target as HTMLInputElement).value))"
              />
              <div class="flex justify-between text-xs text-gray-500">
                <span>50%</span>
                <span class="font-medium">{{ Math.round(componentScale * 100) }}%</span>
                <span>200%</span>
              </div>
            </div>
          </div>
          
          <!-- Mermaid-specific intelligent scaling -->
          <div v-if="markdownElement.type === 'mermaid' && diagramMetrics.elementCount > 0">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.diagram_info')}}</label>
            <div class="text-xs px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-500">Type:</span>
                <span class="font-medium capitalize">{{ diagramMetrics.complexity }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Elements:</span>
                <span class="font-medium">{{ diagramMetrics.elementCount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Optimal Scale:</span>
                <span class="font-medium">{{ Math.round(mermaidScale * 100) }}%</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Heading Specific Controls -->
        <template v-if="markdownElement.type === 'heading'">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.heading_level')}}</label>
            <div class="flex gap-1">
              <button
                v-for="level in 6"
                :key="level"
                class="flex-1 px-2 py-1.5 text-xs rounded border transition-colors"
                :class="markdownElement.level === level 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="updateHeadingLevel(level)"
              >
                H{{ level }}
              </button>
            </div>
          </div>
        </template>

        <!-- Image Specific Controls -->
        <template v-if="markdownElement.type === 'image'">
          <!-- Image Preview -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.alt.preview')}}</label>
            <div class="border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-gray-50 dark:bg-gray-800 min-h-[100px] flex items-center justify-center">
              <img 
                v-if="markdownElement.attributes?.url"
                :src="String(markdownElement.attributes?.url)"
                :alt="String(markdownElement.attributes?.alt || '')"
                :class="[
                  'max-w-full max-h-32 object-contain',
                  { 'rounded-full': imageShape === 'circle' },
                  { 'rounded-lg': imageShape === 'rounded' },
                  { 'clip-hexagon': imageShape === 'hexagon' }
                ]"
                :style="{
                  width: imageSize.width !== 'auto' ? imageSize.width : undefined,
                  height: imageSize.height !== 'auto' ? imageSize.height : undefined
                }"
              />
              <div v-else class="text-gray-400 text-xs">{{$t('Components.Slides.text.no_image_loaded')}}</div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.image_source')}}</label>
            <div class="space-y-2">
              <input
                :value="markdownElement.attributes?.url || ''"
                type="url"
                class="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                placeholder="https://example.com/image.jpg"
                :title="String(markdownElement.attributes?.url || '')"
                @input="updateImageUrl(($event.target as HTMLInputElement).value)"
              />
              <div class="grid grid-cols-3 gap-1">
                <button
                  class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  @click="handleImageUpload"
                >
                  {{$t('Commons.button.upload')}}
                </button>
                <button
                  class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  @click="handleImageReplace"
                >
                  {{$t('Commons.button.replace')}}
                </button>
                <button
                  class="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                  @click="handleImageFromUrl"
                >
                  {{$t('Commons.button.url')}}
                </button>
              </div>
            </div>
          </div>
          
          <!-- Advanced Image Controls -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.button.advanced')}}</label>
            <div class="space-y-2">
              <!-- Image Position -->
              <div>
                <label class="text-[10px] text-gray-500">{{$t('Commons.label.position')}}</label>
                <select
                  :value="imagePosition"
                  class="w-full text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                  @change="updateImagePosition(($event.target as HTMLSelectElement).value)"
                >
                  <option value="inline">{{$t('Commons.text.inline')}}</option>
                  <option value="left">Float Left</option>
                  <option value="right">Float Right</option>
                  <option value="center">{{$t('Commons.text.center')}}</option>
                </select>
              </div>
              
              <!-- Image Quality/Compression -->
              <div>
                <label class="text-[10px] text-gray-500">{{$t('Commons.label.quality')}}</label>
                <div class="flex items-center gap-2">
                  <input
                    :value="imageQuality"
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    class="flex-1"
                    @input="updateImageQuality(parseInt(($event.target as HTMLInputElement).value))"
                  />
                  <span class="text-xs text-gray-500 w-8">{{ imageQuality }}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.alt_text')}}</label>
            <textarea
              :value="String(markdownElement.attributes?.alt || '')"
              class="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md resize-none"
              rows="2"
              placeholder="Describe the image for accessibility..."
              @input="updateImageAlt(($event.target as HTMLInputElement).value)"
            />
          </div>

          <!-- Shape Masks -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Components.Slides.label.shape_style')}}</label>
            <div class="grid grid-cols-4 gap-1">
              <button
                class="p-2 text-xs border rounded transition-colors"
                :class="imageShape === 'none' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="updateImageShape('none')"
              >
                {{$t('Commons.button.none')}}
              </button>
              <button
                class="p-2 text-xs border rounded transition-colors"
                :class="imageShape === 'circle' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="updateImageShape('circle')"
              >
                {{$t('Commons.button.circle')}}
              </button>
              <button
                class="p-2 text-xs border rounded transition-colors"
                :class="imageShape === 'rounded' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="updateImageShape('rounded')"
              >
                {{$t('Commons.button.rounded')}}
              </button>
              <button
                class="p-2 text-xs border rounded transition-colors"
                :class="imageShape === 'hexagon' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="updateImageShape('hexagon')"
              >
                {{$t('Commons.button.hex')}}
              </button>
            </div>
          </div>

          <!-- Precise Size Control -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.dimensions')}}</label>
            <div class="space-y-2">
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="text-[10px] text-gray-500">{{$t('Commons.label.width')}}</label>
                  <div class="flex gap-1">
                    <input
                      :value="imageSize.width"
                      type="number"
                      class="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                      placeholder="auto"
                      @input="updateImageSize('width', ($event.target as HTMLInputElement).value)"
                    />
                    <select
                      :value="imageSize.unit"
                      class="text-sm px-1 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                      @change="updateImageUnit(($event.target as HTMLSelectElement).value)"
                    >
                      <option value="px">px</option>
                      <option value="%">%</option>
                      <option value="auto">auto</option>
                    </select>
                  </div>
                </div>
                <div class="flex-1">
                  <label class="text-[10px] text-gray-500">{{$t('Commons.label.height')}}</label>
                  <div class="flex gap-1">
                    <input
                      :value="imageSize.height"
                      type="number"
                      class="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                      placeholder="auto"
                      @input="updateImageSize('height', ($event.target as HTMLInputElement).value)"
                    />
                    <button
                      class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                      @click="toggleAspectRatio"
                      :class="{ 'bg-blue-500': aspectRatioLocked }"
                    >
                      🔒
                    </button>
                  </div>
                </div>
              </div>
              <!-- Quick Size Presets -->
              <div class="flex gap-1">
                <button
                  v-for="preset in imagePresets"
                  :key="preset.name"
                  class="px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  @click="applyImagePreset(preset)"
                >
                  {{ preset.name }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Table Specific Controls -->
        <template v-if="markdownElement.type === 'table'">
          <!-- Table Structure Preview -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.table_structure')}}</label>
            <div class="text-xs px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
              {{ getTableInfo().rows }} rows × {{ getTableInfo().columns }} columns
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.table_actions')}}</label>
            <div class="grid grid-cols-2 gap-1">
              <button
                class="px-2 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                @click="addTableRow('above')"
              >
                {{$t('Components.Slides.button.row_above')}}
              </button>
              <button
                class="px-2 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                @click="addTableRow('below')"
              >
                {{$t('Components.Slides.button.row_below')}}
              </button>
              <button
                class="px-2 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                @click="addTableColumn('left')"
              >
                ➕ Column Left
              </button>
              <button
                class="px-2 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                @click="addTableColumn('right')"
              >
                ➕ Column Right
              </button>
              <button
                class="px-2 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                @click="removeTableRow"
              >
                {{$t('Components.Slides.button.remove_row')}}
              </button>
              <button
                class="px-2 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                @click="removeTableColumn"
              >
                {{$t('Components.Slides.button.remove_column')}}
              </button>
            </div>
          </div>

          <!-- Advanced Table Operations -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.button.advanced')}}</label>
            <div class="grid grid-cols-2 gap-1">
              <button
                class="px-2 py-1.5 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                @click="sortTableColumn"
              >
                {{$t('Components.Slides.button.sort_column')}}
              </button>
              <button
                class="px-2 py-1.5 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                @click="transposeTable"
              >
                {{$t('Commons.button.transpose')}}
              </button>
              <button
                class="px-2 py-1.5 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                @click="addTableHeader"
              >
                {{$t('Components.Slides.button.add_header')}}
              </button>
              <button
                class="px-2 py-1.5 text-xs bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors"
                @click="addTableFooter"
              >
                {{$t('Components.Slides.button.add_footer')}}
              </button>
            </div>
          </div>

          <!-- Table Style -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.table_style')}}</label>
            <div class="space-y-2">
              <label class="flex items-center gap-2 text-xs">
                <input
                  :checked="tableStyle.striped"
                  type="checkbox"
                  class="rounded"
                  @change="updateTableStyle('striped', ($event.target as HTMLInputElement).checked)"
                />
                {{$t('Commons.text.striped_rows')}}
              </label>
              <label class="flex items-center gap-2 text-xs">
                <input
                  :checked="tableStyle.bordered"
                  type="checkbox"
                  class="rounded"
                  @change="updateTableStyle('bordered', ($event.target as HTMLInputElement).checked)"
                />
                Bordered
              </label>
              <label class="flex items-center gap-2 text-xs">
                <input
                  :checked="tableStyle.compact"
                  type="checkbox"
                  class="rounded"
                  @change="updateTableStyle('compact', ($event.target as HTMLInputElement).checked)"
                />
                Compact
              </label>
              <label class="flex items-center gap-2 text-xs">
                <input
                  :checked="tableStyle.hoverable"
                  type="checkbox"
                  class="rounded"
                  @change="updateTableStyle('hoverable', ($event.target as HTMLInputElement).checked)"
                />
                {{$t('Commons.label.hoverable_rows')}}
              </label>
            </div>
          </div>

          <!-- Cell Alignment -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.cell_alignment')}}</label>
            <select
              :value="tableAlignment"
              class="w-full text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
              @change="updateTableAlignment(($event.target as HTMLSelectElement).value)"
            >
              <option value="left">{{$t('Commons.label.left')}}</option>
              <option value="center">{{$t('Commons.text.center')}}</option>
              <option value="right">{{$t('Commons.label.right')}}</option>
              <option value="justify">{{$t('Commons.text.justify')}}</option>
            </select>
          </div>

          <!-- Table Width -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.table_width')}}</label>
            <div class="flex gap-2">
              <input
                :value="tableWidth"
                type="number"
                class="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                placeholder="100"
                @input="updateTableWidth(($event.target as HTMLInputElement).value)"
              />
              <select
                :value="tableWidthUnit"
                class="text-sm px-1 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                @change="updateTableWidthUnit(($event.target as HTMLSelectElement).value)"
              >
                <option value="%">%</option>
                <option value="px">px</option>
                <option value="auto">auto</option>
              </select>
            </div>
          </div>
        </template>

        <!-- Text/Paragraph/Heading Controls -->
        <template v-if="markdownElement.type === 'heading' || markdownElement.type === 'paragraph'">
          <!-- Text Content Editor -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.text_content')}}</label>
            <textarea
              :value="getTextContent()"
              class="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md resize-none"
              rows="3"
              placeholder="Enter text content..."
              @input="updateTextContent(($event.target as HTMLInputElement).value)"
            />
          </div>
          
          <!-- Smart Font Sizing -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Components.Slides.label.smart_font_sizing')}}</label>
            <div class="space-y-2">
              <div class="text-xs px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-blue-700 dark:text-blue-300 font-medium">{{$t('Commons.text.recommended_size')}}</span>
                  <span v-if="isFontAnalyzing" class="text-blue-600 dark:text-blue-400 text-[10px]">Analyzing...</span>
                </div>
                <div class="text-sm font-mono text-blue-900 dark:text-blue-100">
                  {{ markdownElement.type === 'heading' ? sizingRecommendations.title || $t('Commons.text.auto') : sizingRecommendations.body || $t('Commons.text.auto') }}
                </div>
              </div>
              
              <!-- Font Size Presets -->
              <div>
                <label class="text-[10px] text-gray-500 mb-1 block">{{$t('Commons.label.quick_presets')}}</label>
                <div class="grid grid-cols-3 gap-1">
                  <button
                    v-for="size in ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl']" 
                    :key="size"
                    class="px-2 py-1 text-[10px] border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    :class="elementStyles.fontSize?.includes(size) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'"
                    @click="applyFontSizeClass(size)"
                  >
                    {{ size }}
                  </button>
                </div>
              </div>
              
              <!-- CSS Clamp Value -->
              <div>
                <label class="text-[10px] text-gray-500 mb-1 block">CSS Clamp (Responsive)</label>
                <div class="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 font-mono">
                  {{ generateClampValues(markdownElement.type === 'heading' ? 'title' : 'body') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Text Formatting -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.text_formatting')}}</label>
            <div class="flex gap-1 flex-wrap">
              <button
                class="px-2 py-1 text-xs border rounded transition-colors"
                :class="textFormatting.bold 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="toggleTextFormatting('bold')"
              >
                **Bold**
              </button>
              <button
                class="px-2 py-1 text-xs border rounded transition-colors"
                :class="textFormatting.italic 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="toggleTextFormatting('italic')"
              >
                *Italic*
              </button>
              <button
                class="px-2 py-1 text-xs border rounded transition-colors"
                :class="textFormatting.underline 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="toggleTextFormatting('underline')"
              >
                <u>{{$t('Commons.text.underline')}}</u>
              </button>
              <button
                class="px-2 py-1 text-xs border rounded transition-colors"
                :class="textFormatting.strikethrough 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="toggleTextFormatting('strikethrough')"
              >
                ~~Strike~~
              </button>
            </div>
          </div>

          <!-- Text Alignment -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.text_alignment')}}</label>
            <div class="flex gap-1">
              <button
                class="flex-1 px-2 py-1.5 text-xs rounded border transition-colors"
                :class="elementStyles.textAlign === 'left' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="updateStyle('textAlign', 'left')"
              >
                {{$t('Commons.button.left')}}
              </button>
              <button
                class="flex-1 px-2 py-1.5 text-xs rounded border transition-colors"
                :class="elementStyles.textAlign === 'center' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="updateStyle('textAlign', 'center')"
              >
                {{$t('Commons.button.center')}}
              </button>
              <button
                class="flex-1 px-2 py-1.5 text-xs rounded border transition-colors"
                :class="elementStyles.textAlign === 'right' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="updateStyle('textAlign', 'right')"
              >
                {{$t('Commons.button.right')}}
              </button>
            </div>
          </div>

          <!-- Text Color -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.text_color')}}</label>
            <div class="flex gap-2">
              <input
                :value="elementStyles.color"
                type="color"
                class="w-10 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                @input="updateStyle('color', ($event.target as HTMLInputElement).value)"
              />
              <input
                :value="elementStyles.color"
                type="text"
                class="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                placeholder="#000000"
                @input="updateStyle('color', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </template>

        <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            class="w-full px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            @click="clearMarkdownElement"
          >
            {{$t('Commons.button.clear_selection_2')}}
          </button>
        </div>
      </template>

      <!-- Selected Element Properties -->
      <template v-else-if="selectedElement">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.element_type')}}</label>
          <div class="text-sm px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md">
            {{ elementType }}
          </div>
        </div>

        <!-- Font Size -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.font_size')}}</label>
          <div class="flex gap-2">
            <input
              :value="elementStyles.fontSize"
              type="text"
              class="flex-1 text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="16px"
              @input="updateStyle('fontSize', ($event.target as HTMLInputElement).value)"
            />
            <select
              class="text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
              @change="applyPresetSize(($event.target as HTMLSelectElement).value)"
            >
              <option value="">{{$t('Commons.text.preset')}}</option>
              <option value="text-xs">XS (12px)</option>
              <option value="text-sm">SM (14px)</option>
              <option value="text-base">Base (16px)</option>
              <option value="text-lg">LG (18px)</option>
              <option value="text-xl">XL (20px)</option>
              <option value="text-2xl">2XL (24px)</option>
              <option value="text-3xl">3XL (30px)</option>
              <option value="text-4xl">4XL (36px)</option>
              <option value="text-5xl">5XL (48px)</option>
              <option value="text-6xl">6XL (60px)</option>
            </select>
          </div>
        </div>

        <!-- Text Alignment -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.text_align')}}</label>
          <div class="flex gap-1">
            <button
              v-for="align in ['left', 'center', 'right']"
              :key="align"
              class="flex-1 px-2 py-1.5 text-xs rounded border transition-colors"
              :class="elementStyles.textAlign === align 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
              @click="updateStyle('textAlign', align)"
            >
              {{ align }}
            </button>
          </div>
        </div>

        <!-- Font Weight -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.font_weight')}}</label>
          <div class="flex gap-1">
            <button
              v-for="weight in [{ label: 'Normal', value: 'normal' }, { label: 'Bold', value: 'bold' }]"
              :key="weight.value"
              class="flex-1 px-2 py-1.5 text-xs rounded border transition-colors"
              :class="elementStyles.fontWeight === weight.value 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
              @click="updateStyle('fontWeight', weight.value)"
            >
              {{ weight.label }}
            </button>
          </div>
        </div>

        <!-- Color -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.text_color')}}</label>
          <div class="flex gap-2">
            <input
              :value="elementStyles.color"
              type="color"
              class="w-10 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              @input="updateStyle('color', ($event.target as HTMLInputElement).value)"
            />
            <input
              :value="elementStyles.color"
              type="text"
              class="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="#000000"
              @input="updateStyle('color', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

        <!-- Mermaid/Component Scaling (if applicable) -->
        <div v-if="isMermaidOrComponent">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.scale')}}</label>
          <div class="space-y-2">
            <input
              :value="componentScale"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              class="w-full"
              @input="updateComponentScale(parseFloat(($event.target as HTMLInputElement).value))"
            />
            <div class="flex justify-between text-xs text-gray-500">
              <span>50%</span>
              <span class="font-medium">{{ Math.round(componentScale * 100) }}%</span>
              <span>200%</span>
            </div>
          </div>
        </div>

        <!-- Animations Button -->
        <div>
          <button
            class="w-full px-3 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
            @click="openAnimationPane"
          >
            <Play class="h-4 w-4" />
            Animations
          </button>
        </div>

        <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            class="w-full px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            @click="clearSelection"
          >
            {{$t('Commons.button.clear_selection_2')}}
          </button>
        </div>
      </template>

      <!-- Slide-Level Properties (when no element selected) -->
      <template v-else>
        <!-- Layout -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.layout')}}</label>
          <select
            :value="layout"
            class="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
            @change="emit('update:layout', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="l in layouts" :key="l.value" :value="l.value">
              {{ l.label }}
            </option>
          </select>
        </div>

        <!-- Background -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.background')}}</label>
          <div class="flex gap-2">
            <input
              :value="background"
              type="color"
              class="w-10 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              @input="emit('update:background', ($event.target as HTMLInputElement).value)"
            />
            <input
              :value="background"
              type="text"
              class="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="#ffffff"
              @input="emit('update:background', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

        <!-- Transition -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{$t('Commons.label.transition')}}</label>
          <select
            :value="transition"
            class="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
            @change="emit('update:transition', ($event.target as HTMLSelectElement).value)"
          >
            <option value="slide-left">{{$t('Commons.text.slide_left')}}</option>
            <option value="slide-right">{{$t('Commons.text.slide_right')}}</option>
            <option value="slide-up">{{$t('Commons.text.slide_up')}}</option>
            <option value="fade">{{$t('Commons.text.fade')}}</option>
            <option value="fade-out">{{$t('Commons.text.fade_out')}}</option>
            <option value="none">{{$t('Commons.text.none_2')}}</option>
          </select>
        </div>

        <!-- Quick Templates -->
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{{$t('Commons.label.quick_templates')}}</label>
          
          <div class="space-y-3">
            <div>
              <span class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-500">{{$t('Commons.text.title')}}</span>
              <div class="grid grid-cols-2 gap-1 mt-1">
                <button
                  v-for="template in titleTemplates"
                  :key="template.id"
                  class="p-1.5 text-[10px] text-left bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  :title="template.description"
                  @click="emit('apply-template', template)"
                >
                  {{ template.name }}
                </button>
              </div>
            </div>
            
            <div>
              <span class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-500">{{$t('Commons.label.content')}}</span>
              <div class="grid grid-cols-2 gap-1 mt-1">
                <button
                  v-for="template in contentTemplates"
                  :key="template.id"
                  class="p-1.5 text-[10px] text-left bg-gray-50 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30 rounded border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                  :title="template.description"
                  @click="emit('apply-template', template)"
                >
                  {{ template.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Animation Pane Overlay -->
    <SlidesAnimationPane
      v-if="showAnimationPane"
      :selected-element="selectedElement"
      :markdown-element="markdownElement"
      @back="backToProperties"
      @close="closeAnimationPane"
      @update-animation="updateElementAnimation"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Settings, Zap } from 'lucide-vue-next';
import { 
  SLIDEV_LAYOUTS, 
  SLIDE_TEMPLATES,
  parseBlockAttributesFromLine,
  type SlideTemplate
} from '@/utils/slidevMarkdown';
import type { MarkdownElement } from '@/utils/markdownElementDetector';
import { useSmartFontSizing } from '@/composables/useSmartFontSizing';
import { useMermaidScaling } from '@/composables/useMermaidScaling';
import SlidesAnimationPane from './SlidesAnimationPane.vue';

interface Props {
  layout: string;
  background: string;
  transition: string;
  selectedElement: HTMLElement | null;
  elementType: string;
  markdownElement?: MarkdownElement | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'toggle-panel'): void;
  (e: 'show-animation-panel'): void;
  (e: 'update:layout', value: string): void;
  (e: 'update:background', value: string): void;
  (e: 'update:transition', value: string): void;
  (e: 'apply-template', template: SlideTemplate): void;
  (e: 'update-element-style', property: string, value: string): void;
  (e: 'update-component-scale', scale: number): void;
  (e: 'clear-selection'): void;
  (e: 'update-markdown-element', element: any): void;
  (e: 'clear-markdown-element'): void;
  (e: 'update-animation', animation: ElementAnimation): void;
  (e: 'apply-smart-sizing', sizes: Record<string, string>): void;
}>();

// Initialize composables
const previewContainerRef = ref<HTMLElement | null>(null);
const { 
  sizingRecommendations, 
  isAnalyzing: isFontAnalyzing,
  generateClampValues
} = useSmartFontSizing(previewContainerRef);

const {
  currentScale: mermaidScale,
  diagramMetrics
} = useMermaidScaling(previewContainerRef);

const layouts = SLIDEV_LAYOUTS;

const titleTemplates = computed(() => 
  SLIDE_TEMPLATES.filter(t => t.category === 'title').slice(0, 4)
);

const contentTemplates = computed(() => 
  SLIDE_TEMPLATES.filter(t => t.category === 'content').slice(0, 4)
);

const positionTypes = [
  { value: 'static', label: 'Static' },
  { value: 'relative', label: 'Relative' },
  { value: 'absolute', label: 'Absolute' }
];

const marginPresets = [
  { value: '', label: '—' },
  { value: 'm-0', label: '0' },
  { value: 'm-1', label: '1' },
  { value: 'm-2', label: '2' },
  { value: 'm-4', label: '4' },
  { value: 'm-6', label: '6' },
  { value: 'm-8', label: '8' },
  { value: 'm-12', label: '12' },
  { value: 'm-16', label: '16' },
  { value: 'mt-1', label: 'mt-1' },
  { value: 'mt-2', label: 'mt-2' },
  { value: 'mt-4', label: 'mt-4' },
  { value: 'mt-8', label: 'mt-8' },
  { value: 'mb-1', label: 'mb-1' },
  { value: 'mb-2', label: 'mb-2' },
  { value: 'mb-4', label: 'mb-4' },
  { value: 'ml-2', label: 'ml-2' },
  { value: 'ml-4', label: 'ml-4' },
  { value: 'mr-2', label: 'mr-2' },
  { value: 'mr-4', label: 'mr-4' }
];

const paddingPresets = [
  { value: '', label: '—' },
  { value: 'p-0', label: '0' },
  { value: 'p-1', label: '1' },
  { value: 'p-2', label: '2' },
  { value: 'p-3', label: '3' },
  { value: 'p-4', label: '4' },
  { value: 'p-6', label: '6' },
  { value: 'p-8', label: '8' },
  { value: 'p-12', label: '12' },
  { value: 'px-2', label: 'px-2' },
  { value: 'px-4', label: 'px-4' },
  { value: 'py-2', label: 'py-2' },
  { value: 'py-4', label: 'py-4' }
];

const fontFamilyPresets = [
  { value: '', label: 'Default' },
  { value: 'font-sans', label: 'Sans' },
  { value: 'font-serif', label: 'Serif' },
  { value: 'font-mono', label: 'Mono' }
];

function parseBlockClassIntoLayout(blockClass: string | undefined): { position: string; top: string; left: string; margin: string; padding: string; font: string } {
  const classes = (blockClass || '').trim().split(/\s+/).filter(Boolean);
  const position = classes.includes('absolute') ? 'absolute' : classes.includes('relative') ? 'relative' : 'static';
  const top = classes.includes('top-1/2') && classes.includes('-translate-y-1/2') ? 'top-1/2 -translate-y-1/2' : (classes.find(c => c.startsWith('top-')) || '');
  const left = classes.includes('left-1/2') && classes.includes('-translate-x-1/2') ? 'left-1/2 -translate-x-1/2' : (classes.find(c => c.startsWith('left-')) || '');
  const margin = classes.find(c => /^m[trbl]?-\d+$/.test(c) || c === 'm-0') || '';
  const padding = classes.find(c => /^p[trbl]?-\d+$/.test(c) || c === 'p-0') || '';
  const font = classes.find(c => FONT_FAMILY_CLASSES.includes(c)) || '';
  return { position, top, left, margin, padding, font };
}

const blockLayout = computed(() => {
  if (!props.markdownElement) return { position: 'static' as string, top: '', left: '', margin: '', padding: '', font: '' };
  const layout = parseBlockClassIntoLayout(props.markdownElement.blockClass);
  console.log('🎯 Block layout computed:', layout);
  return layout;
});

function parseArbitraryClassValue(className: string): string {
  const match = className.match(/^[a-z]+-\[(.+)\]$/);
  return match ? match[1] : '';
}

const blockLayoutTopCustom = computed(() => {
  const t = blockLayout.value.top;
  if (!t || t === 'top-0' || t === 'top-4' || t === 'top-8' || (t.includes('top-1/2') && t.includes('-translate-y-1/2'))) return '';
  return parseArbitraryClassValue(t.split(' ')[0] || '');
});

const blockLayoutLeftCustom = computed(() => {
  const l = blockLayout.value.left;
  if (!l || l === 'left-0' || l === 'left-4' || l === 'left-8' || (l.includes('left-1/2') && l.includes('-translate-x-1/2'))) return '';
  return parseArbitraryClassValue(l.split(' ')[0] || '');
});

function applyBlockLayoutTopCustom(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    applyBlockLayout({ top: '' });
    return;
  }
  const topClass = trimmed.includes('%') || trimmed.includes('px') || /^\d+$/.test(trimmed)
    ? `top-[${trimmed.replace(/^(\d+)$/, '$1px')}]`
    : `top-[${trimmed}]`;
  applyBlockLayout({ top: topClass });
}

function applyBlockLayoutLeftCustom(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    applyBlockLayout({ left: '' });
    return;
  }
  const leftClass = trimmed.includes('%') || trimmed.includes('px') || /^\d+$/.test(trimmed)
    ? `left-[${trimmed.replace(/^(\d+)$/, '$1px')}]`
    : `left-[${trimmed}]`;
  applyBlockLayout({ left: leftClass });
}

const FONT_FAMILY_CLASSES = ['font-sans', 'font-serif', 'font-mono'];

const LAYOUT_CLASS_DROP = new Set([
  'static', 'relative', 'absolute',
  'top-0', 'top-4', 'top-8', 'top-1/2', '-translate-y-1/2',
  'left-0', 'left-4', 'left-8', 'left-1/2', '-translate-x-1/2',
  'm-0', 'm-1', 'm-2', 'm-4', 'm-6', 'm-8', 'm-12', 'm-16',
  'mt-1', 'mt-2', 'mt-4', 'mt-8', 'mb-1', 'mb-2', 'mb-4', 'ml-2', 'ml-4', 'mr-2', 'mr-4',
  'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-12', 'px-2', 'px-4', 'py-2', 'py-4',
  ...FONT_FAMILY_CLASSES
]);

function mergeBlockClasses(
  existingClass: string | undefined,
  updates: { position?: string; top?: string; left?: string; margin?: string; padding?: string; font?: string }
): string {
  const existing = (existingClass || '').trim().split(/\s+/).filter(Boolean);
  const filtered = existing.filter(
    (c) =>
      !LAYOUT_CLASS_DROP.has(c) &&
      !c.startsWith('top-') &&
      !c.startsWith('left-') &&
      !FONT_FAMILY_CLASSES.includes(c)
  );
  const add: string[] = [];
  if (updates.position && updates.position !== 'static') add.push(updates.position);
  if (updates.top) add.push(...updates.top.split(' '));
  if (updates.left) add.push(...updates.left.split(' '));
  if (updates.margin) add.push(updates.margin);
  if (updates.padding) add.push(updates.padding);
  if (updates.font) add.push(updates.font);
  return [...filtered, ...add].filter(Boolean).join(' ');
}

function applyBlockLayout(updates: { position?: string; top?: string; left?: string; margin?: string; padding?: string; font?: string }) {
  if (!props.markdownElement) return;
  const current = blockLayout.value;
  const merged = mergeBlockClasses(props.markdownElement.blockClass, {
    position: updates.position ?? current.position,
    top: updates.top !== undefined ? updates.top : current.top,
    left: updates.left !== undefined ? updates.left : current.left,
    margin: updates.margin !== undefined ? updates.margin : current.margin,
    padding: updates.padding !== undefined ? updates.padding : current.padding,
    font: updates.font !== undefined ? updates.font : current.font
  });
  const classesAttr = merged ? ' {.' + merged.replace(/\s+/g, ' .') + '}' : '';
  let newContent: string;
  if (props.markdownElement.type === 'heading') {
    const level = props.markdownElement.level ?? 1;
    const text = getTextContent();
    newContent = '#'.repeat(level) + ' ' + text + classesAttr;
  } else if (props.markdownElement.type === 'paragraph') {
    const lines = props.markdownElement.content.split('\n');
    const firstLine = lines[0] || '';
    const { rest } = parseBlockAttributesFromLine(firstLine.trim());
    const newFirst = rest + classesAttr;
    newContent = [newFirst, ...lines.slice(1)].join('\n');
  } else if (props.markdownElement.type === 'image') {
    const alt = String(props.markdownElement.attributes?.alt ?? '');
    const url = String(props.markdownElement.attributes?.url ?? '');
    newContent = `![${alt}](${url})${classesAttr}`;
  } else {
    return;
  }
  emit('update-markdown-element', { ...props.markdownElement, content: newContent });
}

// Element-specific state
const elementStyles = ref({
  fontSize: '16px',
  textAlign: 'left',
  fontWeight: 'normal',
  color: '#000000'
});

const componentScale = ref(1.0);

// Image-specific state
const imageShape = ref('none');
const imageSize = ref({ width: 'auto', height: 'auto', unit: 'px', ratio: 1 });
const imagePosition = ref('inline');
const imageQuality = ref(80);
const aspectRatioLocked = ref(false);

// Image presets
const imagePresets = [
  { name: 'Icon', width: 32, height: 32 },
  { name: 'Thumb', width: 150, height: 150 },
  { name: 'Small', width: 300, height: 200 },
  { name: 'Medium', width: 600, height: 400 },
  { name: 'Large', width: 1200, height: 800 },
  { name: 'HD', width: 1920, height: 1080 }
];

// Table-specific state
const tableStyle = ref({
  striped: false,
  bordered: false,
  compact: false,
  hoverable: false
});

const tableAlignment = ref('left');
const tableWidth = ref('100');
const tableWidthUnit = ref('%');

// Text-specific state
const textFormatting = ref({
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false
});

const isMermaidOrComponent = computed(() => {
  if (!props.selectedElement) return false;
  return props.selectedElement.classList.contains('mermaid-diagram') ||
         props.selectedElement.classList.contains('slide-table') ||
         props.selectedElement.classList.contains('code-block') ||
         props.selectedElement.tagName.toLowerCase() === 'img';
});

// Animation state
const showAnimationPane = ref(false);
const elementAnimations = ref<Map<string, ElementAnimation>>(new Map());

interface ElementAnimation {
  enabled: boolean;
  type: string;
  duration: number;
  delay: number;
  easing: string;
  trigger: 'onLoad' | 'onClick' | 'onHover' | 'onScroll';
  repeat: boolean;
  repeatCount: number | 'infinite';
}

// Animation helpers

function openAnimationPane() {
  showAnimationPane.value = true;
}

function closeAnimationPane() {
  showAnimationPane.value = false;
}

function backToProperties() {
  showAnimationPane.value = false;
}

function updateElementAnimation(animation: ElementAnimation) {
  const elementId = props.selectedElement?.id || (props.markdownElement ? `markdown-${props.markdownElement.startLine}` : 'unknown');
  elementAnimations.value.set(elementId, animation);
  
  // Apply animation to the element
  if (props.selectedElement) {
    applyAnimationToElement(props.selectedElement, animation);
  }
  
  // Emit to parent for preview pane
  emit('update-animation', animation);
}

function applyAnimationToElement(element: HTMLElement, animation: ElementAnimation) {
  if (!animation.enabled) {
    element.style.animation = '';
    return;
  }
  
  const repeatValue = animation.repeat 
    ? animation.repeatCount === 'infinite' 
      ? 'infinite' 
      : animation.repeatCount
    : '1';
  
  element.style.animation = `${animation.type} ${animation.duration}ms ${animation.easing} ${animation.delay}ms ${repeatValue}`;
  
  // Store animation data for later use
  element.dataset.animation = JSON.stringify(animation);
}

// Watch selected element and extract styles
watch(() => props.selectedElement, (element) => {
  if (element) {
    const computedStyle = window.getComputedStyle(element);
    elementStyles.value = {
      fontSize: computedStyle.fontSize,
      textAlign: computedStyle.textAlign || 'left',
      fontWeight: computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 600 ? 'bold' : 'normal',
      color: computedStyle.color
    };
    
    // Extract scale from transform if present
    const transform = computedStyle.transform;
    if (transform && transform !== 'none') {
      const match = transform.match(/scale\(([0-9.]+)\)/);
      if (match) {
        componentScale.value = parseFloat(match[1]);
      }
    } else {
      componentScale.value = 1.0;
    }
  }
}, { immediate: true });

function updateStyle(property: string, value: string) {
  elementStyles.value[property as keyof typeof elementStyles.value] = value;
  emit('update-element-style', property, value);
}

function applyPresetSize(className: string) {
  if (!className) return;
  
  const sizeMap: Record<string, string> = {
    'text-xs': '12px',
    'text-sm': '14px',
    'text-base': '16px',
    'text-lg': '18px',
    'text-xl': '20px',
    'text-2xl': '24px',
    'text-3xl': '30px',
    'text-4xl': '36px',
    'text-5xl': '48px',
    'text-6xl': '60px'
  };
  
  const size = sizeMap[className];
  if (size) {
    updateStyle('fontSize', size);
  }
}

function updateComponentScale(scale: number) {
  componentScale.value = scale;
  emit('update-component-scale', scale);
}

function clearSelection() {
  emit('clear-selection');
}

function clearMarkdownElement() {
  emit('clear-markdown-element');
}

function updateHeadingLevel(level: number) {
  if (!props.markdownElement || props.markdownElement.type !== 'heading') return;
  
  const updatedElement = {
    ...props.markdownElement,
    level,
    content: '#'.repeat(level) + ' ' + props.markdownElement.content.replace(/^#+\s+/, '')
  };
  emit('update-markdown-element', updatedElement);
}

function updateImageUrl(url: string) {
  if (!props.markdownElement || props.markdownElement.type !== 'image') return;
  
  const updatedElement = {
    ...props.markdownElement,
    content: `![${props.markdownElement.attributes?.alt || ''}](${url})`,
    attributes: { ...props.markdownElement.attributes, url }
  };
  emit('update-markdown-element', updatedElement);
}

function updateImageAlt(alt: string) {
  if (!props.markdownElement || props.markdownElement.type !== 'image') return;
  
  const updatedElement = {
    ...props.markdownElement,
    content: `![${alt}](${props.markdownElement.attributes?.url || ''})`,
    attributes: { ...props.markdownElement.attributes, alt }
  };
  emit('update-markdown-element', updatedElement);
}

// Image-specific functions
function handleImageUpload() {
  // Create file input for image upload
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      // In a real implementation, you'd upload to a server and get a URL
      // For now, we'll use a placeholder
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        updateImageUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function handleImageReplace() {
  handleImageUpload(); // Same as upload for now
}

function handleImageFromUrl() {
  const url = prompt('Enter image URL:');
  if (url) {
    updateImageUrl(url);
  }
}

function updateImagePosition(position: string) {
  imagePosition.value = position;
  // Apply position via CSS classes
  if (!props.markdownElement || props.markdownElement.type !== 'image') return;
  
  const alt = props.markdownElement.attributes?.alt || '';
  const url = props.markdownElement.attributes?.url || '';
  
  let newContent = `![${alt}](${url})`;
  if (position !== 'inline') {
    const positionClass = `float-${position}`;
    newContent = `<img src="${url}" alt="${alt}" class="${positionClass}" />`;
  }
  
  const updatedElement = {
    ...props.markdownElement,
    content: newContent,
    attributes: { ...props.markdownElement.attributes, position }
  };
  emit('update-markdown-element', updatedElement);
}

function updateImageQuality(quality: number) {
  imageQuality.value = quality;
  // Store quality for future use (e.g., when exporting)
  if (!props.markdownElement || props.markdownElement.type !== 'image') return;
  
  const updatedElement = {
    ...props.markdownElement,
    attributes: { ...props.markdownElement.attributes, quality }
  };
  emit('update-markdown-element', updatedElement);
}

function updateImageUnit(unit: string) {
  imageSize.value.unit = unit;
  // Re-apply size with new unit
  if (imageSize.value.width !== 'auto') {
    updateImageSize('width', imageSize.value.width);
  }
  if (imageSize.value.height !== 'auto') {
    updateImageSize('height', imageSize.value.height);
  }
}

function toggleAspectRatio() {
  aspectRatioLocked.value = !aspectRatioLocked.value;
  
  // If aspect ratio is locked and we have both dimensions, calculate the ratio
  if (aspectRatioLocked.value && imageSize.value.width !== 'auto' && imageSize.value.height !== 'auto') {
    const width = parseFloat(imageSize.value.width);
    const height = parseFloat(imageSize.value.height);
    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
      // Store the ratio for future use
      imageSize.value.ratio = width / height;
    }
  }
}

function applyImagePreset(preset: { name: string; width: number; height: number }) {
  imageSize.value.width = preset.width.toString();
  imageSize.value.height = preset.height.toString();
  
  // Apply the size
  if (!props.markdownElement || props.markdownElement.type !== 'image') return;
  
  const alt = props.markdownElement.attributes?.alt || '';
  const url = props.markdownElement.attributes?.url || '';
  
  const newContent = `<img src="${url}" alt="${alt}" width="${preset.width}" height="${preset.height}" />`;
  
  const updatedElement = {
    ...props.markdownElement,
    content: newContent,
    attributes: { ...props.markdownElement.attributes, width: preset.width, height: preset.height }
  };
  emit('update-markdown-element', updatedElement);
}

function updateImageShape(shape: string) {
  imageShape.value = shape;
  // Apply shape via CSS classes in the markdown
  if (!props.markdownElement || props.markdownElement.type !== 'image') return;
  
  const alt = props.markdownElement.attributes?.alt || '';
  const url = props.markdownElement.attributes?.url || '';
  
  let newContent = `![${alt}](${url})`;
  if (shape !== 'none') {
    newContent = `<img src="${url}" alt="${alt}" class="shape-${shape}" />`;
  }
  
  const updatedElement = {
    ...props.markdownElement,
    content: newContent,
    attributes: { ...props.markdownElement.attributes, shape }
  };
  emit('update-markdown-element', updatedElement);
}

function updateImageSize(dimension: 'width' | 'height', value: string) {
  if (!props.markdownElement || props.markdownElement.type !== 'image') return;
  
  // Validate input
  if (value && value !== 'auto') {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      console.warn('Invalid image size value:', value);
      return;
    }
  }
  
  imageSize.value[dimension] = value;
  
  // Apply aspect ratio logic if locked
  if (aspectRatioLocked.value && imageSize.value.ratio && value !== 'auto') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (dimension === 'width' && imageSize.value.height !== 'auto') {
        imageSize.value.height = (numValue / imageSize.value.ratio).toFixed(0);
      } else if (dimension === 'height' && imageSize.value.width !== 'auto') {
        imageSize.value.width = (numValue * imageSize.value.ratio).toFixed(0);
      }
    }
  }
  
  // Apply size via style attribute
  const alt = props.markdownElement.attributes?.alt || '';
  const url = props.markdownElement.attributes?.url || '';
  const width = imageSize.value.width !== 'auto' ? imageSize.value.width : '';
  const height = imageSize.value.height !== 'auto' ? imageSize.value.height : '';
  
  let styleAttr = '';
  if (width) styleAttr += `width: ${width}${imageSize.value.unit};`;
  if (height) styleAttr += `height: ${height}${imageSize.value.unit};`;
  
  let newContent = `![${alt}](${url})`;
  if (styleAttr) {
    newContent = `<img src="${url}" alt="${alt}" style="${styleAttr}" />`;
  }
  
  const updatedElement = {
    ...props.markdownElement,
    content: newContent,
    attributes: { ...props.markdownElement.attributes, width: imageSize.value.width, height: imageSize.value.height }
  };
  emit('update-markdown-element', updatedElement);
}

// Table-specific functions
function addTableRow(position: 'above' | 'below') {
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const lines = props.markdownElement.content.split('\n');
  const cursorLine = props.markdownElement.startLine;
  
  // Find the target line to insert after/before
  let targetLineIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (cursorLine + i <= props.markdownElement.endLine) {
      targetLineIndex = i;
    }
  }
  
  // Count columns in the first data row (skip header)
  const firstDataRow = lines.find(line => line.includes('|') && !line.includes('---'));
  const columnCount = firstDataRow ? firstDataRow.split('|').length - 2 : 3; // -2 for empty start/end
  
  // Create new row with empty cells
  const newRow = '|' + ' | '.repeat(columnCount) + '|';
  
  // Insert the row
  const insertIndex = position === 'above' ? targetLineIndex : targetLineIndex + 1;
  lines.splice(insertIndex, 0, newRow);
  
  const updatedElement = {
    ...props.markdownElement,
    content: lines.join('\n'),
    endLine: props.markdownElement.endLine + 1
  };
  emit('update-markdown-element', updatedElement);
}

function addTableColumn(position: 'left' | 'right') {
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const lines = props.markdownElement.content.split('\n');
  
  // Add column to each row
  const updatedLines = lines.map(line => {
    if (line.includes('|')) {
      const cells = line.split('|');
      if (position === 'left') {
        // Insert after first cell (or at start if header)
        cells.splice(1, 0, '  ');
      } else {
        // Insert before last cell
        cells.splice(cells.length - 1, 0, '  ');
      }
      return cells.join('|');
    }
    return line;
  });
  
  const updatedElement = {
    ...props.markdownElement,
    content: updatedLines.join('\n')
  };
  emit('update-markdown-element', updatedElement);
}

function removeTableRow() {
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const lines = props.markdownElement.content.split('\n');
  
  // Remove last data row (keep header and separator)
  if (lines.length > 2) {
    lines.splice(-1, 1);
  }
  
  const updatedElement = {
    ...props.markdownElement,
    content: lines.join('\n'),
    endLine: props.markdownElement.endLine - 1
  };
  emit('update-markdown-element', updatedElement);
}

function removeTableColumn() {
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const lines = props.markdownElement.content.split('\n');
  
  // Remove last column from each row
  const updatedLines = lines.map(line => {
    if (line.includes('|')) {
      const cells = line.split('|');
      if (cells.length > 2) {
        cells.splice(cells.length - 2, 1); // Remove second-to-last cell
      }
      return cells.join('|');
    }
    return line;
  });
  
  const updatedElement = {
    ...props.markdownElement,
    content: updatedLines.join('\n')
  };
  emit('update-markdown-element', updatedElement);
}

function updateTableStyle(property: string, value: boolean) {
  tableStyle.value[property as keyof typeof tableStyle.value] = value;
  
  // Apply style via CSS classes
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const classes = [];
  if (tableStyle.value.striped) classes.push('table-striped');
  if (tableStyle.value.bordered) classes.push('table-bordered');
  if (tableStyle.value.compact) classes.push('table-compact');
  if (tableStyle.value.hoverable) classes.push('table-hover');
  
  const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
  const updatedElement = {
    ...props.markdownElement,
    content: props.markdownElement.content.replace(/^<table/, `<table${classAttr}`),
    attributes: { ...props.markdownElement.attributes, ...tableStyle.value }
  };
  emit('update-markdown-element', updatedElement);
}

// Advanced table functions
function getTableInfo() {
  if (!props.markdownElement || props.markdownElement.type !== 'table') {
    return { rows: 0, columns: 0 };
  }
  
  const lines = props.markdownElement.content.split('\n');
  const tableLines = lines.filter(line => line.includes('|'));
  
  let rows = tableLines.length;
  let columns = 0;
  
  if (tableLines.length > 0) {
    // Count columns from the first row (excluding empty start/end)
    columns = tableLines[0].split('|').length - 2;
  }
  
  return { rows, columns };
}

function sortTableColumn() {
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const column = prompt('Enter column number to sort (1-based):');
  if (!column) return;
  
  const columnIndex = parseInt(column) - 1;
  if (isNaN(columnIndex) || columnIndex < 0) {
    console.warn('Invalid column number:', column);
    return;
  }
  
  const lines = props.markdownElement.content.split('\n');
  if (lines.length < 3) {
    console.warn('Table too small to sort');
    return;
  }
  
  // Separate header, separator, and data rows
  const header = lines[0];
  const separator = lines[1];
  const dataRows = lines.slice(2);
  
  // Check if column exists
  const maxColumns = header.split('|').length - 2;
  if (columnIndex >= maxColumns) {
    console.warn('Column index out of range:', columnIndex, 'max:', maxColumns);
    return;
  }
  
  // Sort data rows by the specified column
  const sortedRows = dataRows.sort((a, b) => {
    const aCells = a.split('|');
    const bCells = b.split('|');
    const aValue = aCells[columnIndex + 1]?.trim() || '';
    const bValue = bCells[columnIndex + 1]?.trim() || '';
    return aValue.localeCompare(bValue);
  });
  
  const newContent = [header, separator, ...sortedRows].join('\n');
  
  const updatedElement = {
    ...props.markdownElement,
    content: newContent
  };
  emit('update-markdown-element', updatedElement);
}

function transposeTable() {
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const lines = props.markdownElement.content.split('\n');
  if (lines.length < 2) {
    console.warn('Table too small to transpose');
    return;
  }
  
  const rows = lines.map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
  
  // Check for empty rows
  if (rows.some(row => row.length === 0)) {
    console.warn('Table has empty rows, cannot transpose');
    return;
  }
  
  // Transpose the matrix
  const transposed = rows[0].map((_, colIndex) => 
    rows.map(row => row[colIndex] || '')
  );
  
  // Build new table
  const newLines = [
    '|' + transposed[0].join(' | ') + '|',
    '|' + transposed[0].map(() => '---').join(' | ') + '|',
    ...transposed.slice(1).map(row => '|' + row.join(' | ') + '|')
  ];
  
  const updatedElement = {
    ...props.markdownElement,
    content: newLines.join('\n')
  };
  emit('update-markdown-element', updatedElement);
}

function addTableHeader() {
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const lines = props.markdownElement.content.split('\n');
  const columns = lines[0].split('|').length - 2;
  
  const headerRow = '|' + Array(columns).fill('Header').join(' | ') + '|';
  const separatorRow = '|' + Array(columns).fill('---').join(' | ') + '|';
  
  lines.unshift(headerRow, separatorRow);
  
  const updatedElement = {
    ...props.markdownElement,
    content: lines.join('\n'),
    startLine: props.markdownElement.startLine - 2,
    endLine: props.markdownElement.endLine + 2
  };
  emit('update-markdown-element', updatedElement);
}

function addTableFooter() {
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const lines = props.markdownElement.content.split('\n');
  const columns = lines[0].split('|').length - 2;
  
  const footerRow = '|' + Array(columns).fill('Footer').join(' | ') + '|';
  lines.push(footerRow);
  
  const updatedElement = {
    ...props.markdownElement,
    content: lines.join('\n'),
    endLine: props.markdownElement.endLine + 1
  };
  emit('update-markdown-element', updatedElement);
}

function updateTableAlignment(alignment: string) {
  tableAlignment.value = alignment;
  
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const alignmentClass = `text-align-${alignment}`;
  const updatedElement = {
    ...props.markdownElement,
    content: `<table class="${alignmentClass}">${props.markdownElement.content}</table>`,
    attributes: { ...props.markdownElement.attributes, alignment }
  };
  emit('update-markdown-element', updatedElement);
}

function updateTableWidth(width: string) {
  tableWidth.value = width;
  
  if (!props.markdownElement || props.markdownElement.type !== 'table') return;
  
  const widthAttr = `width: ${width}${tableWidthUnit.value}`;
  const updatedElement = {
    ...props.markdownElement,
    content: `<table style="${widthAttr}">${props.markdownElement.content}</table>`,
    attributes: { ...props.markdownElement.attributes, width, unit: tableWidthUnit.value }
  };
  emit('update-markdown-element', updatedElement);
}

function updateTableWidthUnit(unit: string) {
  tableWidthUnit.value = unit;
  updateTableWidth(tableWidth.value);
}

// Text-specific functions
function getTextContent(): string {
  if (!props.markdownElement) return '';
  
  if (props.markdownElement.type === 'heading') {
    return props.markdownElement.content.replace(/^#+\s+/, '');
  }
  return props.markdownElement.content;
}

function updateTextContent(content: string) {
  if (!props.markdownElement) return;
  
  let newContent = content;
  if (props.markdownElement.type === 'heading' && props.markdownElement.level) {
    newContent = '#'.repeat(props.markdownElement.level) + ' ' + content;
  }
  
  const updatedElement = {
    ...props.markdownElement,
    content: newContent
  };
  emit('update-markdown-element', updatedElement);
}

function toggleTextFormatting(format: string) {
  textFormatting.value[format as keyof typeof textFormatting.value] = !textFormatting.value[format as keyof typeof textFormatting.value];
  
  const currentContent = getTextContent();
  let formattedContent = currentContent;
  
  // Apply formatting
  if (textFormatting.value.bold) formattedContent = `**${formattedContent}**`;
  if (textFormatting.value.italic) formattedContent = `*${formattedContent}*`;
  if (textFormatting.value.underline) formattedContent = `<u>${formattedContent}</u>`;
  if (textFormatting.value.strikethrough) formattedContent = `~~${formattedContent}~~`;
  
  updateTextContent(formattedContent);
}

// Apply font size class (UnoCSS/Tailwind)
function applyFontSizeClass(size: string) {
  if (!props.markdownElement) return;
  
  const className = `text-${size}`;
  const content = getTextContent();
  
  // Wrap content with span that has the class
  let newContent = `<span class="${className}">${content}</span>`;
  
  // If it's a heading, preserve the heading syntax
  if (props.markdownElement.type === 'heading' && props.markdownElement.level) {
    newContent = '#'.repeat(props.markdownElement.level) + ' ' + newContent;
  }
  
  const updatedElement = {
    ...props.markdownElement,
    content: newContent
  };
  emit('update-markdown-element', updatedElement);
}
</script>
