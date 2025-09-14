// FILE: ../who/Who.js

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { VibeInput, VibeDropdown } from '../../../components/ui/base';
import GuestListViewer from '../guests/GuestListViewer';

export const Who = forwardRef(
  (
    {
      formData,
      updateField,
      styles,
      setFieldRef,
      PickerRow,
      handleInputFocus,
      userData,
      selectedTextContacts,
      selectedGuestCount,
      selectedCohostCount,
      currentAttendees = [],
      currentCohosts = [],
      openGuestInvitations,
      openHostInvitations,
      guestListTriggerRef,
    },
    ref
  ) => {
    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      closeSection: () => {
        // No-op for compatibility
      },
      openGuestSettings: () => {
        // No-op for compatibility
      },
      closeAllInviteSections: () => {
        // No-op for compatibility
      },
    }));

    return (
      <>
        {/* GUEST LIST VIEWER */}
        <GuestListViewer
          ref={guestListTriggerRef}
          currentUser={userData}
          selectedTextContacts={selectedTextContacts}
          invitedGuests={currentAttendees}
          hosts={currentCohosts}
          selectedGuestCount={selectedGuestCount}
          selectedCohostCount={selectedCohostCount}
          onInvitePress={openGuestInvitations}
          onAddHostPress={openHostInvitations}
          style={styles.guestListViewer}
        />
        {/* MAX GUESTS */}
        <View
          ref={setFieldRef && setFieldRef('maxGuests')}
          style={styles.inputContainer}
        >
          <Text style={styles.label}>Max Guests</Text>
          <VibeInput
            placeholder="Enter max guests"
            value={formData.maxGuests}
            onChangeText={(text) => updateField('maxGuests', text)}
            onFocus={() => handleInputFocus && handleInputFocus('maxGuests')}
            keyboardType="numeric"
            isCompleted={
              formData.maxGuests && formData.maxGuests.trim().length > 0
            }
          />
        </View>

        {/* RSVP DEADLINE */}
        <View
          ref={setFieldRef && setFieldRef('rsvpDeadline')}
          style={styles.inputContainer}
        >
          <Text style={styles.label}>RSVP Deadline</Text>
          <VibeDropdown
            options={[
              { value: 'none', label: 'No Deadline' },
              { value: '1hour', label: '1 Hour Before' },
              { value: '2hours', label: '2 Hours Before' },
              { value: '6hours', label: '6 Hours Before' },
              { value: '1day', label: '1 Day Before' },
              { value: '2days', label: '2 Days Before' },
              { value: '1week', label: '1 Week Before' },
              { value: '2weeks', label: '2 Weeks Before' },
              { value: '1month', label: '1 Month Before' },
              { value: 'custom', label: 'Custom Date & Time' },
            ]}
            selectedValue={formData.rsvpDeadlineType || 'none'}
            onSelect={(value) => updateField('rsvpDeadlineType', value)}
            placeholder="Select deadline"
            isCompleted={
              formData.rsvpDeadlineType && formData.rsvpDeadlineType !== 'none'
            }
            hideSelectedFromList={true}
          />
        </View>

        {formData.rsvpDeadlineType === 'custom' && (
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { marginTop: 15 }]}>
              Custom RSVP Deadline *
            </Text>
            <PickerRow
              pickerId="rsvpDeadline"
              dateIcon="📅"
              timeIcon="⏰"
              datePlaceholder="Deadline Date"
              timePlaceholder="Deadline Time"
            />
          </View>
        )}
      </>
    );
  }
);
