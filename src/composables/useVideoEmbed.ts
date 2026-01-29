import { ref, computed, nextTick } from 'vue';

export interface VideoConfig {
  type: 'youtube' | 'vimeo' | 'mp4' | 'webm';
  id?: string;
  url?: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  startTime?: number;
  endTime?: number;
}

/**
 * Parse YouTube URL and extract video ID
 */
function parseYouTubeUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Parse Vimeo URL and extract video ID
 */
function parseVimeoUrl(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Generate YouTube embed HTML
 */
function generateYouTubeEmbed(config: VideoConfig): string {
  const videoId = config.id || (config.url ? parseYouTubeUrl(config.url) : null);
  if (!videoId) return '';

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    ...(config.autoplay && { autoplay: '1', mute: '1' }),
    ...(config.startTime && { start: config.startTime.toString() }),
    ...(config.endTime && { end: config.endTime.toString() })
  });

  const width = config.width || 560;
  const height = config.height || 315;
  const src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

  return `<div class="video-embed youtube-embed" data-video-type="youtube" data-video-id="${videoId}">
    <iframe 
      src="${src}" 
      width="${width}" 
      height="${height}" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen
      ${config.muted ? 'muted' : ''}
      ${config.loop ? 'loop' : ''}
      ${!config.controls ? 'controls="0"' : ''}
    ></iframe>
  </div>`;
}

/**
 * Generate Vimeo embed HTML
 */
function generateVimeoEmbed(config: VideoConfig): string {
  const videoId = config.id || (config.url ? parseVimeoUrl(config.url) : null);
  if (!videoId) return '';

  const params = new URLSearchParams({
    ...(config.autoplay && { autoplay: '1', muted: '1' }),
    ...(config.loop && { loop: '1' }),
    ...(config.startTime && { t: config.startTime.toString() })
  });

  const width = config.width || 640;
  const height = config.height || 360;
  const src = `https://player.vimeo.com/video/${videoId}?${params.toString()}`;

  return `<div class="video-embed vimeo-embed" data-video-type="vimeo" data-video-id="${videoId}">
    <iframe 
      src="${src}" 
      width="${width}" 
      height="${height}" 
      frameborder="0" 
      allow="autoplay; fullscreen; picture-in-picture" 
      allowfullscreen
      ${config.muted ? 'muted' : ''}
      ${!config.controls ? 'controls="0"' : ''}
    ></iframe>
  </div>`;
}

/**
 * Generate HTML5 video embed
 */
function generateHTML5Video(config: VideoConfig): string {
  if (!config.url) return '';

  const width = config.width || 640;
  const height = config.height || 360;

  return `<div class="video-embed html5-video" data-video-type="html5">
    <video 
      width="${width}" 
      height="${height}"
      ${config.autoplay ? 'autoplay' : ''}
      ${config.muted ? 'muted' : ''}
      ${config.loop ? 'loop' : ''}
      ${config.controls ? 'controls' : ''}
      ${config.startTime ? `#t=${config.startTime}` : ''}
    >
      <source src="${config.url}" type="${config.type === 'webm' ? 'video/webm' : 'video/mp4'}">
      Your browser does not support the video tag.
    </video>
  </div>`;
}

/**
 * Parse video markdown syntax
 * Examples:
 * @[youtube](dQw4w9WgXcQ)
 * @[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
 * @[vimeo](123456789)
 * @[video](https://example.com/video.mp4)
 */
export function parseVideoMarkdown(markdown: string): string {
  // YouTube patterns
  markdown = markdown.replace(
    /@\[youtube\]\(([^)]+)\)/g,
    (_, content) => {
      const config: VideoConfig = { type: 'youtube' };
      if (content.includes('youtube.com') || content.includes('youtu.be')) {
        config.url = content;
      } else {
        config.id = content;
      }
      return generateYouTubeEmbed(config);
    }
  );

  // Vimeo patterns
  markdown = markdown.replace(
    /@\[vimeo\]\(([^)]+)\)/g,
    (_, content) => {
      const config: VideoConfig = { type: 'vimeo' };
      if (content.includes('vimeo.com')) {
        config.url = content;
      } else {
        config.id = content;
      }
      return generateVimeoEmbed(config);
    }
  );

  // HTML5 video patterns
  markdown = markdown.replace(
    /@\[video\]\(([^)]+)\)/g,
    (_, content) => {
      const config: VideoConfig = { 
        type: content.endsWith('.webm') ? 'webm' : 'mp4',
        url: content
      };
      return generateHTML5Video(config);
    }
  );

  return markdown;
}

export function useVideoEmbed() {
  const isEmbedding = ref(false);
  const embedError = ref<string | null>(null);

  /**
   * Initialize video embeds in a container
   */
  async function initializeVideoEmbeds(container: HTMLElement): Promise<void> {
    isEmbedding.value = true;
    embedError.value = null;

    try {
      await nextTick();
      
      // Find all video embed containers
      const videoContainers = container.querySelectorAll('.video-embed');
      
      videoContainers.forEach(container => {
        const iframe = container.querySelector('iframe');
        const video = container.querySelector('video');
        
        if (iframe) {
          // Add load event listener for iframes
          iframe.addEventListener('load', () => {
            container.classList.add('video-loaded');
          });
          
          iframe.addEventListener('error', () => {
            container.classList.add('video-error');
            embedError.value = 'Failed to load video';
          });
        }
        
        if (video) {
          // Add event listeners for HTML5 videos
          video.addEventListener('loadeddata', () => {
            container.classList.add('video-loaded');
          });
          
          video.addEventListener('error', () => {
            container.classList.add('video-error');
            embedError.value = 'Failed to load video';
          });
        }
      });
    } catch (error) {
      console.error('Error initializing video embeds:', error);
      embedError.value = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      isEmbedding.value = false;
    }
  }

  return {
    // State
    isEmbedding: computed(() => isEmbedding.value),
    embedError: computed(() => embedError.value),
    
    // Methods
    initializeVideoEmbeds,
    generateYouTubeEmbed,
    generateVimeoEmbed,
    generateHTML5Video,
    parseYouTubeUrl,
    parseVimeoUrl
  };
}
