import { defineStore } from "pinia";
import axios from "axios";
import { FileData } from "@/types";
import { useAuthStore } from "./auth";

const API_BASE_URI =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api/v1";
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;
const UPLOAD_ENDPOINT = `${API_BASE_URI}/app-files/upload`;

export const useFileStore = defineStore("files", {
  state: () => ({
    allFiles: [] as FileData[],
    recentFiles: [] as FileData[],
    token: localStorage.getItem("venAuthToken") as string
  }),
  actions: {
    getToken() {
      if (!this.token) {
        const authStore = useAuthStore();
        const token = authStore.getToken();
        if (token) {
          this.token = token;
        }
      }
      return this.token   
    },
    async saveDocument(document: FileData, noLoad?: boolean) {
      //any use to use noLoad to determine authStore need et al?
      const authStore = useAuthStore();
      const router = authStore.getRouter();

      document.last_viewed = new Date();

      if (navigator.onLine) {
        try {
          const response = await axios.post(FILES_ENDPOINT, document, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.getToken()}`,
            },
          });

          if (response.status === 200 || response.status === 201) {
            // Update the document with the data returned from the API
            const updatedDocument = {
              ...document,
              ...response.data.data,
              id: response.data.data.id,
              file_type: response.data.data.file_type || document.file_type,
            };

            this.saveToLocalCache(updatedDocument);
            this.updateRecentFiles(updatedDocument);

            if (!noLoad && router.currentRoute.params.id !== updatedDocument.id && !updatedDocument.is_folder) {
              router.replace(this.getRouteForDocument(updatedDocument));
            }

            return true;
          } else {
            console.error("Failed to save document:", response);
            return false;
          }
        } catch (error) {
          console.error("Error saving document to API:", error);
          return false;
        }
      } else {
        this.saveToLocalCache(document);
        this.updateRecentFiles(document);

        console.warn("Document saved locally. Will sync when online.");

        if (!noLoad && router.currentRoute.params.id !== document.id && !document.is_folder) {
          router.replace(this.getRouteForDocument(document));
        }

        return true;
      }
    },
    async moveFile(fileId: string, newFolderId: string) {
      try {
        const fileToMove = this.allFiles.find(f => f.id === fileId);
        if (!fileToMove) throw new Error('File not found');

        fileToMove.folder_id = newFolderId;

        const result = await this.saveDocument(fileToMove);
        
        return result;
      } catch (error) {
        console.error('Error moving file:', error);
        return false;
      }
    },
    async uploadFile(file: File, onProgress: (progress: number) => void): Promise<boolean> {
      try {
        const formData = new FormData();
        formData.append('file', file);
    
        const response = await axios.post(UPLOAD_ENDPOINT, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${this.getToken()}`,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent?.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          },
        });
    
        if (response.status === 200 || response.status === 201) {
          // Update the document with the data returned from the API
          const uploadedData = response.data.data as FileData;
    
          this.saveToLocalCache(uploadedData);
          this.updateRecentFiles(uploadedData);
    
          return true;
        } else {
          console.error('Failed to upload file:', response);
          return false;
        }
      } catch (error) {
        console.error('Error uploading file to API:', error);
        return false;
      }
    },    
    async makeFolder(folder: FileData) : Promise<FileData | null> {
      folder.last_viewed = new Date();

      if (navigator.onLine) {
        try {
          const response = await axios.post(FILES_ENDPOINT, folder, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.getToken()}`,
            },
          });

          const apiData = response.data.data as FileData

          const existingIndex = this.allFiles.findIndex(
            (file) => file.id === apiData.id
          );
          if (existingIndex !== -1) {
            // Update existing file in allFiles
            this.allFiles[existingIndex] = apiData;
          } else {
            // Add new file to allFiles
            this.allFiles.push(apiData);
          }
          return apiData;
        } catch (error) {
          console.error("Error saving folder to API:", error);
          return null;
        }
      } else {
        this.saveToLocalCache(folder);
        //todo: generate temp id
        console.warn("Folder saved locally. Will sync when online.");
        return folder;
      }
    },
    saveToLocalCache(document: FileData) {
      const storageKey = this.getStorageKeyForDocument(document);
      localStorage.setItem(storageKey, JSON.stringify(document));
    },
    async loadDocuments(): Promise<FileData[] | null> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });
        const apiData = response.data?.data;
        const docs = apiData as FileData[];
        this.allFiles = docs;
        return docs;
      } catch (error) {
        console.error("Error fetching documents from API:", error);
        return null;
      }
    },
    async deleteFile(id: string, fileType?: string): Promise<boolean> {
      try {
        // Delete the file from the API
        const response = await axios.delete(`${FILES_ENDPOINT}/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });
    
        if (response.status === 200 || response.status === 204) {
          // Remove where necessary
          this.allFiles = this.allFiles.filter((file) => file.id !== id);
          this.recentFiles = this.recentFiles.filter((file) => file.id !== id);
          const storageKey = this.getStoragePrefixForFileType(fileType) + `_${id}`;
          localStorage.removeItem(storageKey);

          // Update the recent files in localStorage
          localStorage.setItem(
            "VENX_RECENT",
            JSON.stringify(this.recentFiles.map((file) => file.id))
          );
    
          return true;
        } else {
          console.error("Failed to delete file:", response);
          return false;
        }
      } catch (error) {
        console.error("Error deleting file:", error);
        return false;
      }
    },    
    async loadDocument(
      id: string,
      fileType?: string
    ): Promise<FileData | null> {
      // Try to load from cache first
      const cachedDoc = this.loadFromCache(id, fileType);
      console.log("load: ", id);
      if (cachedDoc) {
        console.log("cache: ", cachedDoc);
        cachedDoc.last_viewed = new Date();
        this.saveToLocalCache(cachedDoc);
        this.updateRecentFiles(cachedDoc);
        return cachedDoc;
      }

      // If not in cache, try to load from API
      return await this.loadFromAPI(id);
    },
    loadFromCache(id: string, fileType?: string): FileData | null {
      if (fileType) {
        const prefix = this.getStoragePrefixForFileType(fileType);
        const storageKey = `${prefix}_${id}`;
        const item = localStorage.getItem(storageKey);
        if (item) {
          return JSON.parse(item) as FileData;
        }
      } else {
        for (const prefix of ["document", "sheet", "file"]) {
          const storageKey = `${prefix}_${id}`;
          const item = localStorage.getItem(storageKey);
          if (item) {
            return JSON.parse(item) as FileData;
          }
        }
      }
      return null;
    },
    async loadFromAPI(id: string): Promise<FileData | null> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });
        const apiData = response.data?.data;
        const doc = apiData as FileData;
        doc.last_viewed = new Date();
        this.saveToLocalCache(doc);
        this.updateRecentFiles(doc);
        return doc;
      } catch (error) {
        console.error("Error fetching document from API:", error);
        return null;
      }
    },
    async fetchFiles(id: string): Promise<FileData[]> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}/${id}/files`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });
        const apiData = response.data?.data;
        const docs = apiData as FileData[];
        //append to all files
        this.allFiles = [...docs, ...this.allFiles];
        return this.allFiles;
      } catch (error) {
        console.error("Error fetching files from API:", error);
        return [];
      }
    },
    updateRecentFiles(document: FileData) {
      // Update recent files
      this.recentFiles = this.recentFiles.filter(
        (file) => file.id !== document.id
      );
      this.recentFiles.unshift(document);
      this.recentFiles = this.recentFiles.slice(0, 10);

      // Update localStorage with the new list of recent file IDs
      localStorage.setItem(
        "VENX_RECENT",
        JSON.stringify(this.recentFiles.map((file) => file.id))
      );

      // Update allFiles
      const existingIndex = this.allFiles.findIndex(
        (file) => file.id === document.id
      );
      if (existingIndex !== -1) {
        // Update existing file in allFiles
        this.allFiles[existingIndex] = document;
      } else {
        // Add new file to allFiles
        this.allFiles.push(document);
      }
    },
    loadRecentFiles() {
      const recentFiles = localStorage.getItem("VENX_RECENT");
      if (recentFiles) {
        const recentFileIds = JSON.parse(recentFiles) as string[];
        Promise.all(recentFileIds.map((id) => this.loadDocument(id))).then(
          (files) => {
            this.recentFiles = files.filter(
              (file) => file !== null
            ) as FileData[];
          }
        );
      }
    },
    getRouteForDocument(document: FileData): string {
      switch (document.file_type?.toLowerCase()) {
        case "docx":
          return `/docs/${document.id}`;
        case "xlsx":
          return `/sheets/${document.id}`;
        default:
          return `/files/${document.id}`;
      }
    },
    getStorageKeyForDocument(document: FileData): string {
      const prefix = this.getStoragePrefixForFileType(document.file_type);
      return `${prefix}_${document.id}`;
    },
    getStoragePrefixForFileType(fileType?: string | null): string {
      switch (fileType?.toLowerCase()) {
        case "docx":
          return "document";
        case "xlsx":
          return "sheet";
        default:
          return fileType == null ? "folder" : "file";
      }
    },
  },
});
