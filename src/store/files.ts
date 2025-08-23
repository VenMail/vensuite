import { defineStore } from "pinia";
import axios from "axios";
import { useAuthStore } from "./auth";
import { FileData } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_BLANK_DOCUMENT_TEMPLATE } from "@/assets/doc-data";

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;
const UPLOAD_ENDPOINT = `${API_BASE_URI}/app-files/upload`;

// Extract base URL for constructing full URLs from relative paths
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const BASE_URL = API_BASE_URL.replace('/api/v1', '');

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SYNC_INTERVAL = 30 * 1000; // 30 seconds
const MAX_RETRIES = 3;

export const useFileStore = defineStore("files", {
  state: () => ({
    allFiles: [] as FileData[],
    recentFiles: [] as FileData[],
    cachedDocuments: new Map<string, { data: FileData; timestamp: number }>(),
    pendingChanges: new Map<string, { data: FileData; attempts: number }>(),
    syncStatus: new Map<string, 'pending' | 'syncing' | 'failed' | 'synced'>(),
    isOnline: navigator.onLine,
    isSyncing: false,
    lastError: null as string | null,
  }),

  actions: {
    /** Derive a human title from server data safely */
    computeTitle(serverData: any): string {
      const rawTitle = serverData?.title
      if (rawTitle && typeof rawTitle === 'string' && rawTitle.trim().length) return rawTitle
      // Try to extract from content JSON (e.g., spreadsheets store name inside JSON)
      const rawContent = serverData?.content || serverData?.contents
      if (rawContent && typeof rawContent === 'string') {
        try {
          const parsed = JSON.parse(rawContent)
          if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string' && parsed.name.trim().length) {
            return parsed.name
          }
        } catch {}
      }
      // Fallback to file_name without extension
      const fileName = serverData?.file_name
      if (fileName && typeof fileName === 'string') {
        const noExt = fileName.replace(/\.[^/.]+$/, '')
        if (noExt.trim().length) return noExt
      }
      return 'Untitled'
    },
    /** Construct full URL from relative path */
    constructFullUrl(filePath: string): string {
      if (!filePath) return '';
      
      // If it's already a full URL, return as is
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
      }
      
      // If it's a relative path, prepend the base URL
      if (filePath.startsWith('/')) {
        return `${BASE_URL}${filePath}`;
      }
      
      // If it doesn't start with /, add it
      return `${BASE_URL}/${filePath}`;
    },

    /** Process uploaded file data from API response */
    processUploadedFile(responseData: any): FileData {
      const file: FileData = {
        id: responseData.id,
        title: responseData.title || responseData.file_name?.replace(/\.[^/.]+$/, "") || 'Untitled',
        file_name: responseData.file_name,
        file_type: responseData.file_type,
        file_size: responseData.file_size,
        file_url: this.constructFullUrl(responseData.file_url),
        folder_id: responseData.folder_id,
        is_folder: responseData.is_folder || false,
        is_template: responseData.is_template || false,
        employee_id: responseData.employee_id,
        content: responseData.content || responseData.contents || '',
        created_at: responseData.created_at,
        updated_at: responseData.updated_at,
        last_viewed: new Date(),
        isNew: false,
        isDirty: false
      };
      
      return file;
    },

    /** Upload a file to the server with progress tracking */
    async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<FileData | null> {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(UPLOAD_ENDPOINT, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${this.getToken()}`
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(percentCompleted);
            }
          }
        });
        
        if (response.status === 200 || response.status === 201) {
          const uploadedFile = this.processUploadedFile(response.data.data);
          
          // Add to store immediately for instant visibility
          this.addFile(uploadedFile);
          
          console.log('File uploaded successfully:', uploadedFile);
          return uploadedFile;
        }
        
        return null;
      } catch (error) {
        console.error('Error uploading file:', error);
        this.lastError = 'Failed to upload file';
        throw error;
      }
    },

    /** Add a file to the store */
    addFile(file: FileData) {
      // Check if file already exists
      const existingIndex = this.allFiles.findIndex(f => f.id === file.id);
      
      if (existingIndex !== -1) {
        // Update existing file
        this.allFiles[existingIndex] = file;
      } else {
        // Add new file
        this.allFiles.unshift(file); // Add to beginning for newest first
      }
      
      // Update recent files if it's a media file
      if (this.isMediaFile(file)) {
        this.updateRecentFiles(file);
      }
      
      // Cache the file
      this.cacheDocument(file);
    },

    /** Check if a file is a media file */
    isMediaFile(file: FileData): boolean {
      // First check file_type
      if (file.file_type) {
        const mediaTypes = [
          // Images
          'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
          // Videos
          'mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv',
          // Audio
          'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'
        ];
        
        if (mediaTypes.includes(file.file_type.toLowerCase())) {
          return true;
        }
      }
      
      // Fallback: check file extension from file_name
      if (file.file_name) {
        const extension = file.file_name.split('.').pop()?.toLowerCase();
        if (extension) {
          const mediaTypes = [
            // Images
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
            // Videos
            'mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv',
            // Audio
            'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'
          ];
          return mediaTypes.includes(extension);
        }
      }
      
      return false;
    },

    /** Update recent files list */
    updateRecentFiles(file: FileData) {
      // Remove if already in recent files
      this.recentFiles = this.recentFiles.filter(f => f.id !== file.id);
      
      // Add to beginning
      this.recentFiles.unshift(file);
      
      // Keep only last 10
      if (this.recentFiles.length > 10) {
        this.recentFiles = this.recentFiles.slice(0, 10);
      }
    },

    /** Get authentication token from auth store or localStorage */
    getToken() {
      const authStore = useAuthStore();
      return authStore.getToken() || localStorage.getItem("venAuthToken");
    },

    /** Create a new document - tries online first, falls back to local */
    async createNewDocument(fileType: string = "docx", title: string = "Untitled"): Promise<FileData> {
      // Use proper default content based on file type
      const defaultContent = fileType === "docx" ? DEFAULT_BLANK_DOCUMENT_TEMPLATE : "";
      
      const newDoc = {
        title,
        file_name: `${title}.${fileType}`,
        file_type: fileType,
        is_folder: false, // Explicitly ensure it's not a folder
        content: defaultContent,
        last_viewed: new Date(),
      };

      // Try to create online first
      if (this.isOnline) {
        try {
          const response = await axios.post(FILES_ENDPOINT, newDoc, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.getToken()}`,
            },
          });

          if (response.status === 200 || response.status === 201) {
            const serverDoc = response.data.data;
            const createdDoc: FileData = {
              ...serverDoc,
              id: serverDoc.id, // Use server ID directly
              file_type: fileType, // Explicitly ensure file_type is preserved
              is_folder: false, // Explicitly ensure it's not marked as folder
              content: serverDoc.content || serverDoc.contents || defaultContent,
              isNew: false,
              isDirty: false,
            };
            
            this.cacheDocument(createdDoc);
            this.updateFiles(createdDoc);
            console.log("Created new document online:", createdDoc.id);
            return createdDoc;
          }
        } catch (error) {
          console.error("Failed to create document online:", error);
        }
      }

      // Fallback to local creation
      const localDoc: FileData = {
        ...newDoc,
        id: uuidv4(),
        isNew: true,
        isDirty: true,
      };
      
      this.saveToLocalCache(localDoc);
      this.updateFiles(localDoc);
      console.log("Created new document locally:", localDoc.id);
      return localDoc;
    },

    /** Check if a document ID is a local UUID */
    isLocalDocument(id: string): boolean {
      // UUIDs have a specific format, server IDs typically don't
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    },

    /** Delete a local document from storage */
    deleteLocalDocument(id: string) {
      // Remove from localStorage
      const prefixes = ["document", "sheet", "file"];
      prefixes.forEach(prefix => {
        const key = `${prefix}_${id}`;
        localStorage.removeItem(key);
      });

      // Remove from cache
      this.cachedDocuments.delete(id);
      
      // Remove from pending changes and sync status
      this.pendingChanges.delete(id);
      this.syncStatus.delete(id);
      
      // Remove from state arrays
      this.allFiles = this.allFiles.filter(f => f.id !== id);
      this.recentFiles = this.recentFiles.filter(f => f.id !== id);
    },

    /** Save a document - local-first with robust sync */
    async saveDocument(document: FileData): Promise<{
      document: FileData;
      shouldRedirect?: boolean;
      redirectId?: string;
    }> {
      document.last_viewed = new Date();
      
      // Save locally first for immediate responsiveness
      this.saveToLocalCache(document);
      this.updateFiles(document);
      
      // Then attempt online sync if connected
      if (this.isOnline) {
        const isLocalDoc = this.isLocalDocument(document.id!);
        const saveResult = await this.saveToAPI(document);
        
        if (saveResult) {
          // Save was successful online
          if (isLocalDoc) {
            // This was a local document that now has a server ID
            // Delete the local version and return redirect info
            this.deleteLocalDocument(document.id!);
            console.log("Local document saved online, redirecting from", document.id, "to", saveResult.id);
            
            return {
              document: saveResult,
              shouldRedirect: true,
              redirectId: saveResult.id
            };
          } else {
            // This was already a server document, just update cache
            this.cacheDocument(saveResult);
            this.updateFiles(saveResult);
            return { document: saveResult };
          }
        } else {
          // Online save failed - mark as dirty for later sync
          document.isDirty = true;
          this.queueForSync(document);
        }
      } else {
        // Offline - mark as dirty for later sync
        document.isDirty = true;
        this.queueForSync(document);
      }
      
      return { document };
    },

    /** Get storage prefix based on file type */
    getPrefix(fileType: string): string {
      switch (fileType.toLowerCase()) {
        case "docx": return "document";
        case "xlsx": return "sheet";
        default: return "file";
      }
    },

    /** Get default content based on file type */
    getDefaultContent(fileType?: string | null): string {
      return fileType === "docx" ? DEFAULT_BLANK_DOCUMENT_TEMPLATE : "";
    },

    /** Save document to the API */
    async saveToAPI(document: FileData): Promise<FileData | null> {
      try {
        const payload = { ...document };
        
        // Clean up local-only fields systematically
        const localOnlyFields: (keyof FileData)[] = ['isNew', 'isDirty'];
        localOnlyFields.forEach(field => delete payload[field]);
        
        // Use proper HTTP methods: PUT for updates, POST for creates
        const isUpdate = !this.isLocalDocument(document.id!) && document.id;
        const url = isUpdate ? `${FILES_ENDPOINT}/${document.id}` : FILES_ENDPOINT;
        const method = isUpdate ? 'put' : 'post';
        
        const response = await axios({
          method,
          url,
          data: payload,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });

        if (response.status === 200 || response.status === 201) {
          const serverData = response.data.data;
          
          const savedDoc: FileData = {
            ...serverData,
            id: serverData.id, // Always use server ID
            file_type: document.file_type || serverData.file_type, // Preserve file_type
            is_folder: document.is_folder ?? serverData.is_folder ?? false, // Preserve is_folder
            content: serverData.content || serverData.contents || this.getDefaultContent(serverData.file_type),
            isNew: false,
            isDirty: false,
          };
          
          this.cacheDocument(savedDoc);
          this.updateFiles(savedDoc);
          return savedDoc;
        }
        return null;
      } catch (error) {
        console.error("Error saving to API:", error);
        this.lastError = "Failed to save to API";
        return null;
      }
    },

    /** Load a document by ID */
    async loadDocument(id: string, fileType = "docx"): Promise<FileData | null> {
      // Try loading from cache first
      const cached = this.cachedDocuments.get(id)?.data;
      if (cached && Date.now() - this.cachedDocuments.get(id)!.timestamp < CACHE_DURATION) {
        return cached;
      }

      // Try loading from API if online
      if (this.isOnline) {
        const apiDoc = await this.loadFromAPI(id);
        if (apiDoc) {
          this.cacheDocument(apiDoc);
          this.updateFiles(apiDoc);
          return apiDoc;
        }
      }

      // Try loading from local storage
      const local = this.loadFromLocalStorage(id, fileType);
      if (local) {
        this.cacheDocument(local);
        this.updateFiles(local);
        return local;
      }
      
      return null;
    },

    /** Load from API */
    async loadFromAPI(id: string): Promise<FileData | null> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}/${id}`, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const data = response.data.data;
        
        const doc: FileData = { 
          ...data, 
          id: data.id, // Use server ID directly
          content: data.content || data.contents || this.getDefaultContent(data.file_type),
          title: this.computeTitle(data),
          isNew: false, 
          isDirty: false 
        };
        
        return doc;
      } catch (error) {
        console.error("Error loading from API:", error);
        return null;
      }
    },

    /** Queue document for sync */
    queueForSync(document: FileData) {
      this.pendingChanges.set(document.id!, { data: document, attempts: 0 });
      this.syncStatus.set(document.id!, 'pending');
    },

    /** Sync pending changes with enhanced status tracking */
    async syncPendingChanges() {
      if (!this.isOnline || this.isSyncing || !this.pendingChanges.size) return;
      
      this.isSyncing = true;
      
      for (const [id, { data, attempts }] of this.pendingChanges.entries()) {
        if (attempts >= MAX_RETRIES) {
          this.pendingChanges.delete(id);
          this.syncStatus.set(id, 'failed');
          continue;
        }
        
        this.syncStatus.set(id, 'syncing');
        
        const saved = await this.saveToAPI(data);
        if (saved) {
          this.pendingChanges.delete(id);
          this.syncStatus.set(id, 'synced');
          
          // If this was a local document that got saved online, clean up local version
          if (this.isLocalDocument(id)) {
            this.deleteLocalDocument(id);
            // Remove from sync status since the document ID has changed
            this.syncStatus.delete(id);
          }
        } else {
          this.pendingChanges.set(id, { data, attempts: attempts + 1 });
          this.syncStatus.set(id, 'pending');
        }
        
        // Exponential backoff for failed attempts
        if (!saved && attempts > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
        }
      }
      
      this.isSyncing = false;
    },

    /** Save to local cache */
    saveToLocalCache(document: FileData) {
      const key = `${this.getPrefix(document.file_type || "docx")}_${document.id}`;
      localStorage.setItem(key, JSON.stringify(document));
      this.cacheDocument(document);
    },

    /** Load from local storage */
    loadFromLocalStorage(id: string, fileType?: string): FileData | null {
      const key = `${this.getPrefix(fileType || "docx")}_${id}`;
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    },

    /** Cache document in memory */
    cacheDocument(document: FileData) {
      if (document.id) {
        this.cachedDocuments.set(document.id, { data: document, timestamp: Date.now() });
      }
    },

    /** Update allFiles and recentFiles */
    updateFiles(document: FileData) {
      const index = this.allFiles.findIndex(f => f.id === document.id);
      if (index !== -1) this.allFiles[index] = document;
      else this.allFiles.push(document);

      const recentIndex = this.recentFiles.findIndex(f => f.id === document.id);
      if (recentIndex !== -1) this.recentFiles.splice(recentIndex, 1);
      this.recentFiles.unshift(document);
      if (this.recentFiles.length > 10) this.recentFiles.pop();
      localStorage.setItem("VENX_RECENT", JSON.stringify(this.recentFiles.map(f => f.id)));
    },

    async moveFile(fileId: string, newFolderId: string) {
      try {
        const fileToMove = this.allFiles.find((f) => f.id === fileId);
        if (!fileToMove) throw new Error("File not found");

        fileToMove.folder_id = newFolderId;

        const result = await this.saveDocument(fileToMove);

        return result;
      } catch (error) {
        console.error("Error moving file:", error);
        return false;
      }
    },

    /** Load all offline documents from localStorage */
    loadOfflineDocuments(): FileData[] {
      const offlineDocs: FileData[] = [];
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("document_") || key.startsWith("sheet_") || key.startsWith("file_")) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || "{}");
            if (item && item.id) {
              // Ensure file_type is properly set based on storage key prefix if missing
              if (!item.file_type) {
                if (key.startsWith("document_")) {
                  item.file_type = "docx";
                } else if (key.startsWith("sheet_")) {
                  item.file_type = "xlsx";
                }
              }
              
              // Ensure is_folder is properly set if missing
              if (item.is_folder === undefined) {
                item.is_folder = false;
              }
              
              offlineDocs.push(item);
            }
          } catch (error) {
            console.error(`Error parsing offline document ${key}:`, error);
          }
        }
      }
      return offlineDocs;
    },

    /** Load all documents from API */
    async loadDocuments(doNotMutateStore: boolean = false): Promise<FileData[]> {
      try {
        const response = await axios.get(FILES_ENDPOINT, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const docs = response.data.data as FileData[];
        const processedDocs = docs.map((doc) => ({ 
          ...doc, 
          id: doc.id, // Use server ID directly
          content: doc.content || this.getDefaultContent(doc.file_type),
          title: this.computeTitle(doc),
          file_url: doc.file_url ? this.constructFullUrl(doc.file_url) : undefined,
          isNew: false,
          isDirty: false
        }));
        
        // Optionally update store with processed documents
        if (!doNotMutateStore) {
          this.allFiles = processedDocs;
        }
        
        return processedDocs;
      } catch (error) {
        console.error("Error loading documents:", error);
        this.lastError = "Failed to load documents";
        
        // Load offline documents if online fetch fails
        const offlineDocs = this.loadOfflineDocuments();
        this.allFiles = offlineDocs;
        return offlineDocs;
      }
    },

    createLocalId(): string {
      return uuidv4();
    },

    /** Fetch files within a specific folder */
    async fetchFiles(folderId: string): Promise<FileData[]> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}?folder_id=${folderId}`, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const docs = response.data.data as FileData[];
        const processedDocs = docs.map((doc) => ({ 
          ...doc, 
          id: doc.id, // Use server ID directly
          content: doc.content || this.getDefaultContent(doc.file_type),
          title: doc.title || doc.file_name || 'Untitled',
          file_url: doc.file_url ? this.constructFullUrl(doc.file_url) : undefined,
          isNew: false,
          isDirty: false
        }));
        
        return processedDocs;
      } catch (error) {
        console.error("Error fetching files:", error);
        this.lastError = "Failed to fetch files";
        return [];
      }
    },

    /** Delete a file */
    async deleteFile(id: string): Promise<boolean> {
      const docIndex = this.allFiles.findIndex((f) => f.id === id);
      if (docIndex === -1) return false;

      const doc = this.allFiles[docIndex];
      
      // If it's an online document (not local UUID), delete from API
      if (this.isOnline && !this.isLocalDocument(id)) {
        try {
          await axios.delete(`${FILES_ENDPOINT}/${id}`, {
            headers: { Authorization: `Bearer ${this.getToken()}` },
          });
        } catch (error) {
          console.error("Error deleting from API:", error);
          // Proceed with local deletion even if API fails
        }
      }

      // Remove from localStorage and state
      const prefix = this.getPrefix(doc.file_type || "docx");
      const key = `${prefix}_${id}`;
      localStorage.removeItem(key);
      this.allFiles.splice(docIndex, 1);
      this.recentFiles = this.recentFiles.filter((f) => f.id !== id);
      
      // Remove from cache and pending changes
      this.cachedDocuments.delete(id);
      this.pendingChanges.delete(id);
      
      return true;
    },

    /** Create a new folder */
    async makeFolder(folder: FileData): Promise<FileData | null> {
      folder.is_folder = true;
      folder.last_viewed = new Date();

      // Try to create online first
      if (this.isOnline) {
        try {
          const response = await axios.post(FILES_ENDPOINT, folder, {
            headers: { Authorization: `Bearer ${this.getToken()}` },
          });
          const saved = response.data.data as FileData;
          const serverFolder: FileData = {
            ...saved,
            id: saved.id, // Use server ID directly
            isNew: false,
            isDirty: false,
          };
          this.cacheDocument(serverFolder);
          this.updateFiles(serverFolder);
          return serverFolder;
        } catch (error) {
          console.error("Error creating folder on API:", error);
        }
      }

      // Fallback to local creation
      const localFolder: FileData = {
        ...folder,
        id: uuidv4(),
        isDirty: true,
        isNew: true,
      };
      this.saveToLocalCache(localFolder);
      this.updateFiles(localFolder);
      return localFolder;
    },

    /** Import an attachment as a new document */
    async importAttachment(attachId: string): Promise<FileData | null> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}/import/${attachId}`, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const doc = response.data.data as FileData;
        doc.id = uuidv4();
        doc.last_viewed = new Date();
        this.saveToLocalCache(doc);
        this.updateFiles(doc);
        return doc;
      } catch (error) {
        console.error("Error importing attachment:", error);
        this.lastError = "Failed to import attachment";
        return null;
      }
    },

    /** Initialize sync handlers */
    initialize() {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.syncPendingChanges();
      });
      window.addEventListener("offline", () => (this.isOnline = false));
      setInterval(() => this.isOnline && this.syncPendingChanges(), SYNC_INTERVAL);
    },

    /** Load only media files from API */
    async loadMediaFiles(): Promise<FileData[]> {
      try {
        // First try to load all documents since API may not support media_only
        const response = await axios.get(FILES_ENDPOINT, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const docs = response.data.data as FileData[];
        const processedDocs = docs.map((doc) => ({ 
          ...doc, 
          id: doc.id, // Use server ID directly
          content: doc.content || this.getDefaultContent(doc.file_type),
          title: doc.title || doc.file_name || 'Untitled',
          file_url: doc.file_url ? this.constructFullUrl(doc.file_url) : undefined,
          isNew: false,
          isDirty: false
        }));
        
        // Filter for media files only
        const mediaFiles = processedDocs.filter(doc => this.isMediaFile(doc));
        
        // Update store with all processed documents
        this.allFiles = processedDocs;
        
        console.log('Loaded media files:', mediaFiles.length, 'out of', processedDocs.length, 'total files');
        console.log('Media files found:', mediaFiles.map(f => ({ name: f.title, type: f.file_type, file_name: f.file_name })));
        console.log('All files found:', processedDocs.map(f => ({ name: f.title, type: f.file_type, file_name: f.file_name, is_folder: f.is_folder })));
        return mediaFiles;
      } catch (error) {
        console.error("Error loading media files:", error);
        this.lastError = "Failed to load media files";
        
        // Fallback to filtering existing files
        const mediaFiles = this.allFiles.filter(file => this.isMediaFile(file));
        return mediaFiles;
      }
    },
  },
});
