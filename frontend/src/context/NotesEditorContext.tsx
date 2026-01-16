/**
 * Notes Editor Context
 *
 * Manages single-editor-at-a-time behavior for notes editors.
 * When a new editor is opened, the current one is saved and closed first.
 */

import { createContext, useContext, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useToast } from './ToastContext';

interface EditorState {
  id: string;
  save: () => Promise<void>;
}

interface NotesEditorContextValue {
  /**
   * Request to open an editor. If another editor is open, it will be saved first.
   * @param id - Unique identifier for this editor
   * @param save - Function to save the editor's content
   * @returns true if the editor can open, false if blocked
   */
  requestOpen: (id: string, save: () => Promise<void>) => Promise<boolean>;
  /**
   * Close the current editor (call after saving)
   */
  closeEditor: () => void;
  /**
   * Check if a specific editor is active
   */
  isActive: (id: string) => boolean;
}

const NotesEditorContext = createContext<NotesEditorContextValue | null>(null);

interface NotesEditorProviderProps {
  children: ReactNode;
}

export function NotesEditorProvider({ children }: NotesEditorProviderProps) {
  // Use ref to avoid stale closure issues and prevent unnecessary re-renders
  const activeEditorRef = useRef<EditorState | null>(null);
  const toast = useToast();

  const requestOpen = useCallback(
    async (id: string, save: () => Promise<void>): Promise<boolean> => {
      // If this editor is already active, just return true
      if (activeEditorRef.current?.id === id) {
        return true;
      }

      // If another editor is active, save it first
      if (activeEditorRef.current) {
        try {
          await activeEditorRef.current.save();
        } catch (err) {
          console.error('Failed to save previous editor:', err);
          toast.warning('Previous note may not have saved. Please check your changes.');
          // Block opening new editor if save failed - user should address the issue first
          return false;
        }
      }

      // Set new active editor
      activeEditorRef.current = { id, save };
      return true;
    },
    [toast]
  );

  const closeEditor = useCallback(() => {
    activeEditorRef.current = null;
  }, []);

  const isActive = useCallback((id: string) => {
    return activeEditorRef.current?.id === id;
  }, []);

  const value = useMemo<NotesEditorContextValue>(
    () => ({
      requestOpen,
      closeEditor,
      isActive,
    }),
    [requestOpen, closeEditor, isActive]
  );

  return <NotesEditorContext.Provider value={value}>{children}</NotesEditorContext.Provider>;
}

export function useNotesEditor(): NotesEditorContextValue {
  const context = useContext(NotesEditorContext);
  if (!context) {
    throw new Error('useNotesEditor must be used within a NotesEditorProvider');
  }
  return context;
}

/**
 * Hook for optional access to notes editor context.
 * Returns null if not within a provider (useful for standalone usage).
 */
export function useNotesEditorOptional(): NotesEditorContextValue | null {
  return useContext(NotesEditorContext);
}
