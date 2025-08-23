import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import VibeModal from '../../components/ui/VibeModal';
import VibeInput from '../../components/ui/VibeInput';
import VibeButton from '../../components/ui/VibeButton';
import VibeSegmentedControl from '../../components/ui/VibeSegmentedControl';
import theme from '../../theme/themes';

// Template Selection Modal
export const TemplateSelectionModal = ({
  visible,
  onClose,
  templates,
  pastEvents = [],
  onSelectTemplate,
  onDeleteTemplate,
  onCreateTemplateFromPastEvent,
}) => {
  const [activeTab, setActiveTab] = useState('templates');
  
  return (
    <VibeModal
      visible={visible}
      onClose={onClose}
      title="Choose Template"
      scrollable={false}
    >
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <VibeSegmentedControl
          options={[
            { value: 'templates', label: 'Saved Templates' },
            { value: 'pastEvents', label: 'Past Events' },
          ]}
          selectedValue={activeTab}
          onSelect={setActiveTab}
          style={styles.tabSelector}
        />
      </View>

      <ScrollView style={styles.templateList} showsVerticalScrollIndicator={false}>
          {activeTab === 'templates' ? (
            // Saved Templates Tab
            templates.length === 0 ? (
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
                    {template.name !== template.title || !template.title || !template.location ? (
                      <Text style={styles.templateName}>{template.name}</Text>
                    ) : (
                      <>
                        <Text style={styles.templateName}>{template.title}</Text>
                        <Text style={styles.templateLocation}>@ {template.location}</Text>
                      </>
                    )}
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
            )
          ) : (
            // Past Events Tab
            pastEvents.length === 0 ? (
              <Text style={styles.emptyText}>
                No past events found. Create and complete some events to use them as templates!
              </Text>
            ) : (
              pastEvents.map((event) => (
                <View key={event.id} style={styles.templateItem}>
                  <Pressable
                    style={styles.templateContent}
                    onPress={() => {
                      if (onCreateTemplateFromPastEvent) {
                        onCreateTemplateFromPastEvent(event);
                        onClose();
                      }
                    }}
                  >
                    <Text style={styles.templateName}>{event.title}</Text>
                    <Text style={styles.templateLocation}>@ {event.location}</Text>
                    <Text style={styles.pastEventDate}>
                      {event.eventTimestamp ? 
                        new Date(event.eventTimestamp.seconds * 1000).toLocaleDateString() :
                        new Date(event.utcDateTime).toLocaleDateString()
                      }
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.useTemplateButton}
                    onPress={() => {
                      if (onCreateTemplateFromPastEvent) {
                        onCreateTemplateFromPastEvent(event);
                        onClose();
                      }
                    }}
                  >
                    <Text style={styles.useTemplateButtonText}>📋</Text>
                  </Pressable>
                </View>
              ))
            )
          )}
        </ScrollView>
    </VibeModal>
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
    <VibeModal
      visible={visible}
      onClose={onClose}
      title="Save as Template"
      scrollable={false}
    >
      <View style={styles.saveModalContent}>
        <Text style={styles.label}>Template Name</Text>
        <VibeInput
          value={templateName}
          onChangeText={setTemplateName}
          placeholder={templateName}
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
    </VibeModal>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    paddingHorizontal: 0,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabSelector: {
    marginBottom: 0,
    gap: 12,
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
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue || '#00C6FF',
    marginBottom: 16,
    overflow: 'hidden',
  },
  templateContent: {
    flex: 1,
    padding: 18,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  templateLocation: {
    fontSize: 14,
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
    fontSize: 20,
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
  
  // Past event specific styles
  pastEventDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    marginTop: 4,
  },
  useTemplateButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
  },
  useTemplateButtonText: {
    fontSize: 20,
  },
});
