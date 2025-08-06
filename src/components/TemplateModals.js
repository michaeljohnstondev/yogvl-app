import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import VibeInput from './VibeInput';
import VibeButton from './VibeButton';
import theme from '../themes/themes';

// Template Selection Modal
export const TemplateSelectionModal = ({
  visible,
  onClose,
  templates,
  onSelectTemplate,
  onDeleteTemplate,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choose Template</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.templateList}>
          {templates.length === 0 ? (
            <Text style={styles.emptyText}>
              No templates saved yet. Create an event and save it as a template!
            </Text>
          ) : (
            templates.map((template) => (
              <View key={template.id} style={styles.templateItem}>
                <Pressable
                  style={styles.templateContent}
                  onPress={() => {
                    onSelectTemplate(template);
                    onClose();
                  }}
                >
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templatePreview}>
                    {template.title} • {template.location}
                  </Text>
                  <Text style={styles.templateDate}>
                    Created {template.createdAt?.toDate().toLocaleDateString()}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => {
                    Alert.alert(
                      'Delete Template',
                      `Delete "${template.name}"?`,
                      [
                        { text: 'Cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => onDeleteTemplate(template.id),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Save Template Modal
export const SaveTemplateModal = ({
  visible,
  onClose,
  templateName,
  setTemplateName,
  onSave,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <View style={styles.saveModalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Save as Template</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.saveModalContent}>
          <Text style={styles.label}>Template Name</Text>
          <VibeInput
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="e.g., Weekly Book Club"
            maxLength={50}
          />

          <Text style={styles.helpText}>
            This will save everything except the date and time, so you can reuse
            it for future events.
          </Text>

          <VibeButton
            label="Save Template"
            onPress={onSave}
            style={styles.saveButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.inputBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  templateList: {
    flex: 1,
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 50,
    fontFamily: theme.fonts.main,
  },
  templateItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    marginBottom: 12,
    overflow: 'hidden',
  },
  templateContent: {
    flex: 1,
    padding: 16,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  templatePreview: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  templateDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
  },
  deleteButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  deleteButtonText: {
    fontSize: 18,
  },
  saveModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  saveModalContent: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 20,
  },
  saveButton: {
    marginTop: 20,
  },
});
