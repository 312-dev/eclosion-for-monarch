/**
 * ImageSearchModal Component
 *
 * A modal for searching and selecting images from Openverse.
 * Features:
 * - Real-time search with debounce
 * - Responsive image grid
 * - Quick suggestion pills
 * - Attribution display (required by Openverse)
 * - Loading and error states
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Icons } from '../icons';
import { useOpenverseSearch, generateOpenverseAttribution } from '../../api/queries';
import type { OpenverseImage, ImageSelection } from '../../types';
import { UI } from '../../constants';

interface ImageSearchModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Handler when an image is selected */
  onSelect: (selection: ImageSelection) => void;
}

/** Quick search suggestions for common goal types */
const SUGGESTIONS = [
  'Vacation',
  'House',
  'Car',
  'Emergency',
  'Education',
  'Wedding',
  'Baby',
  'Technology',
];

/** Debounce delay for search input */
const DEBOUNCE_MS = 300;

export function ImageSearchModal({ isOpen, onClose, onSelect }: ImageSearchModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<OpenverseImage | null>(null);
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(1); // Reset to first page on new search
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch search results
  const {
    data: searchResult,
    isLoading,
    error,
    isFetching,
  } = useOpenverseSearch(debouncedQuery, page, {
    enabled: isOpen && debouncedQuery.length > 0,
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to let close animation complete
      const timer = setTimeout(() => {
        setSearchInput('');
        setDebouncedQuery('');
        setSelectedImage(null);
        setPage(1);
      }, UI.ANIMATION.NORMAL);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchInput(suggestion);
    setDebouncedQuery(suggestion);
    setPage(1);
  }, []);

  const handleImageClick = useCallback((image: OpenverseImage) => {
    setSelectedImage(image);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedImage) return;

    const attribution = generateOpenverseAttribution(selectedImage);
    onSelect({
      url: selectedImage.url,
      thumbnail: selectedImage.thumbnail,
      attribution,
      source: 'openverse',
    });
  }, [selectedImage, onSelect]);

  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  // Combine results from multiple pages (for infinite scroll feel)
  const allResults = useMemo(() => {
    // For simplicity, just show current page results
    // A full implementation would accumulate results
    return searchResult?.results ?? [];
  }, [searchResult]);

  const hasMore = searchResult ? page < searchResult.pageCount : false;

  // Generate footer content
  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="text-xs text-(--monarch-text-muted) truncate max-w-[50%]">
        {selectedImage && (
          <>
            📷 {selectedImage.creator || 'Unknown'} via Openverse (
            {selectedImage.license.toUpperCase()})
          </>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-(--monarch-bg-page)"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedImage}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: selectedImage ? 'var(--monarch-accent)' : 'var(--monarch-bg-page)',
            color: selectedImage ? 'white' : 'var(--monarch-text-muted)',
          }}
        >
          Use This Image
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Goal Image"
      maxWidth="lg"
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        {/* Search input */}
        <div className="relative">
          <Icons.Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: 'var(--monarch-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search for images..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              borderColor: 'var(--monarch-border)',
              color: 'var(--monarch-text-dark)',
            }}
            autoFocus
          />
          {isFetching && (
            <Icons.Spinner
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          )}
        </div>

        {/* Suggestion pills */}
        {!debouncedQuery && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 text-sm rounded-full transition-colors hover:bg-(--monarch-accent)/10"
                style={{
                  backgroundColor: 'var(--monarch-bg-page)',
                  color: 'var(--monarch-text-dark)',
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Results area */}
        <div className="overflow-y-auto" style={{ maxHeight: '400px', minHeight: '200px' }}>
          {/* Loading skeleton */}
          {isLoading && !allResults.length && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg animate-pulse"
                  style={{ backgroundColor: 'var(--monarch-bg-page)' }}
                />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              className="flex flex-col items-center justify-center h-48 gap-2"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <Icons.AlertCircle className="h-8 w-8" />
              <p className="text-sm">Failed to search images. Please try again.</p>
            </div>
          )}

          {/* Empty state (before search) */}
          {!debouncedQuery && !isLoading && (
            <div
              className="flex flex-col items-center justify-center h-48 gap-2"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <Icons.Search className="h-8 w-8" />
              <p className="text-sm">Search for images or click a suggestion above</p>
            </div>
          )}

          {/* No results */}
          {debouncedQuery && !isLoading && allResults.length === 0 && !error && (
            <div
              className="flex flex-col items-center justify-center h-48 gap-2"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <Icons.Search className="h-8 w-8" />
              <p className="text-sm">No images found for "{debouncedQuery}"</p>
            </div>
          )}

          {/* Image grid */}
          {allResults.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allResults.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => handleImageClick(image)}
                    className={`
                      relative aspect-square rounded-lg overflow-hidden
                      transition-all hover:ring-2 focus:ring-2 focus:outline-none
                      ${selectedImage?.id === image.id ? 'ring-2' : ''}
                    `}
                    style={{
                      ['--tw-ring-color' as string]: 'var(--monarch-accent)',
                    }}
                    aria-label={image.title || 'Image'}
                    aria-selected={selectedImage?.id === image.id}
                  >
                    <img
                      src={image.thumbnail}
                      alt={image.title || 'Search result'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {selectedImage?.id === image.id && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          backgroundColor: 'rgba(var(--monarch-accent-rgb, 255, 134, 72), 0.3)',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--monarch-accent)' }}
                        >
                          <Icons.Check className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isFetching}
                    className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-(--monarch-bg-page) disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--monarch-bg-page)',
                      color: 'var(--monarch-text-dark)',
                    }}
                  >
                    {isFetching ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Attribution notice */}
        <p className="text-xs text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Images provided by{' '}
          <a
            href="https://openverse.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            Openverse
          </a>{' '}
          under Creative Commons licenses.
        </p>
      </div>
    </Modal>
  );
}
