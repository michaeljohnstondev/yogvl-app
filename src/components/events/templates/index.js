// Hooks
export { useTemplateManager } from './hooks/useTemplateManager';
export { useTemplateStorage } from './hooks/useTemplateStorage';

// Utils
export * from './utils/templateTransforms';

// Components (if you move your modals here)
export { TemplateSelectionModal, SaveTemplateModal } from './TemplateModals';

// Default export for the main hook
export { useTemplateManager as default } from './hooks/useTemplateManager';
