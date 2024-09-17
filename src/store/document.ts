import { defineStore } from 'pinia'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'vue-router'
import { FileData } from '@/types'

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api/v1"
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`

export const useDocumentStore = defineStore('document', {
  state: () => ({
    documents: [] as FileData[],
  }),
  actions: {
    async saveDocument(document: FileData) {
      const router = useRouter()

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

            if (!document.id) {
              router.push(`/docs/${document.id}`)
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

      if (!document.id) {
        document.id = uuidv4()
      }

      this.saveToLocalCache(document)

      console.warn('Document saved locally. Will sync when online.')

      if (!document.id) {
        router.push(`/docs/${document.id}`)
      }

      return true
    },
    saveToLocalCache(document: FileData) {
      localStorage.setItem(`document_${document.id}`, JSON.stringify(document))
    },
    async loadFromCacheOrAPI(id: string): Promise<FileData | null> {
      const item = localStorage.getItem(`document_${id}`)
      if (item) {
        const doc = JSON.parse(item) as FileData;
        return Promise.resolve(doc);
      }
      return await this.loadFromAPI(id);
    },
    async loadFromAPI(id: string): Promise<FileData | null> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}/${id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('venAuthToken')}`
            }
        })
        const apiData = response.data?.data
        const doc = apiData as FileData
        this.saveToLocalCache(doc)
        return Promise.resolve(doc)
      } catch (error) {
        console.error('Error fetching document from API:', error)
        return Promise.reject(error)
      }
    },
  },
})