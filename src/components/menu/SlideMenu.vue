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
      <MenubarTrigger>File</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <FileIcon class="h-4 w-4 mr-2" />
          New
        </MenubarItem>
        <MenubarItem>
          <FolderIcon class="h-4 w-4 mr-2" />
          Open
        </MenubarItem>
        <MenubarItem>
          <SaveIcon class="h-4 w-4 mr-2" />
          Save
        </MenubarItem>
        <MenubarItem>
          <DownloadIcon class="h-4 w-4 mr-2" />
          Export As...
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          <PrinterIcon class="h-4 w-4 mr-2" />
          Print
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Edit Menu -->
    <MenubarMenu>
      <MenubarTrigger>Edit</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <UndoIcon class="h-4 w-4 mr-2" />
          Undo
        </MenubarItem>
        <MenubarItem>
          <RedoIcon class="h-4 w-4 mr-2" />
          Redo
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          <ScissorsIcon class="h-4 w-4 mr-2" />
          Cut
        </MenubarItem>
        <MenubarItem>
          <CopyIcon class="h-4 w-4 mr-2" />
          Copy
        </MenubarItem>
        <MenubarItem>
          <ClipboardPasteIcon class="h-4 w-4 mr-2" />
          Paste
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          <TrashIcon class="h-4 w-4 mr-2" />
          Delete
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- View Menu -->
    <MenubarMenu>
      <MenubarTrigger>View</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <ZoomInIcon class="h-4 w-4 mr-2" />
          Zoom In
        </MenubarItem>
        <MenubarItem>
          <ZoomOutIcon class="h-4 w-4 mr-2" />
          Zoom Out
        </MenubarItem>
        <MenubarItem>
          <RefreshCcwIcon class="h-4 w-4 mr-2" />
          Reset Zoom
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Format Menu -->
    <MenubarMenu>
      <MenubarTrigger>Format</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <BoldIcon class="h-4 w-4 mr-2" />
          Bold
        </MenubarItem>
        <MenubarItem>
          <ItalicIcon class="h-4 w-4 mr-2" />
          Italic
        </MenubarItem>
        <MenubarItem>
          <UnderlineIcon class="h-4 w-4 mr-2" />
          Underline
        </MenubarItem>
        <MenubarItem>
          <StrikethroughIcon class="h-4 w-4 mr-2" />
          Strikethrough
        </MenubarItem>
        <!-- Add more formatting options here -->
      </MenubarContent>
    </MenubarMenu>

    <!-- Tools Menu -->
    <MenubarMenu>
      <MenubarTrigger>Tools</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <SpellCheckIcon class="h-4 w-4 mr-2" />
          Spell Check
        </MenubarItem>
        <MenubarItem>
          <EllipsisIcon class="h-4 w-4 mr-2" />
          Word Count
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Help Menu -->
    <MenubarMenu>
      <MenubarTrigger>Help</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <HelpCircleIcon class="h-4 w-4 mr-2" />
          Help Center
        </MenubarItem>
        <MenubarItem>
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          Feedback
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          <InfoIcon class="h-4 w-4 mr-2" />
          About
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
</template>
