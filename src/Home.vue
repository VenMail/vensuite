<template>
    <AppMenu />
    <div class="bg-gray-100 p-4 rounded-lg backdrop-blur backdrop-filter bg-opacity-60">
        <form>
            <div class="relative">
                <SearchIcon class="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                <Input v-model="searchValue" placeholder="Search..." class="pl-7 md:w-[100px] lg:w-[300px]" />
            </div>
        </form>
    </div>
    <div class="flex gap-4 m-6">
        <button v-on:click="toggleSheet" class="flex flex-col items-center bg-gray-100 p-4 rounded-lg">
            <defaultIcons.IconMicrosoftExcel class="w-[8rem] h-[12rem] text-green-600" />
            <p class="text-sm">New Spreadsheet</p>
        </button>
        <button v-on:click="toggleDocs" class="flex flex-col items-center bg-gray-100 p-4 rounded-lg">
            <defaultIcons.IconMicrosoftWord class="w-[8rem] h-[12rem] text-blue-600" />
            <p class="text-sm">New Document</p>
        </button>
    </div>
    <Separator orientation="horizontal" class="w-full" />
    <div class="flex h-full p-4">
        <!-- Grid for files -->
        <div class="grid grid-cols-6 gap-4">
            <!-- Iterate over files -->
            <template v-for="file in files" :key="file.id">
                <component :is="getIconComponent(file.file_type)" class="w-16 h-16 text-gray-600" />
            </template>
        </div>
        <!-- Empty files section -->
        <!-- Conditionally render if there are no files -->
        <div class="h-full w-full flex flex-col items-center justify-center">
            <div v-if="files.length === 0" class="flex flex-1 py-8 my-auto justify-center shadow-sm">
                <div class="flex flex-col items-center gap-1 text-center">
                    <h3 class="text-2xl font-bold tracking-tight">
                        You have not uploaded any files yet
                    </h3>
                    <p class="text-sm text-muted-foreground">
                        You can manage your documents and spreadsheets from Venmail.
                    </p>
                    <Button class="mt-4">
                        Upload File
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import AppMenu from './AppMenu.vue'
import Input from './components/ui/input/Input.vue'
import Button from './components/ui/button/Button.vue'
import Separator from './components/ui/separator/Separator.vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons';
import axios from 'axios'
import { ref, onMounted } from 'vue'
import { SearchIcon } from 'lucide-vue-next';
import router from './main';

interface FileData {
    id: string;
    filename: string;
    file_type: string;
    file_size: string;
}

const searchValue = ref('')

// get all user files via api
const files = ref<FileData[]>([])

const toggleSheet = () => {
    // runSheet.value = true;
    // runDoc.value = false;
    router.push('/sheets')
}

const toggleDocs = () => {
    // runDoc.value = true;
    // runSheet.value = false;
    router.push('/docs')
}

// Fetch files from the API
const fetchFiles = async () => {
    try {
        const response = await axios.get('/api/files') // Replace '/api/files' with your API endpoint
        console.log(files.value.length, 'flen')
        if (response.data.files) {
            files.value = response.data.files
        }
    } catch (error) {
        console.error('Error fetching files:', error)
    }
}

onMounted(() => {
    fetchFiles()
    document.title = "Home";
});

// Function to get the icon component based on file_type
const getIconComponent = (fileType: string): keyof typeof defaultIcons => {
    return fileType as keyof typeof defaultIcons;
}
</script>
