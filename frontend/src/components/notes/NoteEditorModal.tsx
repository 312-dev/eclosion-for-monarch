/** Note Editor Modal - for editing category/group notes with inheritance support. */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Portal } from '../Portal';
import { RevisionHistoryModal } from './RevisionHistoryModal';
import { NoteEditorMDX } from './NoteEditorMDX';
import {
  NoteEditorHeader,
  DeleteButton,
  DiscardConfirmation,
  InheritanceBreakWarning,
  DeleteConfirmation,
  InheritedContentReference,
  NoteEditorFooterActions,
} from './NoteEditorConfirmations';
import { useSaveCategoryNoteMutation, useDeleteCategoryNoteMutation } from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useDemo } from '../../context/DemoContext';
import * as api from '../../api/core';
import * as demoApi from '../../api/demo';
import type { MonthKey } from '../../types/notes';

interface NoteEditorModalProps {
  categoryType: 'group' | 'category';
  categoryId: string;
  categoryName: string;
  groupId?: string;
  groupName?: string;
  monthKey: MonthKey;
  initialContent: string;
  isInherited: boolean;
  sourceMonth: MonthKey | null;
  inheritedContent?: string;
  onClose: () => void;
}

function formatMonth(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function NoteEditorModal({
  categoryType,
  categoryId,
  categoryName,
  groupId,
  groupName,
  monthKey,
  initialContent,
  isInherited,
  sourceMonth,
  inheritedContent,
  onClose,
}: NoteEditorModalProps) {
  const startingContent = isInherited ? '' : initialContent;

  const [content, setContent] = useState(startingContent);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showInheritanceWarning, setShowInheritanceWarning] = useState(false);
  const [inheritanceImpact, setInheritanceImpact] = useState<{
    affectedMonths: string[];
    monthsWithCheckboxStates: Record<string, number>;
  } | null>(null);
  const [isCheckingInheritance, setIsCheckingInheritance] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const isDemo = useDemo();

  const saveMutation = useSaveCategoryNoteMutation();
  useDeleteCategoryNoteMutation();

  const hasContent = content.trim().length > 0;
  const hasUnsavedChanges = content !== startingContent;
  const isSaveDisabled =
    !hasContent || saveMutation.isPending || isCheckingInheritance || isRateLimited;

  const getSaveButtonText = () => {
    if (isCheckingInheritance) return 'Checking...';
    if (saveMutation.isPending) return 'Saving...';
    return 'Save';
  };

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClose]);

  const checkInheritanceImpact = async (): Promise<boolean> => {
    if (!isInherited) return true;

    setIsCheckingInheritance(true);
    try {
      const getImpact = isDemo ? demoApi.getInheritanceImpact : api.getInheritanceImpact;
      const impact = await getImpact({ categoryType, categoryId, monthKey });

      const totalCheckboxes = Object.values(impact.monthsWithCheckboxStates).reduce(
        (sum, count) => sum + count,
        0
      );

      if (totalCheckboxes > 0) {
        setInheritanceImpact({
          affectedMonths: impact.affectedMonths,
          monthsWithCheckboxStates: impact.monthsWithCheckboxStates,
        });
        setShowInheritanceWarning(true);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to check inheritance impact:', err);
      return true;
    } finally {
      setIsCheckingInheritance(false);
    }
  };

  const performSave = async () => {
    try {
      await saveMutation.mutateAsync({
        categoryType,
        categoryId,
        categoryName,
        ...(groupId !== undefined && { groupId }),
        ...(groupName !== undefined && { groupName }),
        monthKey,
        content: content.trim(),
      });
      toast.success('Note saved');
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Failed to save note'));
    }
  };

  const handleSave = async () => {
    if (!hasContent) {
      toast.error('Note cannot be empty');
      return;
    }
    const canProceed = await checkInheritanceImpact();
    if (canProceed) await performSave();
  };

  const handleConfirmInheritanceBreak = async () => {
    setShowInheritanceWarning(false);
    setInheritanceImpact(null);
    await performSave();
  };

  const handleDelete = async () => {
    if (!initialContent) {
      onClose();
      return;
    }
    toast.info('Delete functionality coming soon');
    setShowDeleteConfirm(false);
  };

  const showingConfirmation = showDeleteConfirm || showDiscardConfirm || showInheritanceWarning;

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 'var(--z-index-modal)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div
          ref={modalRef}
          className="rounded-xl shadow-lg w-full max-w-lg"
          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-editor-title"
        >
          <NoteEditorHeader
            categoryType={categoryType}
            categoryName={categoryName}
            monthKey={monthKey}
            isInherited={isInherited}
            sourceMonth={sourceMonth}
            formatMonth={formatMonth}
            onClose={handleClose}
          />

          {/* Editor */}
          <div className="border-b" style={{ borderColor: 'var(--monarch-border)' }}>
            <NoteEditorMDX
              value={content}
              onChange={setContent}
              onSave={handleSave}
              placeholder={
                isInherited
                  ? `Type here to create a new note for ${formatMonth(monthKey)}...`
                  : `Write a note for ${categoryName}...`
              }
              autoFocus
              minHeight={150}
            />
          </div>

          {/* Inherited content reference */}
          {isInherited && inheritedContent && sourceMonth && (
            <InheritedContentReference
              sourceMonth={sourceMonth}
              inheritedContent={inheritedContent}
              formatMonth={formatMonth}
            />
          )}

          {/* Confirmations */}
          {showDiscardConfirm && (
            <DiscardConfirmation
              onKeepEditing={() => setShowDiscardConfirm(false)}
              onDiscard={onClose}
            />
          )}

          {showInheritanceWarning && inheritanceImpact && (
            <InheritanceBreakWarning
              monthsWithCheckboxStates={inheritanceImpact.monthsWithCheckboxStates}
              formatMonth={formatMonth}
              onCancel={() => {
                setShowInheritanceWarning(false);
                setInheritanceImpact(null);
              }}
              onConfirm={handleConfirmInheritanceBreak}
            />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3">
            {!isInherited && initialContent && !showingConfirmation && (
              <DeleteButton onClick={() => setShowDeleteConfirm(true)} />
            )}

            {showDeleteConfirm && (
              <DeleteConfirmation
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
              />
            )}

            {(isInherited || !initialContent) && !showingConfirmation && <div />}

            {!showingConfirmation && (
              <NoteEditorFooterActions
                onShowHistory={() => setShowHistory(true)}
                onCancel={handleClose}
                onSave={handleSave}
                saveButtonText={getSaveButtonText()}
                isSaveDisabled={isSaveDisabled}
              />
            )}
          </div>
        </div>
      </div>

      {showHistory && (
        <RevisionHistoryModal
          categoryType={categoryType}
          categoryId={categoryId}
          categoryName={categoryName}
          {...(groupId !== undefined && { groupId })}
          {...(groupName !== undefined && { groupName })}
          currentMonth={monthKey}
          onClose={() => setShowHistory(false)}
        />
      )}
    </Portal>
  );
}
