import { defineStore } from "pinia";
import axios from "axios";
import { useAuthStore } from "./auth";
import type { DocumentFormat, LoadDocumentOptions, LoadDocumentResult, FileData } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_BLANK_DOCUMENT_TEMPLATE } from "@/assets/doc-data";
import { convertFileForEditor } from "@/utils/fileConverter";

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;
const FOLDERS_ENDPOINT = `${API_BASE_URI}/app-files/folders`;
const UPLOAD_BASE = `${API_BASE_URI}/app-files/upload`;
const UPLOAD_INIT = `${UPLOAD_BASE}/initiate`;
const UPLOAD_CHUNK = `${UPLOAD_BASE}/chunk`;
const UPLOAD_COMPLETE = `${UPLOAD_BASE}/complete`;

// Extract base URL for constructing full URLs from relative paths
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL || "http://localhost:8000";

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
    trashItems: [] as FileData[],
    isLoadingTrash: false,
    trashError: null as string | null,
  }),

  actions: {
    /** Normalize/derive file_type safely from API data */
    normalizeFileType(file_type?: any, file_name?: string | null): string | undefined {
      const raw = typeof file_type === 'string' ? file_type : (file_type?.toString?.() ?? '')
      let ft = (raw || '').trim().toLowerCase()
      if (!ft || ft === '0' || ft === 'null' || ft === 'undefined') {
        const ext = (file_name || '').split('.').pop()?.toLowerCase() || ''
        if (ext) {
          // Map common aliases
          if (['doc', 'docx'].includes(ext)) return 'docx'
          if (['xls', 'xlsx'].includes(ext)) return 'xlsx'
          if (['ppt', 'pptx'].includes(ext)) return 'pptx'
          return ext
        }
        return undefined
      }
      // Map numeric codes if any future variants appear
      if (ft === '1') return 'docx'
      if (ft === '2') return 'xlsx'
      if (ft === '3') return 'pptx'
      return ft
    },

    async ensureDocument(options: LoadDocumentOptions = {}): Promise<LoadDocumentResult<FileData>> {
      const {
        id,
        fileType,
        title,
        template,
        initialContent,
        createIfMissing = true,
      } = options;

      const effectiveType = fileType ?? template?.format ?? "docx";
      let document: FileData | null = null;
      let created = false;
      let markClean = false;

      if (id) {
        document = await this.loadDocument(id, effectiveType as string);
        if (document) {
          return {
            document,
            created: false,
            format: template?.format ?? this.inferDocumentFormat(document.file_type),
            markClean: true,
          };
        }
      }

      if (!createIfMissing) {
        return {
          document: null,
          created: false,
          format: template?.format ?? this.inferDocumentFormat(effectiveType),
        };
      }

      const resolvedTitle = title ?? template?.title ?? "New Document";
      const newDoc = await this.createNewDocument(effectiveType as string, resolvedTitle);
      document = newDoc;
      created = true;

      const templateContent = template?.content ?? initialContent;
      if (templateContent !== undefined) {
        // JSON-in-content policy: when template is tiptap, content contains JSON string
        const updatedDoc: FileData = {
          ...newDoc,
          title: resolvedTitle,
          content: templateContent as string,
        } as FileData;
        try {
          const result = await this.saveDocument(updatedDoc);
          document = result.document;
          markClean = true;
        } catch {
          document = updatedDoc;
          markClean = false;
        }
      }

      return {
        document,
        created,
        format: template?.format ?? this.inferDocumentFormat(document?.file_type ?? effectiveType),
        markClean,
      };
    },

    /** Ensure is_folder is a boolean and file_type is normalized */
    normalizeDocumentShape(doc: any): FileData {
      const normalizedType = this.normalizeFileType(doc?.file_type, doc?.file_name)
      const isFolder = !!doc?.is_folder
      const normalizedContent = this.normalizeContentPayload(doc?.content ?? doc?.contents, normalizedType)
      const publicUrlRaw = doc?.file_public_url || (doc as any)?.public_url
      const fileUrl = doc?.file_url ? this.constructFullUrl(doc.file_url) : undefined
      const publicUrl = publicUrlRaw ? this.constructFullUrl(publicUrlRaw) : undefined
      return {
        ...doc,
        id: doc.id,
        file_type: normalizedType,
        is_folder: isFolder,
        content: normalizedContent,
        file_url: fileUrl,
        file_public_url: publicUrl,
        title: this.computeTitle(doc),
      } as FileData
    },

    normalizeContentPayload(raw: unknown, fileType?: string | null): string {
      if (raw === undefined || raw === null || raw === '') {
        return this.getDefaultContent(fileType);
      }
      if (typeof raw === 'string') {
        return raw;
      }
      try {
        return JSON.stringify(raw);
      } catch {
        return this.getDefaultContent(fileType);
      }
    },
    inferDocumentFormat(fileType?: string | null): DocumentFormat {
      const normalized = (fileType || "").toString().trim().toLowerCase();
      if (["xlsx", "xls", "sheet", "spreadsheet"].includes(normalized)) return "univer";
      if (["html", "htm", "umodoc"].includes(normalized)) return "umodoc";
      return "tiptap";
    },
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
        } catch { }
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

      const PROXY_ORIGIN = SHARE_BASE_URL;

      // If it's already a full URL, return as is
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        try {
          const u = new URL(filePath)
          const isVenmailHost = /(^|\.)venmail\.io$/i.test(u.hostname)
          const isStoragePath = u.pathname.startsWith('/storage/')

          if (isStoragePath || isVenmailHost) {
            const encodedPath = encodeURI(u.pathname)
            return `${PROXY_ORIGIN}${encodedPath}${u.search}${u.hash}`
          }

          return filePath;
        } catch {
          return filePath;
        }
      }

      // Ensure relative storage paths are also served via proxy to avoid hotlinking/CORS issues
      const relativeIsStoragePath = filePath.startsWith('/storage/') || filePath.startsWith('storage/')
      if (relativeIsStoragePath) {
        const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`
        const encodedPath = encodeURI(normalized)
        return `${PROXY_ORIGIN}${encodedPath}`
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
      const publicUrlRaw = responseData.file_public_url || responseData.public_url
      const file: FileData = {
        id: responseData.id,
        title: responseData.title || responseData.file_name?.replace(/\.[^/.]+$/, "") || 'Untitled',
        file_name: responseData.file_name,
        file_type: this.normalizeFileType(responseData.file_type, responseData.file_name),
        file_size: responseData.file_size,
        file_url: this.constructFullUrl(responseData.file_url),
        file_public_url: publicUrlRaw ? this.constructFullUrl(publicUrlRaw) : undefined,
        folder_id: responseData.folder_id,
        is_folder: !!responseData.is_folder,
        is_template: responseData.is_template || false,
        employee_id: responseData.employee_id,
        content: responseData.content || responseData.contents || '',
        created_at: responseData.created_at,
        updated_at: responseData.updated_at,
        last_viewed: new Date(),
        isNew: false,
        isDirty: false,
        url: !!responseData.file_url, // Convert to boolean - true if URL exists
        thumbnail_url: responseData.thumbnail_url || undefined,
      };

      return file;
    },

    prepareTrashItem(raw: any): FileData {
      const normalized = this.normalizeDocumentShape(raw);
      normalized.title = this.computeTitle(raw);
      normalized.file_url = raw.file_url ? this.constructFullUrl(raw.file_url) : undefined;
      const publicUrlRaw = raw.file_public_url || (raw as any)?.public_url;
      normalized.file_public_url = publicUrlRaw ? this.constructFullUrl(publicUrlRaw) : undefined;
      normalized.file_size = raw.file_size;
      normalized.mime_type = raw.mime_type;
      normalized.source = raw.source;
      normalized.deleted_at = raw.deleted_at || raw.updated_at;
      normalized.created_at = raw.created_at;
      normalized.updated_at = raw.updated_at;
      normalized.url = !!raw.file_url;
      normalized.isNew = false;
      normalized.isDirty = false;
      return normalized;
    },

    /**
     * Convert an uploaded file (DOCX/XLSX) into app content usable by editors.
     * Fully client-side:
     *  - DOCX → HTML via Mammoth (mammoth.browser, exposed as window.mammoth)
     *  - XLSX → Univer workbook JSON via LuckyExcel (from @mertdeveci55/univer-import-export)
     *
     * The source binary is downloaded from the file's /download endpoint or a direct URL,
     * then parsed and saved back via saveToAPI. No backend /app-files/convert calls.
     */
    async convertUploadedFile(options: { appFileId?: string; url?: string; target?: 'docx' | 'xlsx' }): Promise<FileData | null> {
      // Helper: load binary as ArrayBuffer from id or URL
      const loadArrayBuffer = async (): Promise<{ buf: ArrayBuffer; meta?: FileData } | null> => {
        try {
          if (options.appFileId) {
            const meta = await this.loadFromAPI(options.appFileId);
            if (!meta) return null;
            const downloadUrl = `${FILES_ENDPOINT}/${meta.id}/download`;
            const buf = await axios.get(downloadUrl, {
              responseType: 'arraybuffer',
              headers: { Authorization: `Bearer ${this.getToken()}` },
            }).then(r => r.data as ArrayBuffer);
            return { buf, meta };
          }
          if (options.url) {
            const url = options.url;
            const config: any = { responseType: 'arraybuffer' as const };
            try {
              const token = this.getToken();
              const isAbsolute = /^https?:\/\//i.test(url);
              const apiDownloadPrefix = `${FILES_ENDPOINT}/`;
              const isApiDownload = isAbsolute && url.startsWith(apiDownloadPrefix);
              const isRelativeApiDownload = !isAbsolute && url.startsWith('/app-files/');
              // Only attach Authorization when calling the protected /app-files download endpoints,
              // never for public storage URLs like file_public_url to avoid unnecessary CORS preflights.
              if (token && (isApiDownload || isRelativeApiDownload)) {
                config.headers = { Authorization: `Bearer ${token}` };
              }
            } catch { }
            const buf = await axios.get(url, config).then(r => r.data as ArrayBuffer);
            return { buf };
          }
        } catch (e) {
          console.warn('Failed to load source binary for conversion', e);
        }
        return null;
      };

      // Client-side conversion
      try {
        const loaded = await loadArrayBuffer();
        if (loaded?.buf) {
          const meta = loaded.meta || (options.appFileId ? await this.loadFromAPI(options.appFileId) : null);
          const lowerName = (meta?.file_name || '').toLowerCase();
          const target = (options.target || (lowerName.endsWith('.docx') ? 'docx' : lowerName.endsWith('.xlsx') ? 'xlsx' : undefined)) as ('docx' | 'xlsx' | undefined);

          if (target === 'docx') {
            // @ts-ignore mammoth is loaded globally in main.ts
            const result = await (window as any).mammoth?.convertToHtml({ arrayBuffer: loaded.buf });
            const html: string = result?.value || '';
            if (html && (html.length > 0)) {
              const base: FileData = meta || ({
                id: options.appFileId,
                file_type: 'docx',
                file_name: 'document.docx',
                title: 'Document',
                is_folder: false,
              } as unknown as FileData);
              const saved = await this.saveToAPI({ ...base, content: html, file_type: 'docx', is_folder: false } as FileData);
              if (saved) return saved;
            }
          } else if (target === 'xlsx') {
            try {
              // Prefer community univer import-export package LuckyExcel for full-fidelity import
              // @ts-ignore - dynamic import; module may not exist until installed
              const impMod: any = await import(/* @vite-ignore */ '@mertdeveci55/univer-import-export').catch(() => null);
              if (impMod && impMod.LuckyExcel && typeof impMod.LuckyExcel.transformExcelToUniver === 'function') {
                const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                const blob = new Blob([loaded.buf], { type: mime });
                const name = (meta?.file_name && meta.file_name.toLowerCase().endsWith('.xlsx')) ? meta.file_name : (meta?.file_name || 'workbook.xlsx');
                const file = new File([blob], name, { type: mime });
                const workbookData: any = await new Promise((resolve, reject) => {
                  try {
                    impMod.LuckyExcel.transformExcelToUniver(
                      file,
                      (univerData: any) => resolve(univerData),
                      (error: any) => reject(error)
                    );
                  } catch (err) {
                    reject(err);
                  }
                });
                if (workbookData) {
                  if (!workbookData.id) workbookData.id = meta?.id || options.appFileId || (Math.random().toString(36).slice(2));
                  if (!workbookData.name) workbookData.name = meta?.title || 'Sheet';
                  const base: FileData = meta || ({
                    id: options.appFileId,
                    file_type: 'xlsx',
                    file_name: name,
                    title: workbookData.name,
                    is_folder: false,
                  } as unknown as FileData);
                  const saved = await this.saveToAPI({ ...base, content: JSON.stringify(workbookData), file_type: 'xlsx', is_folder: false } as FileData);
                  if (saved) return saved;
                }
              } else {
                throw new Error('univer-import-export (LuckyExcel) not available');
              }
            } catch (xlsxErr) {
              console.warn('Client-side XLSX conversion (LuckyExcel) failed:', xlsxErr);
            }
          }
        }
      } catch (clientErr) {
        console.warn('Client-side conversion failed:', clientErr);
      }
      return null;
    },

    async convertAttachmentClientSide(meta: FileData, ext: string): Promise<FileData | null> {
      if (!meta.id) {
        return null;
      }

      const normalizedExt = (ext || '').toLowerCase();
      const convertibleDocExts = ['docx', 'pdf', 'html', 'htm'];
      const convertibleSheetExts = ['xlsx', 'xls', 'csv'];

      if (!convertibleDocExts.includes(normalizedExt) && !convertibleSheetExts.includes(normalizedExt)) {
        return null;
      }

      try {
        const downloadUrl = `${FILES_ENDPOINT}/${meta.id}/download`;
        const buf = await axios.get(downloadUrl, {
          responseType: 'arraybuffer',
          headers: { Authorization: `Bearer ${this.getToken()}` },
        }).then(r => r.data as ArrayBuffer);

        let mime = 'application/octet-stream';
        if (normalizedExt === 'docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (normalizedExt === 'pdf') mime = 'application/pdf';
        else if (normalizedExt === 'html' || normalizedExt === 'htm') mime = 'text/html';
        else if (normalizedExt === 'xlsx') mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (normalizedExt === 'xls') mime = 'application/vnd.ms-excel';
        else if (normalizedExt === 'csv') mime = 'text/csv';

        const originalName = typeof meta.file_name === 'string' && meta.file_name.trim().length
          ? meta.file_name
          : (meta.title || `attachment.${normalizedExt || 'bin'}`);
        const baseTitle = originalName.replace(/\.[^/.]+$/, '') || 'Attachment';

        const blob = new Blob([buf], { type: mime });
        const browserFile = new File([blob], originalName, { type: mime });

        const conversion = await convertFileForEditor(browserFile);
        const targetType = conversion.fileType;

        let content: string;
        if (targetType === 'docx') {
          content = typeof conversion.content === 'string'
            ? conversion.content
            : JSON.stringify(conversion.content);
        } else {
          content = typeof conversion.content === 'string'
            ? conversion.content
            : JSON.stringify(conversion.content as any);
        }

        const payload: any = {
          title: baseTitle,
          file_name: `${baseTitle}.${targetType}`,
          file_type: targetType,
          is_folder: false,
          content,
          folder_id: meta.folder_id || null,
        };

        const saved = await this.saveToAPI(payload as FileData);
        return saved;
      } catch (e) {
        console.error('Client-side attachment conversion failed', e);
        return null;
      }
    },

    /** Simple upload (legacy). Prefer uploadChunked for large files. Optionally accepts folderId */
    async uploadFile(file: File, onProgress?: (progress: number) => void, folderId?: string | null): Promise<FileData | null> {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);

        const response = await axios.post(`${UPLOAD_BASE}`, formData, {
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

          // Post-upload conversion for docx/xlsx
          const ext = (uploadedFile.file_type || (uploadedFile.file_name || '').split('.').pop() || '').toLowerCase();
          if (['docx', 'xlsx'].includes(ext) && uploadedFile.id) {
            try {
              const converted = await this.convertUploadedFile({ appFileId: uploadedFile.id, target: ext as any });
              if (converted) return converted;
            } catch { }
          }
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

    /** Chunked upload flow compatible with backend endpoints. Pass folderId and privacy if needed. */
    async uploadChunked(file: File, opts?: { folderId?: string | null; privacy_type?: number; onProgress?: (p: number) => void }): Promise<FileData | null> {
      const filename = file.name;
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE) || 1;
      try {
        // 1) initiate
        const initRes = await axios.post(UPLOAD_INIT, {
          filename,
          total_size: file.size,
          total_chunks: totalChunks,
          folder_id: opts?.folderId || null,
          privacy_type: opts?.privacy_type || undefined,
        }, {
          headers: { Authorization: `Bearer ${this.getToken()}` }
        });
        const upload_id = initRes.data?.data?.upload_id;
        if (!upload_id) throw new Error('Failed to initiate upload');

        // 2) upload chunks
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const blob = file.slice(start, end);
          const fd = new FormData();
          fd.append('upload_id', upload_id);
          fd.append('index', String(i));
          fd.append('chunk', new File([blob], `${filename}.part`));
          await axios.post(UPLOAD_CHUNK, fd, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${this.getToken()}`
            }
          });
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          opts?.onProgress?.(progress);
        }

        // 3) complete
        const completeRes = await axios.post(UPLOAD_COMPLETE, { upload_id }, {
          headers: { Authorization: `Bearer ${this.getToken()}` }
        });
        const saved = this.processUploadedFile(completeRes.data.data);
        this.addFile(saved);
        // Post-upload conversion for docx/xlsx
        const ext = (saved.file_type || (saved.file_name || '').split('.').pop() || '').toLowerCase();
        if (['docx', 'xlsx'].includes(ext) && saved.id) {
          try {
            const converted = await this.convertUploadedFile({ appFileId: saved.id, target: ext as any });
            if (converted) return converted;
          } catch { }
        }
        return saved;
      } catch (e) {
        console.error('Chunked upload failed', e);
        this.lastError = 'Failed to upload file';
        throw e;
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

    async fetchTrashItems(force = false): Promise<FileData[]> {
      if (!force && this.trashItems.length && !this.trashError) {
        return this.trashItems;
      }
      try {
        this.isLoadingTrash = true;
        this.trashError = null;
        const response = await axios.get(`${FILES_ENDPOINT}/trash`, {
          headers: { Authorization: `Bearer ${this.getToken()}` }
        });
        const items = (response.data?.data || []).map((item: any) => this.prepareTrashItem(item));
        this.trashItems = items;
        return items;
      } catch (error: any) {
        const message = error?.response?.data?.message || error?.message || 'Failed to load trash items';
        this.trashError = message;
        throw new Error(message);
      } finally {
        this.isLoadingTrash = false;
      }
    },

    async restoreFromTrash(id: string): Promise<FileData | null> {
      try {
        const response = await axios.patch(`${FILES_ENDPOINT}/${id}/restore`, {}, {
          headers: { Authorization: `Bearer ${this.getToken()}` }
        });
        const data = response.data?.data;
        this.trashItems = this.trashItems.filter(item => item.id !== id);
        if (data?.id) {
          const restored = this.prepareTrashItem(data);
          restored.content = data.content || data.contents || this.getDefaultContent(restored.file_type);
          this.cacheDocument(restored);
          this.updateFiles(restored);
          return restored;
        }
        return null;
      } catch (error) {
        throw error;
      }
    },

    async deleteFromTrash(id: string): Promise<boolean> {
      try {
        await axios.delete(`${FILES_ENDPOINT}/${id}`, {
          headers: { Authorization: `Bearer ${this.getToken()}` }
        });
        this.trashItems = this.trashItems.filter(item => item.id !== id);
        this.cachedDocuments.delete(id);
        this.pendingChanges.delete(id);
        this.syncStatus.delete(id);
        this.allFiles = this.allFiles.filter(f => f.id !== id);
        this.recentFiles = this.recentFiles.filter(f => f.id !== id);
        return true;
      } catch (error) {
        throw error;
      }
    },

    async restoreMany(ids: string[], destinationFolderId?: string | null): Promise<{ restored: FileData[]; failed: { id: string; message: string }[] }> {
      try {
        const payload: any = { ids };
        if (destinationFolderId) {
          payload.destination_folder_id = destinationFolderId;
        }

        const response = await axios.patch(`${FILES_ENDPOINT}/restore/bulk`, payload, {
          headers: { Authorization: `Bearer ${this.getToken()}` }
        });

        const data = response.data?.data;
        const succeeded = (data?.succeeded || []).map((item: any) => this.prepareTrashItem(item));
        const failed = (data?.failed || []).map((f: any) => ({ id: f.id, message: f.message }));

        // Update local state
        succeeded.forEach((file: FileData) => {
          this.trashItems = this.trashItems.filter(item => item.id !== file.id);
          this.cacheDocument(file);
          this.updateFiles(file);
        });

        return { restored: succeeded, failed };
      } catch (error: any) {
        const message = error?.response?.data?.message || 'Bulk restore failed';
        throw new Error(message);
      }
    },

    async deleteMany(ids: string[]): Promise<{ deleted: string[]; failed: { id: string; error: any }[] }> {
      const results = await Promise.allSettled(ids.map(id => this.deleteFromTrash(id)));
      const deleted: string[] = [];
      const failed: { id: string; error: any }[] = [];
      results.forEach((result, index) => {
        const id = ids[index];
        if (result.status === 'fulfilled') {
          deleted.push(id);
        } else {
          failed.push({ id, error: result.reason });
        }
      });
      return { deleted, failed };
    },

    async emptyTrash(): Promise<{ deleted: string[]; failed: { id: string; error: any }[] }> {
      const ids = this.trashItems.map(item => item.id).filter((id): id is string => !!id);
      if (!ids.length) {
        return { deleted: [], failed: [] };
      }
      return this.deleteMany(ids);
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

    /** Get version history for a file */
    async listVersions(fileId: string): Promise<{
      app_file_id: string;
      app_file_title: string;
      current_version: {
        file_size: number;
        updated_at: string;
        updated_at_human: string;
      };
      versions: Array<{
        id: string;
        version_number: number;
        file_size: number;
        file_name: string;
        mime_type: string;
        change_note: string;
        created_at: string;
        created_at_human: string;
        employee_id: string;
      }>;
      total_versions: number;
    } | null> {
      if (!fileId) return null;

      try {
        const response = await axios.get(`${FILES_ENDPOINT}/${fileId}/versions`, {
          headers: { Authorization: `Bearer ${this.getToken()}` }
        });

        if (response.status === 200) {
          return response.data.data;
        }

        return null;
      } catch (error) {
        console.error('Error fetching version history:', error);
        return null;
      }
    },

    /** Get a specific version of a file */
    async getVersion(fileId: string, versionNumber: number): Promise<{
      id: string;
      app_file_id: string;
      version_number: number;
      file_size: number;
      file_name: string;
      file_url: string;
      mime_type: string;
      change_note: string;
      created_at: string;
      created_at_human: string;
      employee_id: string;
      content: string;
    } | null> {
      if (!fileId || !versionNumber) return null;

      try {
        const response = await axios.get(`${FILES_ENDPOINT}/${fileId}/versions/${versionNumber}`, {
          headers: { Authorization: `Bearer ${this.getToken()}` }
        });

        if (response.status === 200) {
          return response.data.data;
        }

        return null;
      } catch (error) {
        console.error('Error fetching version:', error);
        return null;
      }
    },

    /** Clear all files state and offline caches (used during logout) */
    clearAll() {
      try {
        this.allFiles = [] as FileData[];
        this.recentFiles = [] as FileData[];
        this.cachedDocuments.clear();
        this.pendingChanges.clear();
        this.syncStatus.clear();
        this.isSyncing = false;
        this.lastError = null;
        // Remove offline caches and recent list
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.startsWith('document_') || k.startsWith('sheet_') || k.startsWith('file_') || k === 'VENX_RECENT') {
            try { localStorage.removeItem(k); } catch { }
          }
        }
      } catch (e) {
        console.warn('files.clearAll failed:', e);
      }
    },

    /** Create a new document - tries online first, falls back to local */
    async createNewDocument(fileType: string = "docx", title: string = "Untitled"): Promise<FileData> {
      // Use proper default content based on file type
      const defaultContent = fileType === "docx" ? DEFAULT_BLANK_DOCUMENT_TEMPLATE : "";
      const auth = useAuthStore();

      const newDoc = {
        title,
        file_name: `${title}.${fileType}`,
        file_type: fileType,
        is_folder: false, // Explicitly ensure it's not a folder
        content: defaultContent,
        last_viewed: new Date(),
        employee_id: auth?.employeeId || undefined,
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
        url: false,
        thumbnail_url: undefined,
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
        const payload = { ...document } as any;
        // Ensure ownership set if available
        try {
          const auth = useAuthStore();
          if (!payload.employee_id && auth?.employeeId) {
            payload.employee_id = auth.employeeId;
          }
        } catch { }

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
          const savedDoc: FileData = this.normalizeDocumentShape({
            ...serverData,
            file_type: document.file_type || serverData.file_type,
            is_folder: document.is_folder ?? serverData.is_folder ?? false,
          });
          savedDoc.isNew = false;
          savedDoc.isDirty = false;

          // Persist refreshed version locally so offline cache always has latest server ID
          this.saveToLocalCache(savedDoc);
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
        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        // For guests (no token), allow backend to evaluate link/member access using email query param
        let url = `${FILES_ENDPOINT}/${id}`
        if (!token) {
          try {
            const params = new URLSearchParams(window.location.search)
            const email = params.get('email')
            if (email) {
              url += `?email=${encodeURIComponent(email)}`
            }
          } catch {}
        }
        const response = await axios.get(url, {
          headers,
        });
        const data = response.data.data;
        const doc = this.normalizeDocumentShape(data);
        doc.file_url = data.file_url ? this.constructFullUrl(data.file_url) : doc.file_url;
        const publicUrlRaw = data.file_public_url || (data as any)?.public_url;
        doc.file_public_url = publicUrlRaw ? this.constructFullUrl(publicUrlRaw) : doc.file_public_url;
        doc.isNew = false;
        doc.isDirty = false;
        // Attach large-file hints for front-end handling without breaking types
        (doc as any).is_large = !!data.is_large;
        if ((data as any).file_url) {
          (doc as any).download_url = `${FILES_ENDPOINT}/${data.id}/download`;
        }

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
        if (!fileId) throw new Error('Invalid file id');
        // Call backend move endpoint
        await axios.patch(`${FILES_ENDPOINT}/${fileId}/move`, {
          destination_folder_id: newFolderId || null,
        }, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });

        // Update local state
        const idx = this.allFiles.findIndex(f => f.id === fileId);
        if (idx !== -1) {
          this.allFiles[idx] = { ...this.allFiles[idx], folder_id: newFolderId } as FileData;
        }
        const cached = this.cachedDocuments.get(fileId)?.data;
        if (cached) {
          cached.folder_id = newFolderId as any;
          this.cacheDocument(cached);
        }
        return true;
      } catch (error) {
        console.error('Error moving file:', error);
        this.lastError = 'Failed to move item';
        return false;
      }
    },

    async renameItem(fileId: string, name: string): Promise<FileData | null> {
      try {
        const res = await axios.patch(`${FILES_ENDPOINT}/${fileId}/rename`, { name }, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const data = res.data?.data;
        if (!data) return null;
        const updated = this.normalizeDocumentShape({ ...data });
        updated.title = this.computeTitle(data);
        // Update state
        this.updateFiles(updated);
        this.cacheDocument(updated);
        return updated;
      } catch (e) {
        console.error('Error renaming item:', e);
        this.lastError = 'Failed to rename item';
        return null;
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

    /** Load documents from API, optionally scoped to folder */
    async loadDocuments(doNotMutateStore: boolean = false, folderId?: string | null): Promise<FileData[]> {
      try {
        const params: Record<string, string> = {};
        if (folderId) {
          params.folder_id = folderId;
        }
        const response = await axios.get(FILES_ENDPOINT, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
          params,
        });
        const docs = response.data.data as FileData[];
        const processedDocs = docs.map((doc) => {
          const normalized = this.normalizeDocumentShape(doc)
          normalized.file_url = doc.file_url ? this.constructFullUrl(doc.file_url) : undefined
          normalized.file_public_url = doc.file_public_url ? this.constructFullUrl(doc.file_public_url) : undefined
          normalized.isNew = false
          normalized.isDirty = false
          return normalized
        });

        // Optionally update store with processed documents
        if (!doNotMutateStore) {
          this.allFiles = processedDocs;
        }
        // After fetching server files, reconcile any offline-local files not present on server
        try {
          const serverIds = processedDocs.map(d => d.id!).filter((id): id is string => typeof id === 'string' && id.length > 0);
          await this.reconcileOfflineDocuments(serverIds);
        } catch { }
        return processedDocs;
      } catch (error: any) {
        console.error("Error loading documents:", error);

        // If authentication failed, do not silently fall back to offline mode.
        // Let the global axios auth interceptor trigger a logout + re-login flow instead.
        const status = error?.response?.status ?? error?.status;
        if (status === 401 || status === 403) {
          this.lastError = "Authentication required";
          throw error;
        }

        this.lastError = "Failed to load documents";

        // Load offline documents if online fetch fails
        const offlineDocs = this.loadOfflineDocuments();
        this.allFiles = offlineDocs;
        return offlineDocs;
      }
    },

    /** Navigate into a folder - simplified to just load documents */
    async openFolder(folderId: string | null) {
      await this.loadDocuments(false, folderId);
    },

    /** Reconcile offline local documents: push any local-only docs to server and replace IDs */
    async reconcileOfflineDocuments(serverIds: string[]): Promise<void> {
      try {
        const offlineDocs = this.loadOfflineDocuments();
        const serverIdSet = new Set(serverIds);
        const auth = useAuthStore();
        const currentEmployee = auth?.employeeId || '';
        for (const doc of offlineDocs) {
          // If this is a purely local document (UUID) or missing on server, try to push it
          const isLocal = this.isLocalDocument(doc.id!);
          const missingOnServer = !serverIdSet.has(doc.id!);
          const ownedByUser = !doc.employee_id || doc.employee_id === currentEmployee;
          if ((isLocal || missingOnServer) && ownedByUser) {
            // Ensure employee_id ownership when pushing
            if (!doc.employee_id && currentEmployee) {
              doc.employee_id = currentEmployee as any;
            }
            const saved = await this.saveToAPI(doc);
            if (saved && saved.id !== doc.id) {
              // Clean up the old local id cache and state
              this.deleteLocalDocument(doc.id!);
              // New saved doc already persisted by saveToAPI via saveToLocalCache/updateFiles
            }
          }
        }
      } catch (e) {
        console.warn('Reconcile offline documents failed:', e);
      }
    },

    createLocalId(): string {
      return uuidv4();
    },


    /** Load trashed documents from API */
    async loadTrashedDocuments(): Promise<FileData[]> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}/trash`, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });

        const docs = response.data.data as FileData[];
        const processedDocs = docs.map((doc) => {
          const normalized = this.normalizeDocumentShape(doc);
          normalized.file_url = doc.file_url ? this.constructFullUrl(doc.file_url) : undefined;
          normalized.isNew = false;
          normalized.isDirty = false;
          return normalized;
        });

        return processedDocs;
      } catch (error) {
        console.error("Error loading trashed documents:", error);
        this.lastError = "Failed to load trashed documents";
        return [];
      }
    },

    /** Restore a file from trash */
    async restoreFile(id: string): Promise<boolean> {
      try {
        const response = await axios.post(
          `${FILES_ENDPOINT}/${id}/restore`,
          {},
          {
            headers: { Authorization: `Bearer ${this.getToken()}` },
          }
        );

        if (response.status === 200 || response.status === 201) {
          // Update local state if the file exists in allFiles
          const fileIndex = this.allFiles.findIndex((f) => f.id === id);
          if (fileIndex !== -1) {
            const restoredFile = response.data.data;
            this.allFiles[fileIndex] = {
              ...this.allFiles[fileIndex],
              ...restoredFile,
            };
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error restoring file:", error);
        this.lastError = "Failed to restore file";
        return false;
      }
    },

    /** Permanently delete a file */
    async permanentDeleteFile(id: string): Promise<boolean> {
      try {
        const response = await axios.delete(`${FILES_ENDPOINT}/${id}/permanent`, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });

        if (response.status === 200 || response.status === 204) {
          // Remove from local state
          this.allFiles = this.allFiles.filter((f) => f.id !== id);
          this.recentFiles = this.recentFiles.filter((f) => f.id !== id);
          this.cachedDocuments.delete(id);
          this.pendingChanges.delete(id);
          this.syncStatus.delete(id);

          // Remove from localStorage
          const prefixes = ["document", "sheet", "file"];
          prefixes.forEach(prefix => {
            const key = `${prefix}_${id}`;
            localStorage.removeItem(key);
          });

          return true;
        }
        return false;
      } catch (error) {
        console.error("Error permanently deleting file:", error);
        this.lastError = "Failed to permanently delete file";
        return false;
      }
    },

    /** Fetch files within a specific folder */
    async fetchFiles(folderId: string): Promise<FileData[]> {
      try {
        const response = await axios.get(`${FILES_ENDPOINT}?folder_id=${folderId}`, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const docs = response.data.data as FileData[];
        const processedDocs = docs.map((doc) => {
          const normalized = this.normalizeDocumentShape(doc)
          normalized.file_url = doc.file_url ? this.constructFullUrl(doc.file_url) : undefined
          normalized.isNew = false
          normalized.isDirty = false
          return normalized
        });

        return processedDocs;
      } catch (error) {
        console.error("Error fetching files:", error);
        this.lastError = "Failed to fetch files";
        return [];
      }
    },

    async moveToTrash(id: string): Promise<boolean> {
      try {
        const response = await axios.patch(`${FILES_ENDPOINT}/${id}/trash`, {}, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        if (response.status === 200 || response.status === 201) {
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error moving to trash:", error);
        this.lastError = "Failed to move to trash";
        return false;
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
      // Ensure folder shape
      folder.is_folder = true;
      folder.last_viewed = new Date();

      if (this.isOnline) {
        try {
          // API expects { name, parent_id }
          const payload = {
            name: folder.title || folder.file_name || 'New Folder',
            parent_id: folder.folder_id || null,
            privacy_type: (folder as any).privacy_type || undefined,
          };
          const response = await axios.post(FOLDERS_ENDPOINT, payload, {
            headers: { Authorization: `Bearer ${this.getToken()}` },
          });
          const saved = response.data.data as FileData;
          const serverFolder: FileData = this.normalizeDocumentShape({
            ...saved,
            is_folder: true,
          });
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
        const raw = response.data?.data ?? response.data;
        console.log("Imported attachment:", raw);

        if (!raw) {
          return null;
        }

        const normalized = this.normalizeDocumentShape(raw);
        normalized.last_viewed = new Date();

        const ext = this.normalizeFileType(normalized.file_type, normalized.file_name);
        const normalizedExt = (ext || '').toLowerCase();
        const convertibleDocExts = ['docx', 'pdf', 'html', 'htm'];
        const convertibleSheetExts = ['xlsx', 'xls', 'csv'];
        const isConvertible = !!normalizedExt && (convertibleDocExts.includes(normalizedExt) || convertibleSheetExts.includes(normalizedExt));

        if (isConvertible && normalized.id) {
          const clientConverted = await this.convertAttachmentClientSide(normalized, normalizedExt);
          if (clientConverted) {
            return clientConverted;
          }

          if (['docx', 'xlsx'].includes(normalizedExt)) {
            try {
              const target = normalizedExt as "docx" | "xlsx";
              const convRes = await axios.post(
                `${FILES_ENDPOINT}/convert`,
                {
                  app_file_id: normalized.id,
                  target,
                },
                {
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.getToken()}`,
                  },
                },
              );

              const convRaw = convRes.data?.data ?? convRes.data;
              if (convRaw) {
                const convNormalized = this.normalizeDocumentShape(convRaw);
                convNormalized.last_viewed = new Date();
                this.saveToLocalCache(convNormalized);
                this.updateFiles(convNormalized);
                return convNormalized;
              }
            } catch (e) {
              console.error("Server-side attachment conversion failed", e);
            }
          }
        }

        this.saveToLocalCache(normalized);
        this.updateFiles(normalized);
        return normalized;
      } catch (error) {
        console.error("Error importing attachment:", error);
        this.lastError = "Failed to import attachment";
        return null;
      }
    },

    /** Initialize sync handlers */
    async initialize() {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.syncPendingChanges();
      });
      window.addEventListener("offline", () => (this.isOnline = false));
      setInterval(() => this.isOnline && this.syncPendingChanges(), SYNC_INTERVAL);
    },

    /** Load only media files */
    async loadMediaFiles(folderId?: string | null): Promise<FileData[]> {
      try {
        const docs = await this.loadDocuments(false, folderId ?? null);
        const mediaFiles = docs.filter((doc) => this.isMediaFile(doc));
        return mediaFiles;
      } catch (error) {
        console.error("Error loading media files:", error);
        this.lastError = "Failed to load media files";
        return this.allFiles.filter((file) => this.isMediaFile(file));
      }
    },
  },
});


