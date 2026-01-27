/* eslint-disable max-lines */
/**
 * Demo Openverse Client
 *
 * Mock Openverse API for demo mode.
 * Returns curated sample images for common goal-related searches.
 * No actual API calls are made.
 */

import type { OpenverseImage, OpenverseSearchRequest, OpenverseSearchResult } from '../../types';
import { simulateDelay } from './demoState';

/**
 * Sample images for demo mode.
 * These are Creative Commons licensed images from Unsplash (CC0).
 * Using Unsplash Source URLs which are stable and allow hotlinking.
 */
const SAMPLE_IMAGES: Record<string, OpenverseImage[]> = {
  vacation: [
    {
      id: 'demo-vacation-1',
      title: 'Tropical Beach Paradise',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-vacation-2',
      title: 'Mountain Adventure',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-vacation-3',
      title: 'European City Street',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-vacation-4',
      title: 'Camping Under Stars',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
  ],
  house: [
    {
      id: 'demo-house-1',
      title: 'Modern Home Exterior',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-house-2',
      title: 'Cozy Living Room',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-house-3',
      title: 'Suburban Home',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
  ],
  car: [
    {
      id: 'demo-car-1',
      title: 'Electric Vehicle',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-car-2',
      title: 'Classic Car',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-car-3',
      title: 'SUV Adventure',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
  ],
  emergency: [
    {
      id: 'demo-emergency-1',
      title: 'Piggy Bank Savings',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-emergency-2',
      title: 'Safety Net',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-emergency-3',
      title: 'Financial Security',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
  ],
  education: [
    {
      id: 'demo-education-1',
      title: 'Graduation Cap',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-education-2',
      title: 'Books and Learning',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
  ],
  wedding: [
    {
      id: 'demo-wedding-1',
      title: 'Wedding Rings',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-wedding-2',
      title: 'Wedding Celebration',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
  ],
  baby: [
    {
      id: 'demo-baby-1',
      title: 'Baby Shoes',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-baby-2',
      title: 'Family Joy',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
  ],
  technology: [
    {
      id: 'demo-tech-1',
      title: 'Modern Laptop',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
    {
      id: 'demo-tech-2',
      title: 'Smartphone',
      creator: 'Demo Creator',
      creatorUrl: null,
      url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300',
      license: 'cc0',
      licenseName: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'unsplash',
    },
  ],
};

/**
 * Get all sample images as a flat array (used for generic searches).
 */
function getAllSampleImages(): OpenverseImage[] {
  return Object.values(SAMPLE_IMAGES).flat();
}

/**
 * Find matching images for a search query.
 */
function findMatchingImages(query: string): OpenverseImage[] {
  const normalizedQuery = query.toLowerCase().trim();

  // Check for exact category matches first
  for (const [category, images] of Object.entries(SAMPLE_IMAGES)) {
    if (normalizedQuery.includes(category) || category.includes(normalizedQuery)) {
      return images;
    }
  }

  // Check for related terms
  const categoryAliases: Record<string, string[]> = {
    vacation: ['travel', 'trip', 'holiday', 'beach', 'mountain', 'adventure'],
    house: ['home', 'apartment', 'property', 'real estate', 'living'],
    car: ['vehicle', 'auto', 'automobile', 'transportation', 'drive'],
    emergency: ['savings', 'fund', 'safety', 'rainy day', 'piggy bank', 'money'],
    education: ['school', 'college', 'university', 'learning', 'student', 'graduation'],
    wedding: ['marriage', 'engaged', 'ring', 'ceremony'],
    baby: ['child', 'kid', 'family', 'newborn', 'parent'],
    technology: ['laptop', 'computer', 'phone', 'gadget', 'electronic', 'tech'],
  };

  for (const [category, aliases] of Object.entries(categoryAliases)) {
    if (aliases.some((alias) => normalizedQuery.includes(alias))) {
      return SAMPLE_IMAGES[category] || [];
    }
  }

  // Return all images for unmatched queries
  return getAllSampleImages();
}

/**
 * Search for images (demo mode).
 * Returns curated sample images based on the query.
 */
export async function searchImages(
  request: OpenverseSearchRequest
): Promise<OpenverseSearchResult> {
  await simulateDelay(400); // Simulate network delay

  const matchingImages = findMatchingImages(request.query);
  const page = request.page || 1;
  const pageSize = request.pageSize || 20;
  const start = (page - 1) * pageSize;
  const results = matchingImages.slice(start, start + pageSize);

  return {
    results,
    resultCount: matchingImages.length,
    pageCount: Math.ceil(matchingImages.length / pageSize),
  };
}

/**
 * Generate attribution text for an image.
 */
export function generateAttribution(image: OpenverseImage): string {
  const parts: string[] = [];

  if (image.title) {
    parts.push(`"${image.title}"`);
  }

  if (image.creator) {
    parts.push(`by ${image.creator}`);
  }

  parts.push(`via Openverse`);

  if (image.licenseName) {
    parts.push(`(${image.licenseName})`);
  }

  return parts.join(' ');
}
