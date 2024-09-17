import { defineStore } from 'pinia'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'vue-router'
import { FileData } from '@/types'

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api/v1"
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`

export const useFileStore = defineStore('document', {
  state: () => ({
    documents: [] as FileData[],
    recentFiles: [] as string[], // Array of file IDs
  }),
  actions: {
    async saveDocument(document: FileData) {
      const router = useRouter()

      if (!document.id) {
        document.id = uuidv4()
      }

      document.last_viewed = new Date()

      if (navigator.onLine) {
        try {
          const response = await axios.post(FILES_ENDPOINT, document, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('venAuthToken')}`
            }
          })

          if (response.status === 200 || response.status === 201) {
            document.id = response.data.data.id || document.id
            this.saveToLocalCache(document)
            this.updateRecentFiles(document.id)

            if (!document.id) {
              router.push(this.getRouteForDocument(document))
            }

            return true
          } else {
            console.error('Failed to save document:', response)
            return false
          }
        } catch (error) {
          console.error('Error saving document to API:', error)
        }
      }

      this.saveToLocalCache(document)
      this.updateRecentFiles(document.id)

      console.warn('Document saved locally. Will sync when online.')

      if (!document.id) {
        router.push(this.getRouteForDocument(document))
      }

      return true
    },
    saveToLocalCache(document: FileData) {
      const storageKey = this.getStorageKeyForDocument(document)
      localStorage.setItem(storageKey, JSON.stringify(document))
    },
    async loadFromCacheOrAPI(id: string, fileType: string): Promise<FileData | null> {
      const storageKey = this.getStorageKeyForDocumentById(id, fileType)
      const item = localStorage.getItem(storageKey)
      if (item) {
        const doc = JSON.parse(item) as FileData;
        doc.last_viewed = new Date()
        this.saveToLocalCache(doc)
        this.updateRecentFiles(id)
        return Promise.resolve(doc);
      }
      return await this.loadFromAPI(id, fileType);
    },
    async loadFromAPI(id: string, fileType: string): Promise<FileData | null> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('venAuthToken')}`
          }
        })
        const apiData = response.data?.data
        const doc = apiData as FileData
        doc.last_viewed = new Date()
        doc.file_type = fileType // Ensure file_type is set
        this.saveToLocalCache(doc)
        this.updateRecentFiles(id)
        return Promise.resolve(doc)
      } catch (error) {
        console.error('Error fetching document from API:', error)
        return Promise.reject(error)
      }
    },
    updateRecentFiles(id: string) {
      this.recentFiles = [id, ...this.recentFiles.filter(fileId => fileId !== id)].slice(0, 10)
      localStorage.setItem('VENX_RECENT', JSON.stringify(this.recentFiles))
    },
    loadRecentFiles() {
      const recentFiles = localStorage.getItem('VENX_RECENT')
      if (recentFiles) {
        this.recentFiles = JSON.parse(recentFiles)
      }
    },
    getRouteForDocument(document: FileData): string {
      switch (document.file_type?.toLowerCase()) {
        case 'docx':
          return `/docs/${document.id}`
        case 'xlsx':
          return `/sheets/${document.id}`
        default:
          return `/files/${document.id}`
      }
    },
    getStorageKeyForDocument(document: FileData): string {
      const prefix = this.getStoragePrefixForFileType(document.file_type)
      return `${prefix}_${document.id}`
    },
    getStorageKeyForDocumentById(id: string, fileType: string): string {
      const prefix = this.getStoragePrefixForFileType(fileType)
      return `${prefix}_${id}`
    },
    getStoragePrefixForFileType(fileType?: string): string {
      switch (fileType?.toLowerCase()) {
        case 'docx':
          return 'document'
        case 'xlsx':
          return 'sheet'
        default:
          return 'file'
      }
    }
  },
})