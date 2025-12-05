<script setup lang="ts">
import {
  EyeIcon,
  FilePlus2Icon,
  FilePlusIcon,
  FolderPlusIcon,
  ShareIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-vue-next'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '@/components/ui/menubar'
</script>

<template>
  <Menubar>
    <!-- File Management Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.files')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <FilePlusIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.create_spreadsheet')}}
        </MenubarItem>
        <MenubarItem>
          <FilePlus2Icon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.create_document')}}
        </MenubarItem>
        <MenubarItem>
          <FolderPlusIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.new_folder')}}
        </MenubarItem>
        <MenubarItem>
          <UploadIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.upload_files')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Actions Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.actions')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <EyeIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.view')}}
        </MenubarItem>
        <MenubarItem>
          <ShareIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.share')}}
        </MenubarItem>
        <MenubarItem>
          <Trash2Icon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.delete')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
</template>
