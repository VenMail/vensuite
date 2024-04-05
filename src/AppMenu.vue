<template>
    <Menubar>
      <!-- File Management Menu -->
      <MenubarMenu>
        <MenubarTrigger>Files</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <FilePlusIcon class="h-4 w-4 mr-2" />
            Create Spreadsheet
          </MenubarItem>
          <MenubarItem>
            <FilePlus2Icon class="h-4 w-4 mr-2" />
            Create Document
          </MenubarItem>
          <MenubarItem>
            <FolderPlusIcon class="h-4 w-4 mr-2" />
            New Folder
          </MenubarItem>
          <MenubarItem>
            <UploadIcon class="h-4 w-4 mr-2" />
            Upload Files
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
  
      <!-- Actions Menu -->
      <MenubarMenu>
        <MenubarTrigger>Actions</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <EyeIcon class="h-4 w-4 mr-2" />
            View
          </MenubarItem>
          <MenubarItem>
            <ShareIcon class="h-4 w-4 mr-2" />
            Share
          </MenubarItem>
          <MenubarItem>
            <Trash2Icon class="h-4 w-4 mr-2" />
            Delete
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  </template>
  
  <script setup lang="ts">
  import {
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarShortcut,
	MenubarTrigger,
} from '@/components/ui/menubar'

  import { 
    FolderPlusIcon,
    FilePlusIcon,
    FilePlus2Icon,
    UploadIcon,
    EyeIcon,
    ShareIcon,
    Trash2Icon
  } from 'lucide-vue-next';
  
  </script>
  