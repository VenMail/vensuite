<script setup lang="ts">
import {
  BoldIcon,
  ClipboardPasteIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  FileIcon,
  FolderIcon,
  HelpCircleIcon,
  InfoIcon,
  ItalicIcon,
  MessageCircleIcon,
  PrinterIcon,
  RedoIcon,
  RefreshCcwIcon,
  SaveIcon,
  ScissorsIcon,
  SpellCheckIcon,
  StrikethroughIcon,
  TrashIcon,
  UnderlineIcon,
  UndoIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-vue-next'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar'
</script>

<template>
  <Menubar>
    <!-- File Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.file')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <FileIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.new')}}
        </MenubarItem>
        <MenubarItem>
          <FolderIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.open')}}
        </MenubarItem>
        <MenubarItem>
          <SaveIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.save')}}
        </MenubarItem>
        <MenubarItem>
          <DownloadIcon class="h-4 w-4 mr-2" />
          Export As...
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          <PrinterIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.print')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Edit Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.heading.edit')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <UndoIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.undo')}}
        </MenubarItem>
        <MenubarItem>
          <RedoIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.redo')}}
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          <ScissorsIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.cut')}}
        </MenubarItem>
        <MenubarItem>
          <CopyIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.copy')}}
        </MenubarItem>
        <MenubarItem>
          <ClipboardPasteIcon class="h-4 w-4 mr-2" />
          Paste
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          <TrashIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.delete')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- View Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.view')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <ZoomInIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.zoom_in')}}
        </MenubarItem>
        <MenubarItem>
          <ZoomOutIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.zoom_out')}}
        </MenubarItem>
        <MenubarItem>
          <RefreshCcwIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.reset_zoom')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Format Menu -->
    <MenubarMenu>
      <MenubarTrigger>Format</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <BoldIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.bold')}}
        </MenubarItem>
        <MenubarItem>
          <ItalicIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.italic')}}
        </MenubarItem>
        <MenubarItem>
          <UnderlineIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.underline')}}
        </MenubarItem>
        <MenubarItem>
          <StrikethroughIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.strikethrough')}}
        </MenubarItem>
        <!-- Add more formatting options here -->
      </MenubarContent>
    </MenubarMenu>

    <!-- Tools Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.tools')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <SpellCheckIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.spell_check')}}
        </MenubarItem>
        <MenubarItem>
          <EllipsisIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.word_count')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Help Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.help')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <HelpCircleIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.help_center')}}
        </MenubarItem>
        <MenubarItem>
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          Feedback
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          <InfoIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.about')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
</template>
