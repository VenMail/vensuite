<template>
  <div class="flex items-center gap-2">
    <!-- File Menu Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" class="h-8 px-3">
          <FileText class="h-4 w-4 mr-2" />
          {{$t('Commons.text.file')}}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <DropdownMenuItem @click="handleNewDeck">
          <Plus class="h-4 w-4 mr-2" />
          {{$t('Commons.text.new_deck')}}
        </DropdownMenuItem>
        <DropdownMenuItem @click="handleImport">
          <Upload class="h-4 w-4 mr-2" />
          {{$t('Commons.text.import_powerpoint')}}
        </DropdownMenuItem>
        <DropdownMenuItem @click="handleImportHtml">
          <Code class="h-4 w-4 mr-2" />
          {{$t('Commons.button.import_html')}}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="handleExport('pdf')">
          <Download class="h-4 w-4 mr-2" />
          {{$t('Components.Slides.text.export_as_pdf')}}
        </DropdownMenuItem>
        <DropdownMenuItem @click="handleExport('pptx')">
          <FileText class="h-4 w-4 mr-2" />
          {{$t('Components.Slides.text.export_as_powerpoint')}}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="handlePrint">
          <Printer class="h-4 w-4 mr-2" />
          {{$t('Commons.text.print')}}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- Edit Menu Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" class="h-8 px-3">
          <Edit class="h-4 w-4 mr-2" />
          {{$t('Commons.heading.edit')}}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <DropdownMenuItem @click="handleUndo" :disabled="!canUndo">
          <RotateCcw class="h-4 w-4 mr-2" />
          {{$t('Commons.text.undo_2')}}
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">Ctrl+Z</KeyboardShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem @click="handleRedo" :disabled="!canRedo">
          <RotateCw class="h-4 w-4 mr-2" />
          {{$t('Commons.text.redo_2')}}
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">Ctrl+Y</KeyboardShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="handleDuplicateSlide">
          <Copy class="h-4 w-4 mr-2" />
          {{$t('Commons.text.duplicate_slide')}}
        </DropdownMenuItem>
        <DropdownMenuItem @click="handleDeleteSlide" :disabled="totalSlides <= 1">
          <Trash2 class="h-4 w-4 mr-2" />
          {{$t('Commons.text.delete_slide')}}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- View Menu Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" class="h-8 px-3">
          <Eye class="h-4 w-4 mr-2" />
          {{$t('Commons.text.view')}}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <DropdownMenuItem @click="toggleFullscreen">
          <Maximize class="h-4 w-4 mr-2" />
          Fullscreen
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">F11</KeyboardShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem @click="toggleRuler">
          <Ruler class="h-4 w-4 mr-2" />
          {{ showRuler ? $t('Commons.text.hide') : $t('Commons.text.show') }} Ruler
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="zoomIn" :disabled="zoom >= 2">
          <ZoomIn class="h-4 w-4 mr-2" />
          {{$t('Commons.text.zoom_in')}}
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">Ctrl+</KeyboardShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem @click="zoomOut" :disabled="zoom <= 0.5">
          <ZoomOut class="h-4 w-4 mr-2" />
          {{$t('Commons.text.zoom_out')}}
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">Ctrl-</KeyboardShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem @click="resetZoom">
          <Monitor class="h-4 w-4 mr-2" />
          {{$t('Commons.text.reset_zoom')}}
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">Ctrl+0</KeyboardShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- Slides Menu Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" class="h-8 px-3">
          <Layout class="h-4 w-4 mr-2" />
          {{$t('Commons.heading.slides')}}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <DropdownMenuItem @click="handleAddSlide">
          <Plus class="h-4 w-4 mr-2" />
          {{$t('Commons.text.new_slide')}}
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">Ctrl+M</KeyboardShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem @click="showInfographics">
          <BarChart3 class="h-4 w-4 mr-2" />
          {{$t('Commons.text.add_infographic')}}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="toggleThumbnails">
          <LayoutGrid class="h-4 w-4 mr-2" />
          {{ showThumbnails ? $t('Commons.text.hide') : $t('Commons.text.show') }} Thumbnails
        </DropdownMenuItem>
        <DropdownMenuItem @click="toggleProperties">
          <Settings class="h-4 w-4 mr-2" />
          {{ showProperties ? $t('Commons.text.hide') : $t('Commons.text.show') }} {{$t('Commons.heading.properties')}}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- Presentation Menu Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" class="h-8 px-3">
          <Play class="h-4 w-4 mr-2" />
          {{$t('Commons.button.presentation')}}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <DropdownMenuItem @click="startPresentation" class="text-green-600 dark:text-green-400">
          <Play class="h-4 w-4 mr-2" />
          {{$t('Commons.text.start_presentation')}}
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">F5</KeyboardShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem @click="startPresenterMode" class="text-blue-600 dark:text-blue-400">
          <MonitorSpeaker class="h-4 w-4 mr-2" />
          {{$t('Commons.text.presenter_mode')}}
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">Ctrl+F5</KeyboardShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="startOverview">
          <LayoutGrid class="h-4 w-4 mr-2" />
          {{$t('Commons.heading.slide_overview')}}
          <KeyboardShortcut class="ml-auto text-xs text-gray-500">O</KeyboardShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem @click="exportForPresentation">
          <ExternalLink class="h-4 w-4 mr-2" />
          {{$t('Components.Slides.text.export_for_web')}}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- Tools Menu Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" class="h-8 px-3">
          <Wrench class="h-4 w-4 mr-2" />
          {{$t('Commons.text.tools')}}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <DropdownMenuItem @click="toggleSpellCheck">
          <CheckCircle class="h-4 w-4 mr-2" />
          {{ spellCheckEnabled ? $t('Commons.text.disable') : $t('Commons.text.enable') }} {{$t('Commons.text.spell_check')}}
        </DropdownMenuItem>
        <DropdownMenuItem @click="showEmojiPicker">
          <Smile class="h-4 w-4 mr-2" />
          {{$t('Commons.text.emoji_picker')}}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="showKeyboardShortcuts">
          <Keyboard class="h-4 w-4 mr-2" />
          {{$t('Commons.text.keyboard_shortcuts')}}
        </DropdownMenuItem>
        <DropdownMenuItem @click="showHelp">
          <HelpCircle class="h-4 w-4 mr-2" />
          {{$t('Components.Slides.text.help_documentation')}}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Plus,
  Upload,
  Code,
  Download,
  Printer,
  Edit,
  RotateCcw,
  RotateCw,
  Copy,
  Trash2,
  Eye,
  Maximize,
  Ruler,
  ZoomIn,
  ZoomOut,
  Monitor,
  Layout,
  BarChart3,
  LayoutGrid,
  Settings,
  Play,
  MonitorSpeaker,
  ExternalLink,
  Wrench,
  CheckCircle,
  Smile,
  Keyboard,
  HelpCircle,
} from 'lucide-vue-next';

// Component for keyboard shortcut display
const KeyboardShortcut = {
  template: '<span class="text-xs text-gray-500 dark:text-gray-400"><slot /></span>'
};

interface Props {
  canUndo?: boolean;
  canRedo?: boolean;
  totalSlides?: number;
  showRuler?: boolean;
  showThumbnails?: boolean;
  showProperties?: boolean;
  zoom?: number;
  spellCheckEnabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  canUndo: false,
  canRedo: false,
  totalSlides: 1,
  showRuler: true,
  showThumbnails: true,
  showProperties: true,
  zoom: 1,
  spellCheckEnabled: true,
});

const emit = defineEmits<{
  (e: 'new-deck'): void;
  (e: 'import-powerpoint'): void;
  (e: 'import-html'): void;
  (e: 'export', format: 'pdf' | 'pptx'): void;
  (e: 'print'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'duplicate-slide'): void;
  (e: 'delete-slide'): void;
  (e: 'toggle-fullscreen'): void;
  (e: 'toggle-ruler'): void;
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'reset-zoom'): void;
  (e: 'add-slide'): void;
  (e: 'show-infographics'): void;
  (e: 'toggle-thumbnails'): void;
  (e: 'toggle-properties'): void;
  (e: 'start-presentation'): void;
  (e: 'start-presenter-mode'): void;
  (e: 'start-overview'): void;
  (e: 'export-for-presentation'): void;
  (e: 'toggle-spell-check'): void;
  (e: 'show-emoji-picker'): void;
  (e: 'show-keyboard-shortcuts'): void;
  (e: 'show-help'): void;
}>();

// File menu handlers
function handleNewDeck() {
  emit('new-deck');
}

function handleImport() {
  emit('import-powerpoint');
}

function handleImportHtml() {
  emit('import-html');
}

function handleExport(format: 'pdf' | 'pptx') {
  emit('export', format);
}

function handlePrint() {
  emit('print');
}

// Edit menu handlers
function handleUndo() {
  emit('undo');
}

function handleRedo() {
  emit('redo');
}

function handleDuplicateSlide() {
  emit('duplicate-slide');
}

function handleDeleteSlide() {
  emit('delete-slide');
}

// View menu handlers
function toggleFullscreen() {
  emit('toggle-fullscreen');
}

function toggleRuler() {
  emit('toggle-ruler');
}

function zoomIn() {
  emit('zoom-in');
}

function zoomOut() {
  emit('zoom-out');
}

function resetZoom() {
  emit('reset-zoom');
}

// Slides menu handlers
function handleAddSlide() {
  emit('add-slide');
}

function showInfographics() {
  emit('show-infographics');
}

function toggleThumbnails() {
  emit('toggle-thumbnails');
}

function toggleProperties() {
  emit('toggle-properties');
}

// Presentation menu handlers
function startPresentation() {
  emit('start-presentation');
}

function startPresenterMode() {
  emit('start-presenter-mode');
}

function startOverview() {
  emit('start-overview');
}

function exportForPresentation() {
  emit('export-for-presentation');
}

// Tools menu handlers
function toggleSpellCheck() {
  emit('toggle-spell-check');
}

function showEmojiPicker() {
  emit('show-emoji-picker');
}

function showKeyboardShortcuts() {
  emit('show-keyboard-shortcuts');
}

function showHelp() {
  emit('show-help');
}
</script>
