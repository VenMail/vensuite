import { defineStore } from "pinia";
import axios from "axios";
import { useAuthStore } from "./auth";
import { FileData } from "@/types";
import { v4 as uuidv4 } from "uuid";

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api/v1";
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;
const UPLOAD_ENDPOINT = `${API_BASE_URI}/app-files/upload`;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SYNC_INTERVAL = 30 * 1000; // 30 seconds
const MAX_RETRIES = 3;

export const useFileStore = defineStore("files", {
  state: () => ({
    allFiles: [] as FileData[],
    recentFiles: [] as FileData[],
    cachedDocuments: new Map<string, { data: FileData; timestamp: number }>(),
    pendingChanges: new Map<string, { data: FileData; attempts: number }>(),
    isOnline: navigator.onLine,
    isSyncing: false,
    lastError: null as string | null,
  }),

  actions: {
    /** Get authentication token from auth store or localStorage */
    getToken() {
      const authStore = useAuthStore();
      return authStore.getToken() || localStorage.getItem("venAuthToken");
    },

    /** Save a document, handling offline and online scenarios */
    async saveDocument(document: FileData): Promise<FileData> {
      // Generate a local ID if none exists
      if (!document.id) {
        document.id = uuidv4();
        document.isNew = true;
      }

      // Handle server IDs by mapping to local IDs
      if (/^\d+-/.test(document.id) && !document.remote_id) {
        document.remote_id = document.id;
        document.id = uuidv4();
        localStorage.setItem(`server_id_map_${document.remote_id}`, document.id);
      }

      document.last_viewed = new Date();
      
      // Normalize content field
      if (document.contents && !document.content) {
        document.content = document.contents;
      }
      
      this.saveToLocalCache(document);

      if (this.isOnline) {
        const saved = await this.saveToAPI(document);
        if (saved) {
          this.pendingChanges.delete(document.id);
          
          // If this is a new document that received a server ID,
          // indicate redirection is needed through the redirect_server_id field
          if (document.isNew && saved.remote_id && !document.remote_id) {
            saved.redirect_server_id = saved.remote_id;
          }
          
          return saved;
        }
      }

      // Offline or failed save: mark as dirty and queue for sync
      document.isDirty = true;
      this.queueForSync(document);
      return document;
    },

    /** Save document to the API */
    async saveToAPI(document: FileData): Promise<FileData | null> {
      try {
        // Create a new object to avoid modifying the original
        const data = { ...document };
        
        // Handle content/contents field consistency
        if (data.content && !data.contents) {
          data.contents = data.content;
        }
        
        // Clean up unnecessary fields
        delete data.isNew;
        delete data.isDirty;
        
        // Handle ID mapping for API
        const isNew = !data.remote_id;
        if (isNew) {
          delete data.id; // Remove local ID for new documents
        } else {
          data.id = data.remote_id; // Use server_id as id for API
        }

        const response = await axios.post(FILES_ENDPOINT, data, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });

        if (response.status === 200 || response.status === 201) {
          const serverData = response.data.data;
          
          // Handle content/contents field from server response
          const content = serverData.content || serverData.contents;
          
          // Create an updated document with normalized fields
          const updated = {
            ...document,
            ...serverData,
            id: document.id, // Maintain local ID
            server_id: serverData.id,
            content: content, // Consistent field name
            contents: undefined, // Remove to avoid duplication
            isNew: false,
            isDirty: false,
          };
          
          localStorage.setItem(`server_id_map_${serverData.id}`, updated.id);
          this.saveToLocalCache(updated);
          this.updateFiles(updated);
          return updated;
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
      let localId = id;
      let serverId: string | undefined;
      
      // Check if this is a server ID format
      if (/^\d+-/.test(id)) {
        serverId = id;
        // Get mapped local ID or generate new one
        localId = localStorage.getItem(`server_id_map_${id}`) || uuidv4();
        localStorage.setItem(`server_id_map_${id}`, localId);
        
        // Try to load from API first since we have a server ID
        if (this.isOnline) {
          const apiDoc = await this.loadFromAPI(serverId);
          if (apiDoc) {
            this.cacheDocument(apiDoc);
            this.updateFiles(apiDoc);
            return apiDoc;
          }
        }
      }

      // Try loading from cache first
      const cached = this.cachedDocuments.get(localId)?.data;
      if (cached && Date.now() - this.cachedDocuments.get(localId)!.timestamp < CACHE_DURATION) {
        return cached;
      }

      // Try loading from local storage
      const local = this.loadFromLocalStorage(localId, fileType);
      if (local) {
        this.cacheDocument(local);
        this.updateFiles(local);
        
        // If we have a server ID but loaded from local, and local isn't dirty,
        // refresh from server in background (don't await)
        if (this.isOnline && serverId && !local.isDirty) {
          this.refreshFromServer(serverId, localId);
        }
        return local;
      }

      // Last resort - try API with the ID we have
      if (this.isOnline && !serverId) {
        const apiDoc = await this.loadFromAPI(id);
        if (apiDoc) {
          this.cacheDocument(apiDoc);
          this.updateFiles(apiDoc);
          return apiDoc;
        }
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
        const localId = localStorage.getItem(`server_id_map_${data.id}`) || uuidv4();
        
        // Handle content/contents field mismatch
        const content = data.content || data.contents;
        
        // Create normalized document with consistent field names
        const doc = { 
          ...data, 
          id: localId, 
          server_id: data.id, 
          content: content, // Normalize as 'content'
          contents: undefined, // Remove 'contents' to avoid duplication
          isNew: false, 
          isDirty: false 
        };
        
        localStorage.setItem(`server_id_map_${data.id}`, localId);
        this.saveToLocalCache(doc);
        return doc;
      } catch (error) {
        console.error("Error loading from API:", error);
        return null;
      }
    },

    /** Refresh document from server if not dirty */
    async refreshFromServer(serverId: string, localId: string) {
      const local = this.loadFromLocalStorage(localId);
      if (local?.isDirty) return; // Don't override dirty local changes
      
      const apiDoc = await this.loadFromAPI(serverId);
      if (apiDoc) {
        // Make sure we maintain local ID
        apiDoc.id = localId;
        apiDoc.remote_id = serverId;
        this.cacheDocument(apiDoc);
        this.updateFiles(apiDoc);
      }
    },

    /** Queue document for sync */
    queueForSync(document: FileData) {
      this.pendingChanges.set(document.id!, { data: document, attempts: 0 });
    },

    /** Sync pending changes */
    async syncPendingChanges() {
      if (!this.isOnline || this.isSyncing || !this.pendingChanges.size) return;
      this.isSyncing = true;
      for (const [id, { data, attempts }] of this.pendingChanges.entries()) {
        if (attempts >= MAX_RETRIES) {
          this.pendingChanges.delete(id);
          continue;
        }
        const saved = await this.saveToAPI(data);
        if (saved) this.pendingChanges.delete(id);
        else this.pendingChanges.set(id, { data, attempts: attempts + 1 });
        await new Promise(resolve => setTimeout(resolve, 5000 * (attempts + 1)));
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

    /** Get storage prefix based on file type */
    getPrefix(fileType: string): string {
      switch (fileType.toLowerCase()) {
        case "docx": return "document";
        case "xlsx": return "sheet";
        default: return "file";
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
              offlineDocs.push(item);
            }
          } catch (error) {
            console.error(`Error parsing offline document ${key}:`, error);
          }
        }
      }
      return offlineDocs;
    },

    /** Merge online and offline documents */
    mergeDocuments(onlineDocs: FileData[], offlineDocs: FileData[]): FileData[] {
      const merged = new Map<string, FileData>();

      // Add offline documents first
      offlineDocs.forEach((offline) => {
        if (offline.id) {
          merged.set(offline.id, offline);
        }
      });

      // Add online documents, but only if no offline version exists or if offline is not dirty
      onlineDocs.forEach((online) => {
        const localId = localStorage.getItem(`server_id_map_${online.remote_id}`) || online.id;
        if (localId) {
          const offlineDoc = merged.get(localId);
          if (!offlineDoc || !offlineDoc.isDirty) {
            merged.set(localId, { ...online, id: localId });
          }
        }
      });

      return Array.from(merged.values());
    },

    /** Load all documents from API */
    async loadDocuments(): Promise<FileData[]> {
      try {
        const response = await axios.get(FILES_ENDPOINT, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const docs = response.data.data as FileData[];
        return docs.map((doc) => {
          let localId = localStorage.getItem(`server_id_map_${doc.id}`);
          if (!localId) {
            localId = uuidv4();
            localStorage.setItem(`server_id_map_${doc.id}`, localId);
          }
          return { ...doc, id: localId, server_id: doc.id };
        });
      } catch (error) {
        console.error("Error loading documents:", error);
        this.lastError = "Failed to load documents";
        return [];
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
        return docs.map((doc) => {
          let localId = localStorage.getItem(`server_id_map_${doc.id}`);
          if (!localId) {
            localId = uuidv4();
            localStorage.setItem(`server_id_map_${doc.id}`, localId);
          }
          return { ...doc, id: localId, server_id: doc.id };
        });
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
      if (this.isOnline && doc.remote_id) {
        try {
          await axios.delete(`${FILES_ENDPOINT}/${doc.remote_id}`, {
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
      return true;
    },

    /** Create a new folder */
    async makeFolder(folder: FileData): Promise<FileData | null> {
      folder.id = uuidv4();
      folder.is_folder = true;
      folder.last_viewed = new Date();

      if (this.isOnline) {
        try {
          const response = await axios.post(FILES_ENDPOINT, folder, {
            headers: { Authorization: `Bearer ${this.getToken()}` },
          });
          const saved = response.data.data as FileData;
          localStorage.setItem(`server_id_map_${saved.id}`, folder.id!);
          saved.id = folder.id;
          saved.remote_id = saved.id;
          this.saveToLocalCache(saved);
          this.updateFiles(saved);
          return saved;
        } catch (error) {
          console.error("Error creating folder on API:", error);
        }
      }

      // Save locally if offline
      folder.isDirty = true;
      this.saveToLocalCache(folder);
      this.updateFiles(folder);
      return folder;
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
  },
});
