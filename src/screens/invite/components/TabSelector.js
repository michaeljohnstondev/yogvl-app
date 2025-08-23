import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { TABS, TAB_LABELS } from '../utils/inviteScreenConstants';
import styles from '../styles/inviteScreenStyles';

const TabSelector = ({ activeTab, setActiveTab }) => {
  const renderTabButton = (tab, label, buttonStyle) => {
    const isActive = activeTab === tab;
    
    return (
      <View style={buttonStyle}>
        <TouchableOpacity
          onPress={() => setActiveTab(tab)}
          style={[
            styles.tabToggleButton,
            isActive ? styles.tabToggleButtonActive : styles.tabToggleButtonInactive
          ]}
        >
          <Text style={[
            styles.tabToggleText,
            isActive ? styles.tabToggleTextActive : styles.tabToggleTextInactive
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View>
      <View style={styles.tabContainer}>
        {renderTabButton(TABS.APP, TAB_LABELS[TABS.APP], styles.appTabButton)}
        {renderTabButton(TABS.PHONE, TAB_LABELS[TABS.PHONE], styles.phoneTabButton)}
        {renderTabButton(TABS.MANUAL, TAB_LABELS[TABS.MANUAL], styles.manualTabButton)}
      </View>
    </View>
  );
};

export default TabSelector;