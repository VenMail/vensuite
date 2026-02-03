/**
 * Migration utilities for Venmail motion metadata
 * Helps upgrade existing slides to use new motion frontmatter structure
 */

import { type SlidevSlide } from './slidevMarkdown';

export interface MigrationResult {
  slides: SlidevSlide[];
  migrated: number;
  skipped: number;
  errors: string[];
}

/**
 * Migrate slides from legacy transition to motion.frontmatter structure
 */
export function migrateLegacyTransitions(slides: SlidevSlide[]): MigrationResult {
  const result: MigrationResult = {
    slides: [...slides],
    migrated: 0,
    skipped: 0,
    errors: []
  };

  try {
    result.slides = slides.map((slide) => {
      const newSlide = { ...slide };
      const frontmatter = newSlide.frontmatter || {};

      // Skip if already has motion structure
      if (frontmatter.motion && typeof frontmatter.motion === 'object') {
        result.skipped++;
        return newSlide;
      }

      // Migrate legacy transition to motion.slideVariant
      if (frontmatter.transition) {
        const transition = frontmatter.transition;
        
        // Map legacy transition names to motion variants
        const variantMap: Record<string, string> = {
          'slide-left': 'slideLeft',
          'slide-right': 'slideRight',
          'slide-up': 'slideUp',
          'slide-down': 'slideDown',
          'fade': 'fade',
          'venmail-3d': 'venmail3d',
          'venmail3d': 'venmail3d'
        };

        const motionVariant = variantMap[transition] || transition;
        
        // Create motion object
        newSlide.frontmatter = {
          ...frontmatter,
          motion: {
            slideVariant: motionVariant,
            contentVariant: 'default'
          }
        };

        // Remove legacy transition to avoid duplication
        delete newSlide.frontmatter.transition;
        
        result.migrated++;
      } else {
        // No transition to migrate, add default motion structure
        newSlide.frontmatter = {
          ...frontmatter,
          motion: {
            slideVariant: 'venmail3d',
            contentVariant: 'default'
          }
        };
        result.skipped++;
      }

      return newSlide;
    });
  } catch (error) {
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Migrate slides to include Venmail theme defaults
 */
export function migrateToVenmailTheme(slides: SlidevSlide[]): MigrationResult {
  const result: MigrationResult = {
    slides: [...slides],
    migrated: 0,
    skipped: 0,
    errors: []
  };

  try {
    result.slides = slides.map((slide) => {
      const newSlide = { ...slide };
      const frontmatter = newSlide.frontmatter || {};

      // Skip if already has Venmail theme
      if (frontmatter.theme === 'venmail-pitch') {
        result.skipped++;
        return newSlide;
      }

      // Apply Venmail theme to cover-like slides
      const isCoverSlide = frontmatter.layout === 'cover' || 
                           (slide.content && slide.content.match(/^#\s+.*$/m) && slide.content.split('\n').length <= 3);

      if (isCoverSlide) {
        newSlide.frontmatter = {
          ...frontmatter,
          theme: 'venmail-pitch',
          motion: {
            ...frontmatter.motion,
            slideVariant: 'venmail3d',
            contentVariant: 'default'
          }
        };
        result.migrated++;
      } else {
        result.skipped++;
      }

      return newSlide;
    });
  } catch (error) {
    result.errors.push(`Theme migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Generate motion metadata from markdown content analysis
 */
export function inferMotionFromContent(slides: SlidevSlide[]): MigrationResult {
  const result: MigrationResult = {
    slides: [...slides],
    migrated: 0,
    skipped: 0,
    errors: []
  };

  try {
    result.slides = slides.map((slide) => {
      const newSlide = { ...slide };
      const frontmatter = newSlide.frontmatter || {};

      // Skip if already has motion
      if (frontmatter.motion) {
        result.skipped++;
        return newSlide;
      }

      const content = slide.content || '';
      let slideVariant = 'venmail3d';
      let contentVariant = 'default';

      // Infer slide variant from content
      if (content.includes('---') || content.includes('section')) {
        slideVariant = 'slideLeft';
      } else if (content.match(/^#\s+.*$/m) && content.includes('![')) {
        slideVariant = 'fade';
      } else if (content.includes('```') || content.includes('|')) {
        slideVariant = 'slideLeft';
      }

      // Infer content variant from structure
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length > 5) {
        contentVariant = 'staggered';
      } else if (lines.some(line => line.match(/^\s*[-*+]\s/))) {
        contentVariant = 'staggered';
      }

      newSlide.frontmatter = {
        ...frontmatter,
        motion: {
          slideVariant,
          contentVariant
        }
      };

      result.migrated++;
      return newSlide;
    });
  } catch (error) {
    result.errors.push(`Content inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Run all migrations in sequence
 */
export function runAllMigrations(slides: SlidevSlide[]): MigrationResult {
  let currentSlides = [...slides];
  const finalResult: MigrationResult = {
    slides: currentSlides,
    migrated: 0,
    skipped: 0,
    errors: []
  };

  // Run migrations in order
  const migrations = [
    migrateLegacyTransitions,
    migrateToVenmailTheme,
    inferMotionFromContent
  ];

  for (const migration of migrations) {
    const result = migration(currentSlides);
    currentSlides = result.slides;
    
    finalResult.migrated += result.migrated;
    finalResult.skipped += result.skipped;
    finalResult.errors.push(...result.errors);
  }

  finalResult.slides = currentSlides;
  return finalResult;
}

/**
 * Validate migrated slides for common issues
 */
export function validateMigratedSlides(slides: SlidevSlide[]): string[] {
  const issues: string[] = [];

  slides.forEach((slide, index) => {
    const slideNum = index + 1;
    const frontmatter = slide.frontmatter || {};

    // Check for required motion structure
    if (!frontmatter.motion) {
      issues.push(`Slide ${slideNum}: Missing motion frontmatter`);
    } else {
      const motion = frontmatter.motion;
      
      if (!motion.slideVariant) {
        issues.push(`Slide ${slideNum}: Missing motion.slideVariant`);
      }
      
      if (!motion.contentVariant) {
        issues.push(`Slide ${slideNum}: Missing motion.contentVariant`);
      }
    }

    // Check for invalid variant names
    const validVariants = ['venmail3d', 'slideLeft', 'slideRight', 'slideUp', 'slideDown', 'fade', 'zoom'];
    if (frontmatter.motion?.slideVariant && !validVariants.includes(frontmatter.motion.slideVariant)) {
      issues.push(`Slide ${slideNum}: Invalid slide variant "${frontmatter.motion.slideVariant}"`);
    }

    // Check for content
    if (!slide.content || slide.content.trim() === '') {
      issues.push(`Slide ${slideNum}: Empty content`);
    }
  });

  return issues;
}
