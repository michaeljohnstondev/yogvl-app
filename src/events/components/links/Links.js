// Event form section for attaching up to 5 links (e.g. agenda, RSVP form,
// Discord invite). Each row has an optional Label + required URL. The
// links array lives on formData.links and is updated via updateField.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VibeInput } from '../../../components/ui';
import theme from '../../../theme/themes';

const MAX_LINKS = 5;
const EMPTY_LINK = { label: '', url: '' };

export const Links = ({
  formData,
  updateField,
  styles,
  setFieldRef,
}) => {
  const links = Array.isArray(formData.links) ? formData.links : [];

  const handleChange = (index, key, value) => {
    const next = [...links];
    next[index] = { ...(next[index] || EMPTY_LINK), [key]: value };
    updateField('links', next);
  };

  const handleAdd = () => {
    if (links.length >= MAX_LINKS) return;
    updateField('links', [...links, { ...EMPTY_LINK }]);
  };

  const handleRemove = (index) => {
    const next = links.filter((_, i) => i !== index);
    updateField('links', next);
  };

  return (
    <View ref={setFieldRef && setFieldRef('links')}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Links</Text>
      </View>
      <Text style={localStyles.helperText}>
        Optional. Up to {MAX_LINKS}.
      </Text>

      {links.map((link, index) => (
        <View key={index} style={localStyles.row}>
          <View style={localStyles.inputs}>
            <VibeInput
              value={link?.label || ''}
              onChangeText={(text) => handleChange(index, 'label', text)}
              placeholder="Label (optional)"
              maxLength={60}
              style={localStyles.input}
            />
            <VibeInput
              value={link?.url || ''}
              onChangeText={(text) => handleChange(index, 'url', text)}
              placeholder="https://..."
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              maxLength={2000}
              style={localStyles.input}
              isCompleted={link?.url && link.url.trim().length > 0}
            />
          </View>
          <TouchableOpacity
            onPress={() => handleRemove(index)}
            style={localStyles.removeBtn}
            accessibilityLabel={`Remove link ${index + 1}`}
          >
            <Text style={localStyles.removeText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      {links.length < MAX_LINKS && (
        <TouchableOpacity onPress={handleAdd} style={localStyles.addBtn}>
          <Text style={localStyles.addText}>
            {links.length === 0 ? '+ Add a link' : '+ Add another link'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  helperText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    fontSize: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inputs: {
    flex: 1,
    gap: 6,
  },
  input: {
    width: '100%',
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    lineHeight: 24,
    fontFamily: theme.fonts.main,
  },
  addBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    marginTop: 4,
  },
  addText: {
    color: theme.colors.vibeBlue,
    fontFamily: theme.fonts.main,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default Links;
