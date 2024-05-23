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
    <div ref="spellcheckDiv" contenteditable="true" style="display:none"></div>
  </template>
  
  <script setup lang="ts">
  import { defineProps, defineEmits, ref, onMounted, watchEffect } from 'vue';
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
  import { FUniver } from "@univerjs/facade";
  import { ICellData, IDocumentData, Univer } from '@univerjs/core';
  import { useRouter } from 'vue-router';
  import diff from "microdiff";
import UniverDoc from '../UniverDoc.vue';
import { DEFAULT_DOCUMENT_DATA } from '@/assets/default-document-data';
  
  interface File {
    id: string;
    name: string;
  }
  
  interface Props {
    univerRef: InstanceType<typeof UniverDoc> | null;
    coreRef: InstanceType<typeof Univer> | null;
  }
  
  const props = defineProps<Props>();
  const emit = defineEmits(['updateData']);
  const recentFiles = ref<File[]>([]);
  const storageKey = 'VEND_RecentFiles';
  const router = useRouter();
  
  let facadeAPI: FUniver | null = null;
  let disposable = null;
  
  onMounted(() => {
    watchEffect(() => {
      if (props.coreRef && !facadeAPI) {
        facadeAPI = FUniver.newAPI(props.coreRef);
        disposable = facadeAPI.onBeforeCommandExecute((command) => {
          console.log("logging", command);
          // custom preprocessing logic before the command is executed
        });
      }
    });
  
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
  
  // Function to send changes to the backend
  const sendChangesToBackend = async (changes: any) => {
    try {
      await fetch('https://app.venmail.io/api/v1/office/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changes)
      });
      console.log('Changes sent to the backend');
    } catch (error) {
      console.error('Failed to send changes to the backend', error);
    }
  };
  
  const saveData = (data: IDocumentData) => {
    //todo: we probably want to use our own custom ID
    //also show modal to set document name
    const oldData = localStorage.getItem(data.id);
    if (oldData && props.univerRef) {
  
      const oldValue = JSON.parse(oldData);
      const differences = diff(data, oldValue);
      sendChangesToBackend(JSON.stringify(differences));
      console.log("diff", differences);
    }
  
    localStorage.setItem(data.id, JSON.stringify(data));
    console.log('saved.. ', data.id);
    router.replace({ path: `/docs/${data.id}` });
  
    updateRecentFiles({ id: data.id, name: data.title || "New Document" });
  };
  
  const loadData = (KEY: string) => {
    const savedData = localStorage.getItem(KEY);
    return savedData ? JSON.parse(savedData) : DEFAULT_DOCUMENT_DATA;
  };
  
  const handleNew = () => {
    window.location.href = "/docs";
  };
  
  const handleLoad = (id: string) => {
    const data = loadData(id);
    emit('updateData', data);
  };
  
  const handleLoadDialog = () => {
    // Implement your load dialog logic here
  };
  
  const handleSave = () => {
    const univerDocInstance = props.univerRef;
    if (univerDocInstance) {
      const result = univerDocInstance.getData();
      saveData(result);
    } else {
      console.error('UniverDoc reference is null');
    }
  };
  
  const exportAs = (format: string) => {
    if (facadeAPI) {
      facadeAPI.getActiveDocument()?.getSnapshot();
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
      facadeAPI.getActiveDocument()?.getSnapshot().body?.dataStream;
    }
  };
  
  const copy = async () => {
    if (facadeAPI) {  
      const html = facadeAPI.getActiveDocument()?.getSnapshot().body?.dataStream;
  
      if (html) {
        navigator.clipboard.writeText(html);
      }
    }
  };
  
  const paste = async () => {
    if (facadeAPI) {
      const text = await navigator.clipboard.readText();
      const document = facadeAPI.getActiveDocument()?.appendText(text);
    }
  };
  
  const deleteSelected = () => {
    if (facadeAPI) {
      //todo: copy html to clipboard then clear
      facadeAPI.getActiveDocument()?.getSnapshot();
    }
  };
  
  let scale = 1; // Initial scale value
  
  function zoomIn() {
    scale += 0.1; // Increase the scale
    document.body.style.transform = `scale(${scale})`;
    document.body.style.transformOrigin = '0 0'; // Ensure scaling happens from the top-left corner
  }
  
  function zoomOut() {
    scale = Math.max(0.1, scale - 0.1); // Decrease the scale, but prevent it from going below 0.1
    document.body.style.transform = `scale(${scale})`;
    document.body.style.transformOrigin = '0 0';
  }
  
  function resetZoom() {
    scale = 1; //reset
    document.body.style.transform = `scale(${scale})`;
    document.body.style.transformOrigin = '0 0';
  }
  
  const spellCheck = () => {
    if (facadeAPI) {
      const data = props.univerRef?.getData();
      if (data) {
        const text = extractTextFromDocument(data);
        performSpellCheck(text);
      }
    }
  };
  
  const wordCount = () => {
    if (facadeAPI) {
      const data = props.univerRef?.getData();
      if (data) {
        const { characterCount, wordCount } = countCharactersAndWords(data);
        console.log(`Character Count: ${characterCount}\nWord Count: ${wordCount}`);
      }
    }
  };
  
  const countCharactersAndWords = (data: IDocumentData) => {
    let characterCount = 0;
    let wordCount = 0;
    const text = extractTextFromDocument(data);
    characterCount += text.length;
    wordCount += text.trim().split(/\s+/).length;
  
    return { characterCount, wordCount };
  };
  
  const extractTextFromDocument = (data: IDocumentData) => {
    let text = data.body?.dataStream || "";
  
    return text.trim();
  };
  
  const performSpellCheck = (text: string) => {
    const spellcheckDiv = document.createElement('div');
    spellcheckDiv.contentEditable = 'true';
    spellcheckDiv.style.display = 'none';
    document.body.appendChild(spellcheckDiv);
  
    spellcheckDiv.innerText = text;
  
    setTimeout(() => {
      const misspelledWords: string[] = [];
  
      const range = document.createRange();
      range.selectNodeContents(spellcheckDiv);
      const textNodes = range.cloneContents().querySelectorAll('span');
  
      textNodes.forEach((node) => {
        if (node.classList.contains('misspelled')) {
          misspelledWords.push(node.innerText);
        }
      });
  
      document.body.removeChild(spellcheckDiv);
  
      if (misspelledWords.length) {
        console.log(`Misspelled words: ${misspelledWords.join(', ')}`);
      } else {
        console.log('No misspelled words found.');
      }
    }, 100);
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
  