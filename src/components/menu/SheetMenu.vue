<template>
  <Menubar class="border-none ml-0 pl-0">
    <!-- File Menu -->
    <MenubarMenu>
      <MenubarTrigger>File</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleNew">
          <FileIcon class="h-4 w-4 mr-2" />
          New
        </MenubarItem>
        <MenubarItem @click="handleLoadDialog">
          <FolderIcon class="h-4 w-4 mr-2" />
          Open
        </MenubarItem>
        <MenubarItem @click="handleSave">
          <SaveIcon class="h-4 w-4 mr-2" />
          Save
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <DownloadIcon class="h-4 w-4 mr-2" />
            Export As...
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem @click="exportAs('csv')">CSV</MenubarItem>
            <MenubarItem @click="exportAs('xlsx')">XLSX</MenubarItem>
            <MenubarItem @click="exportAs('pdf')">PDF</MenubarItem>
            <MenubarItem @click="exportAs('html')">HTML</MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
        <MenubarSeparator />
        <MenubarItem>
          <PrinterIcon class="h-4 w-4 mr-2" />
          Print
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <DownloadIcon class="h-4 w-4 mr-2" />
            Recent Files...
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem v-for="file in recentFiles" :key="file.id" @click="handleLoad(file.id)">{{ file.name }}
            </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
      </MenubarContent>
    </MenubarMenu>

    <!-- Edit Menu -->
    <MenubarMenu>
      <MenubarTrigger>Edit</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="undo">
          <UndoIcon class="h-4 w-4 mr-2" />
          Undo
        </MenubarItem>
        <MenubarItem @click="redo">
          <RedoIcon class="h-4 w-4 mr-2" />
          Redo
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="cut">
          <ScissorsIcon class="h-4 w-4 mr-2" />
          Cut
        </MenubarItem>
        <MenubarItem @click="copy">
          <CopyIcon class="h-4 w-4 mr-2" />
          Copy
        </MenubarItem>
        <MenubarItem @click="paste">
          <ClipboardPasteIcon class="h-4 w-4 mr-2" />
          Paste
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="deleteSelected">
          <TrashIcon class="h-4 w-4 mr-2" />
          Delete
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- View Menu -->
    <MenubarMenu>
      <MenubarTrigger>View</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="zoomIn">
          <ZoomInIcon class="h-4 w-4 mr-2" />
          Zoom In
        </MenubarItem>
        <MenubarItem @click="zoomOut">
          <ZoomOutIcon class="h-4 w-4 mr-2" />
          Zoom Out
        </MenubarItem>
        <MenubarItem @click="resetZoom">
          <RefreshCcwIcon class="h-4 w-4 mr-2" />
          Reset Zoom
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Format Menu -->
    <MenubarMenu>
      <MenubarTrigger>Format</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="formatBold">
          <BoldIcon class="h-4 w-4 mr-2" />
          Bold
        </MenubarItem>
        <MenubarItem @click="formatItalic">
          <ItalicIcon class="h-4 w-4 mr-2" />
          Italic
        </MenubarItem>
        <MenubarItem @click="formatUnderline">
          <UnderlineIcon class="h-4 w-4 mr-2" />
          Underline
        </MenubarItem>
        <MenubarItem @click="formatStrikethrough">
          <StrikethroughIcon class="h-4 w-4 mr-2" />
          Strikethrough
        </MenubarItem>
        <!-- Add more formatting options here -->
      </MenubarContent>
    </MenubarMenu>

    <!-- Data Menu -->
    <MenubarMenu>
      <MenubarTrigger>Data</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="sort">
          <SortAscIcon class="h-4 w-4 mr-2" />
          Sort
        </MenubarItem>
        <MenubarItem @click="filter">
          <FilterIcon class="h-4 w-4 mr-2" />
          Filter
        </MenubarItem>
        <MenubarItem @click="group">
          <GroupIcon class="h-4 w-4 mr-2" />
          Group
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Tools Menu -->
    <MenubarMenu>
      <MenubarTrigger>Tools</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="spellCheck">
          <SpellCheckIcon class="h-4 w-4 mr-2" />
          Spell Check
        </MenubarItem>
        <MenubarItem @click="wordCount">
          <EllipsisIcon class="h-4 w-4 mr-2" />
          Word Count
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Help Menu -->
    <MenubarMenu>
      <MenubarTrigger>Help</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="openHelpCenter">
          <HelpCircleIcon class="h-4 w-4 mr-2" />
          Help Center
        </MenubarItem>
        <MenubarItem @click="sendFeedback">
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          Feedback
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="about">
          <InfoIcon class="h-4 w-4 mr-2" />
          About
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, onMounted } from 'vue';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar'
import {
  FileIcon,
  FolderIcon,
  SaveIcon,
  DownloadIcon,
  PrinterIcon,
  UndoIcon,
  RedoIcon,
  ScissorsIcon,
  CopyIcon,
  ClipboardPasteIcon,
  TrashIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RefreshCcwIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  SortAscIcon,
  FilterIcon,
  GroupIcon,
  SpellCheckIcon,
  MessageCircleIcon,
  HelpCircleIcon,
  EllipsisIcon,
  InfoIcon
} from 'lucide-vue-next';
import UniverSheet from './../../components/UniverSheet.vue';
import { FUniver } from "@univerjs/facade";
import { ICellData, IWorkbookData, Univer } from '@univerjs/core';
import { DEFAULT_WORKBOOK_DATA } from '@/assets/default-workbook-data';
import { useRouter } from 'vue-router';

interface File {
  id: string;
  name: string;
}

interface Props {
  univerRef: InstanceType<typeof UniverSheet> | null;
  coreRef: InstanceType<typeof Univer> | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['updateData']);
const recentFiles = ref<File[]>([]);
const storageKey = 'VENX_RecentFiles';
const router = useRouter();

let facadeAPI: FUniver | null = null;
let disposable = null;

onMounted(() => {
  if (props.coreRef) {
    facadeAPI = FUniver.newAPI(props.coreRef);
    disposable = facadeAPI.onBeforeCommandExecute((command) => {
      console.log(command);
      // custom preprocessing logic before the command is executed
    });
  }
  loadRecentFiles();
});

const saveRecentFiles = (files: File[]) => {
  localStorage.setItem(storageKey, JSON.stringify(files));
};

const loadRecentFiles = () => {
  const storedFiles = localStorage.getItem(storageKey);
  if (storedFiles) {
    recentFiles.value = JSON.parse(storedFiles);
  }
};

const updateRecentFiles = (file: File) => {
  const existingFileIndex = recentFiles.value.findIndex(f => f.id === file.id);
  if (existingFileIndex !== -1) {
    recentFiles.value.splice(existingFileIndex, 1);
  }
  recentFiles.value.unshift(file);
  if (recentFiles.value.length > 10) {
    recentFiles.value.pop();
  }
  saveRecentFiles(recentFiles.value);
};

const saveData = (data: IWorkbookData) => {
  //todo: we probably want to use our own custom ID
  //also show modal to set spreadsheet name
  localStorage.setItem(data.id, JSON.stringify(data));
  console.log('saved.. ', data.id);
  router.replace({ path: `/sheets/${data.id}` });
  updateRecentFiles({ id: data.id, name: data.name || "New Spreadsheet" });
};

const loadData = (KEY: string) => {
  const savedData = localStorage.getItem(KEY);
  return savedData ? JSON.parse(savedData) : DEFAULT_WORKBOOK_DATA;
};

const handleNew = () => {
  window.location.href = "/sheets";
};

const handleLoad = (id: string) => {
  const data = loadData(id);
  emit('updateData', data);
};

const handleLoadDialog = () => {
  // Implement your load dialog logic here
};

const handleSave = () => {
  const univerSheetInstance = props.univerRef;
  if (univerSheetInstance) {
    const result = univerSheetInstance.getData();
    saveData(result);
  } else {
    console.error('UniverSheet reference is null');
  }
};

const exportAs = (format: string) => {
  if (facadeAPI) {
    facadeAPI.getActiveWorkbook()?.getSnapshot();
    switch (format) {

    }
    //todo send data to remote API
  }
};

const undo = () => {
  if (facadeAPI) {
    facadeAPI.undo();
  }
};

const redo = () => {
  if (facadeAPI) {
    facadeAPI.redo();
  }
};

const cut = () => {
  if (facadeAPI) {
    //todo: copy html to clipboard then clear
    facadeAPI.getActiveWorkbook()?.getActiveSheet()?.getSelection()?.getActiveRange()?.generateHTML();
    facadeAPI.getActiveWorkbook()?.getActiveSheet()?.getSelection()?.getActiveRange()?.setValues([]);
  }
};

const copy = async () => {
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook();
    const worksheet = workbook?.getActiveSheet();
    const range = worksheet?.getSelection()?.getActiveRange();

    const html = await range?.generateHTML();

    if (html) {
      navigator.clipboard.writeText(html);
    }
  }
};

const paste = async () => {
  if (facadeAPI) {
    const text = await navigator.clipboard.readText();
    const workbook = facadeAPI.getActiveWorkbook();
    const worksheet = workbook?.getActiveSheet();
    const range = worksheet?.getSelection()?.getActiveRange();

    range?.setValues(text);
  }
};

const deleteSelected = () => {
  if (facadeAPI) {
    //todo: copy html to clipboard then clear
    facadeAPI.getActiveWorkbook()?.getActiveSheet()?.getSelection()?.getActiveRange()?.setValues([]);
  }
};

const zoomIn = () => {
  //todo: zoomin
  document.execCommand("zoomIn")
};

const zoomOut = () => {
  //todo: zooomout
};

const resetZoom = () => {
  //todo: zooomreset
};
const formatBold = () => {
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook();
    const worksheet = workbook?.getActiveSheet();
    const range = worksheet?.getSelection()?.getActiveRange();

    range?.setFontWeight('bold');
  }
};

const formatItalic = () => {
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook();
    const worksheet = workbook?.getActiveSheet();
    const range = worksheet?.getSelection()?.getActiveRange();

    range?.setFontStyle('italic');
  }
};

const formatUnderline = () => {
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook();
    const worksheet = workbook?.getActiveSheet();
    const range = worksheet?.getSelection()?.getActiveRange();

    range?.setFontLine("underline");
  }
};

const formatStrikethrough = () => {
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook();
    const worksheet = workbook?.getActiveSheet();
    const range = worksheet?.getSelection()?.getActiveRange();

    range?.setFontLine("line-through");
  }
};

const sort = async () => {
  //todo: add direction
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook();
    const worksheet = workbook?.getActiveSheet();
    const range = worksheet?.getSelection()?.getActiveRange();
    if (!range) {
      console.error('No active range selected');
      return;
    }

    // Gather the cell data
    const cellData: ICellData[][] = [];
    range.forEach((row, col, cell) => {
      if (!cellData[row]) {
        cellData[row] = [];
      }
      cellData[row][col] = cell;
    });

    // Convert cellData to an array of arrays of values
    const values = cellData.map(row => row.map(cell => cell?.v || ''));

    // Sort the values
    values.sort((a, b) => {
      for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
      }
      return 0;
    });

    // Map sorted values back to cellData format
    const sortedCellData = values.map(rowValues =>
      rowValues.map(value => ({ v: value }))
    );

    // Set the sorted values back into the range
    range.setValues(sortedCellData);
  }
};

const filter = () => {
  //todo: whatodo
};

const group = () => {
  if (facadeAPI) {
    //todo: merge cell?
  }
};

const spellCheck = () => {
  if (facadeAPI) {
    //todo: check words in cell
  }
};

const wordCount = () => {
  if (facadeAPI) {
    //todo: count characters in cell
  }
};

const openHelpCenter = () => {
  // Open help center logic
};

const sendFeedback = () => {
  // Send feedback logic
};

const about = () => {
  // About logic
};

</script>
