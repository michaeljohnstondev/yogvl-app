// Event form section for adding broad-match tags (e.g. "concert", "house
// music") that broaden the interest-notification net beyond what
// extractInterestsFromEvent infers from title + location. The tags array
// lives on formData.tags and is updated via updateField. Tags are
// stored lowercase + trimmed so they slot directly into the studio's
// existing interest index keys.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VibeInput } from '../../../components/ui';
import theme from '../../../theme/themes';
import { useAuth } from '../../../auth/AuthContext';
import { getStudioInterests } from '../../../services/interestService';

const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 40;

// Trim only — preserve the user's casing for display. Case-insensitive
// dedup is done separately via lower(). The Cloud Function and interest
// index already lowercase for matching, so display casing is free.
const clean = (raw) => (raw || '').trim();
const lower = (raw) => clean(raw).toLowerCase();

export const Tags = ({ formData, updateField, styles, setFieldRef }) => {
  const tags = Array.isArray(formData.tags) ? formData.tags : [];
  const [draft, setDraft] = useState('');
  const [studioInterests, setStudioInterests] = useState([]);
  const { userData } = useAuth();
  const studioId = userData?.userdata?.studios?.default?.studioId || null;

  // Pull the studio's existing interest list once so the user can pick
  // from what already exists instead of inventing a near-duplicate.
  // Falls back gracefully when offline / no studio.
  useEffect(() => {
    let cancelled = false;
    if (!studioId) return;
    (async () => {
      try {
        // Returns [{ interest, count }] sorted by count desc.
        // Preserve casing — `interest` is the display name from
        // studios/{id}/meta/interestCounts.display (capitalization
        // of whoever added it first).
        const list = await getStudioInterests(studioId);
        if (!cancelled && Array.isArray(list)) {
          setStudioInterests(list.map((entry) => clean(entry?.interest)).filter(Boolean));
        }
      } catch (e) {
        // Non-fatal — user can still type tags freely without suggestions.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studioId]);

  const cleanedDraft = clean(draft);
  const lowerDraft = lower(draft);
  const lowerTags = useMemo(() => tags.map(lower), [tags]);
  const alreadyAdded = (tag) => lowerTags.includes(lower(tag));
  const atCap = tags.length >= MAX_TAGS;

  // Filter suggestions: case-insensitive prefix match, exclude already-
  // selected tags, drop the exact same case-insensitive draft (so the
  // "Add new" row below doesn't shadow an existing suggestion), cap to 6.
  const suggestions = useMemo(() => {
    if (!cleanedDraft) return [];
    return studioInterests
      .filter((i) => {
        const li = lower(i);
        return (
          li.includes(lowerDraft) &&
          !lowerTags.includes(li) &&
          li !== lowerDraft
        );
      })
      .slice(0, 6);
  }, [cleanedDraft, lowerDraft, studioInterests, lowerTags]);

  // Only offer "Add new" when the typed text isn't already in the user's
  // selected tags. Comparison is case-insensitive so "Concert" and
  // "concert" can't both land.
  const canAddDraft =
    cleanedDraft.length > 0 &&
    cleanedDraft.length <= MAX_TAG_LENGTH &&
    !lowerTags.includes(lowerDraft) &&
    !atCap;

  const addTag = (tag) => {
    const display = clean(tag);
    if (!display) return;
    if (alreadyAdded(display)) return;
    if (atCap) return;
    updateField('tags', [...tags, display].slice(0, MAX_TAGS));
    setDraft('');
  };

  const removeTag = (tag) => {
    updateField(
      'tags',
      tags.filter((t) => lower(t) !== lower(tag))
    );
  };

  return (
    <View ref={setFieldRef && setFieldRef('tags')}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Tags</Text>
      </View>

      {tags.length > 0 && (
        <View style={localStyles.chipRow}>
          {tags.map((tag) => (
            <View key={tag} style={localStyles.chip}>
              <Text style={localStyles.chipText}>{tag}</Text>
              <TouchableOpacity
                onPress={() => removeTag(tag)}
                style={localStyles.chipRemove}
                accessibilityLabel={`Remove tag ${tag}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={localStyles.chipRemoveText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!atCap && (
        <VibeInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Enter a tag"
          autoCapitalize="sentences"
          autoCorrect={false}
          maxLength={MAX_TAG_LENGTH}
          onSubmitEditing={() => canAddDraft && addTag(cleanedDraft)}
          returnKeyType="done"
          isCompleted={canAddDraft}
        />
      )}

      {(suggestions.length > 0 || canAddDraft) && (
        <View style={localStyles.suggestionList}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => addTag(s)}
              style={localStyles.suggestionItem}
            >
              <Text style={localStyles.suggestionText}>{s}</Text>
              <Text style={localStyles.suggestionHint}>Existing tag</Text>
            </TouchableOpacity>
          ))}
          {canAddDraft && (
            <TouchableOpacity
              onPress={() => addTag(cleanedDraft)}
              style={[localStyles.suggestionItem, localStyles.suggestionAddNew]}
            >
              <Text style={localStyles.suggestionText}>Add “{cleanedDraft}”</Text>
              <Text style={localStyles.suggestionHint}>New tag</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {atCap && (
        <Text style={localStyles.capNote}>Max {MAX_TAGS} tags reached.</Text>
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 14,
    gap: 6,
  },
  chipText: {
    color: theme.colors.vibeBlue,
    fontFamily: theme.fonts.main,
    fontWeight: '600',
    fontSize: 13,
  },
  chipRemove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.18)',
  },
  chipRemoveText: {
    color: theme.colors.vibeBlue,
    fontFamily: theme.fonts.main,
    fontSize: 16,
    lineHeight: 18,
  },
  suggestionList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 212, 255, 0.1)',
  },
  suggestionAddNew: {
    backgroundColor: 'rgba(0, 255, 136, 0.06)',
    borderBottomWidth: 0,
  },
  suggestionText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    fontSize: 14,
  },
  suggestionHint: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    fontSize: 11,
  },
  capNote: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    fontSize: 12,
    marginTop: 6,
  },
});

export default Tags;
