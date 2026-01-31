import { useFileStore } from '@/store/files';
import { useAuthStore } from '@/store/auth';
import type { FileData } from '@/types';

/**
 * Ensures the slides-media folder exists for the authenticated user
 * Returns the folder ID if successful, null otherwise
 */
export async function ensureSlidesMediaFolder(): Promise<string | null> {
  const fileStore = useFileStore();
  const authStore = useAuthStore();

  if (!authStore.isAuthenticated || !authStore.userId) {
    console.error('User not authenticated');
    return null;
  }

  try {
    // Check if slides-media folder already exists in root
    // Note: fetchFiles expects a folderId, null for root
    const existingFiles = await fileStore.fetchFiles(null as any);
    const slidesMediaFolder = existingFiles.find(file => 
      file.is_folder && 
      file.title === 'slides-media' && 
      !file.folder_id // Root level folder
    );

    if (slidesMediaFolder && slidesMediaFolder.id) {
      console.log('slides-media folder already exists:', slidesMediaFolder.id);
      return slidesMediaFolder.id;
    }

    // Create the slides-media folder
    const newFolder = await fileStore.makeFolder({
      title: 'slides-media',
      file_name: 'slides-media',
      is_folder: true,
      folder_id: null, // Root level
      file_type: 'folder'
    } as FileData);

    if (newFolder && newFolder.id) {
      console.log('Created slides-media folder:', newFolder.id);
      return newFolder.id;
    }

    console.error('Failed to create slides-media folder');
    return null;
  } catch (error) {
    console.error('Error ensuring slides-media folder:', error);
    // Fallback: try to create folder directly if check fails
    try {
      const newFolder = await fileStore.makeFolder({
        title: 'slides-media',
        file_name: 'slides-media',
        is_folder: true,
        folder_id: null,
        file_type: 'folder'
      } as FileData);
      
      if (newFolder && newFolder.id) {
        console.log('Created slides-media folder (fallback):', newFolder.id);
        return newFolder.id;
      }
    } catch (fallbackError) {
      console.error('Fallback folder creation also failed:', fallbackError);
    }
    return null;
  }
}

/**
 * Upload an image to the slides-media folder
 * Returns the uploaded file data if successful, null otherwise
 */
export async function uploadImageToSlidesMedia(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<FileData | null> {
  const fileStore = useFileStore();

  // Ensure the file is an image
  if (!file.type.startsWith('image/')) {
    console.error('File is not an image:', file.type);
    return null;
  }

  try {
    // Ensure slides-media folder exists
    const folderId = await ensureSlidesMediaFolder();
    if (!folderId) {
      console.error('Failed to ensure slides-media folder exists');
      return null;
    }

    // Upload the image to the slides-media folder
    const uploadedFile = await fileStore.uploadChunked(file, {
      folderId,
      onProgress
    });

    if (uploadedFile) {
      console.log('Successfully uploaded image:', uploadedFile.file_public_url);
      return uploadedFile;
    }

    console.error('Failed to upload image');
    return null;
  } catch (error) {
    console.error('Error uploading image to slides-media:', error);
    return null;
  }
}

/**
 * Generate markdown image syntax from uploaded file
 */
export function generateImageMarkdown(uploadedFile: FileData, altText?: string): string {
  const imageUrl = uploadedFile.file_public_url || uploadedFile.file_url;
  const alt = altText || uploadedFile.title || 'Image';
  
  if (!imageUrl) {
    console.error('No URL available for uploaded image');
    return '';
  }

  return `\n![${alt}](${imageUrl})\n`;
}
