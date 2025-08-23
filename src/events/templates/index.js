// Hooks
export { useTemplateManager } from '../hooks/templates/useTemplateManager';
export { useTemplateStorage } from '../hooks/templates/useTemplateStorage';

// Utils
export * from '../lib/templateTransforms';

// Components (if you move your modals here)
export { TemplateSelectionModal, SaveTemplateModal } from './TemplateModals';

// Default export for the main hook
export { useTemplateManager as default } from '../hooks/templates/useTemplateManager';
