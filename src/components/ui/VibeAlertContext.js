import React, { createContext, useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import theme from '../../theme/themes';

const VibeAlertContext = createContext();

export const useVibeAlert = () => {
  const context = useContext(VibeAlertContext);
  if (!context) {
    throw new Error('useVibeAlert must be used within a VibeAlertProvider');
  }
  return context;
};

export const VibeAlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);

  const showAlert = (title, message, buttons = [{ text: 'OK' }], type = 'info') => {
    console.log('🚨 Context showAlert called:', { title, message, type });
    setAlert({ title, message, buttons, type, visible: true });
  };

  const hideAlert = () => {
    console.log('🚨 Context hideAlert called');
    setAlert(null);
  };

  const alertMethods = {
    alert: (title, message, buttons) => showAlert(title, message, buttons, 'info'),
    info: (title, message, buttons) => showAlert(title, message, buttons, 'info'),
    success: (title, message, buttons) => showAlert(title, message, buttons, 'success'),
    error: (title, message, buttons) => showAlert(title, message, buttons, 'error'),
    warning: (title, message, buttons) => showAlert(title, message, buttons, 'warning'),
    cyan: (title, message, buttons) => showAlert(title, message, buttons, 'cyan'),
    turquoise: (title, message, buttons) => showAlert(title, message, buttons, 'turquoise'),
    aqua: (title, message, buttons) => showAlert(title, message, buttons, 'aqua'),
    teal: (title, message, buttons) => showAlert(title, message, buttons, 'teal'),
    menu: (title, message, buttons) => showAlert(title, message, buttons, 'menu'),
    redmenu: (title, message, buttons) => showAlert(title, message, buttons, 'redmenu'),
    confirm: (title, message, onConfirm, onCancel) => {
      showAlert(title, message, [
        { text: 'Cancel', onPress: onCancel },
        { text: 'Confirm', onPress: onConfirm },
      ], 'confirm');
    },
    subscribe: (title, message, onUseDefaults, onCustomize, onCancel) => {
      showAlert(title, message, [
        { text: 'Use Defaults', onPress: onUseDefaults, style: 'primary' },
        { text: 'Customize', onPress: onCustomize, style: 'secondary' },
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
      ], 'subscribe');
    },
  };

  const getAlertColors = (type) => {
    switch (type) {
      case 'success':
        return { border: theme.colors.vibeGreen, icon: '✅' };
      case 'error':
        return { border: theme.colors.vibeRed, icon: '❌' };
      case 'warning':
        return { border: theme.colors.vibeOrange, icon: '⚠️' };
      case 'confirm':
        return { border: theme.colors.vibePurple, icon: '❓' };
      case 'subscribe':
        return { border: theme.colors.vibeBlue, icon: '🔔' };
      case 'menu':
        return { border: theme.colors.vibeBlue, icon: '👤' };
      case 'redmenu':
        return { border: theme.colors.vibeRed, icon: '🚨' };
      case 'cyan':
        return { border: theme.colors.vibeCyan, icon: '🔵' };
      case 'turquoise':
        return { border: theme.colors.vibeTurquoise, icon: '💎' };
      case 'aqua':
        return { border: theme.colors.vibeAqua, icon: '🌊' };
      case 'teal':
        return { border: theme.colors.vibeTeal, icon: '💠' };
      default:
        return { border: theme.colors.vibeBlue, icon: 'ℹ️' };
    }
  };

  const handleButtonPress = (onPress) => {
    console.log('🔘 Context button pressed');
    if (onPress) {
      onPress();
    }
    hideAlert();
  };

  return (
    <VibeAlertContext.Provider value={alertMethods}>
      {children}
      {alert && (
        <View style={styles.overlay}>
          <View style={styles.alertContainer}>
            <View style={[styles.alertBox, { borderColor: getAlertColors(alert.type).border }]}>
              <View style={styles.header}>
                <Text style={styles.icon}>{getAlertColors(alert.type).icon}</Text>
                <Text style={[styles.title, { color: getAlertColors(alert.type).border }]}>
                  {alert.title}
                </Text>
              </View>
              
              {alert.message ? (
                <Text style={styles.message}>{alert.message}</Text>
              ) : null}
              
              <View style={[styles.buttonContainer, (alert.type === 'subscribe' || alert.type === 'menu' || alert.type === 'redmenu') && styles.subscribeButtonContainer]}>
                {alert.buttons.map((button, index) => {
                  const isSubscribe = alert.type === 'subscribe';
                  const isMenu = alert.type === 'menu';
                  const isRedMenu = alert.type === 'redmenu';
                  const isPrimary = button.style === 'primary';
                  const isSecondary = button.style === 'secondary';
                  const isCancel = button.style === 'cancel';
                  const isLastButton = index === alert.buttons.length - 1;
                  
                  return (
                    <TouchableOpacity
                      key={`alert-button-${index}`}
                      style={[
                        styles.button,
                        isSubscribe && styles.subscribeButton,
                        isMenu && styles.menuButton,
                        isMenu && isLastButton && styles.menuCancelButton,
                        isRedMenu && styles.subscribeButton,
                        isRedMenu && isLastButton && styles.cancelButton,
                        isPrimary && styles.primaryButton,
                        isSecondary && styles.secondaryButton,
                        isCancel && styles.cancelButton,
                        !isSubscribe && !isMenu && !isRedMenu && { backgroundColor: getAlertColors(alert.type).border },
                        isRedMenu && !isLastButton && { 
                          backgroundColor: 'transparent', 
                          borderColor: getAlertColors(alert.type).border,
                          borderWidth: 2
                        }
                      ]}
                      onPress={() => handleButtonPress(button.onPress)}
                    >
                      <Text style={[
                        styles.buttonText,
                        isSecondary && styles.secondaryButtonText,
                        isCancel && styles.cancelButtonText,
                        isMenu && isLastButton && styles.cancelButtonText,
                        isRedMenu && isLastButton && styles.cancelButtonText,
                        isRedMenu && !isLastButton && { color: getAlertColors(alert.type).border }
                      ]}>
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      )}
    </VibeAlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  alertContainer: {
    width: '90%',
    maxWidth: 320,
  },
  alertBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  subscribeButtonContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
  },
  subscribeButton: {
    minWidth: '100%',
    borderWidth: 2,
  },
  menuButton: {
    minWidth: '100%',
    borderWidth: 1,
    backgroundColor: theme.colors.vibeBlue,
    borderColor: theme.colors.vibeBlue,
  },
  menuCancelButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.gray,
  },
  primaryButton: {
    backgroundColor: theme.colors.vibeBlue,
    borderColor: theme.colors.vibeBlue,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.vibeBlue,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.gray,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.vibeBlue,
  },
  cancelButtonText: {
    color: theme.colors.gray,
  },
});