import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';
import VibeNotificationBanner from '../notifications/VibeNotificationBanner';

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
  const [banner, setBanner] = useState(null);

  const showAlert = useCallback((
    title,
    message,
    buttons = [{ text: 'OK' }],
    type = 'info'
  ) => {
    console.log('🚨 Context showAlert called:', { title, message, type });
    setAlert({ title, message, buttons, type, visible: true });
  }, []);

  const hideAlert = useCallback(() => {
    console.log('🚨 Context hideAlert called');
    setAlert(null);
  }, []);

  const showBanner = (
    title,
    message,
    type = 'info',
    onPress = null,
    autoHide = true,
    duration = 4000
  ) => {
    console.log('🔔 Banner showBanner called:', { title, message, type });
    setBanner({
      title,
      message,
      type,
      onPress,
      autoHide,
      duration,
      visible: true,
    });
  };

  const hideBanner = () => {
    console.log('🔔 Banner hideBanner called');
    setBanner(null);
  };

  const alertMethods = useMemo(() => ({
    alert: (title, message, buttons) =>
      showAlert(title, message, buttons, 'info'),
    info: (title, message, buttons) =>
      showAlert(title, message, buttons, 'info'),
    success: (title, message, buttons) =>
      showAlert(title, message, buttons, 'success'),
    error: (title, message, buttons) =>
      showAlert(title, message, buttons, 'error'),
    warning: (title, message, buttons) =>
      showAlert(title, message, buttons, 'warning'),
    cyan: (title, message, buttons) =>
      showAlert(title, message, buttons, 'cyan'),
    turquoise: (title, message, buttons) =>
      showAlert(title, message, buttons, 'turquoise'),
    aqua: (title, message, buttons) =>
      showAlert(title, message, buttons, 'aqua'),
    teal: (title, message, buttons) =>
      showAlert(title, message, buttons, 'teal'),
    menu: (title, message, buttons) =>
      showAlert(title, message, buttons, 'menu'),
    redmenu: (title, message, buttons) =>
      showAlert(title, message, buttons, 'redmenu'),
    confirm: (title, message, onConfirm, onCancel) => {
      showAlert(
        title,
        message,
        [
          { text: 'Confirm', onPress: onConfirm },
          { text: 'Cancel', onPress: onCancel },
        ],
        'confirm'
      );
    },
    subscribe: (title, message, onUseDefaults, onCustomize, onCancel) => {
      showAlert(
        title,
        message,
        [
          { text: 'Use Defaults', onPress: onUseDefaults, style: 'primary' },
          { text: 'Customize', onPress: onCustomize, style: 'secondary' },
          { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        ],
        'subscribe'
      );
    },
    joinedEvent: (title, message, onViewEvent, onCustomizeAlerts, onInviteFriends, onGoHome, onCancel) => {
      showAlert(
        title,
        message,
        [
          { text: 'View Event', onPress: onViewEvent, style: 'green' },
          { text: 'Customize Alerts', onPress: onCustomizeAlerts, style: 'blue' },
          { text: 'Invite Friends', onPress: onInviteFriends, style: 'blue' },
          { text: 'Go Home', onPress: onGoHome, style: 'blue' },
          { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        ],
        'joinedEvent'
      );
    },
    // Banner notification methods
    banner: showBanner,
    hideBanner,
    notificationBanner: (title, message, type, onPress) =>
      showBanner(title, message, type, onPress, true, 4000),
  }), [showAlert, showBanner, hideBanner]);

  const getAlertColors = (type) => {
    switch (type) {
      case 'success':
        return { border: theme.colors.vibeGreen, icon: '✅' };
      case 'error':
        return { border: theme.colors.vibeRed, icon: '❌' };
      case 'warning':
        return { border: theme.colors.vibeOrange, icon: '⚠️' };
      case 'confirm':
        return { border: '#0072ff', icon: '' };
      case 'subscribe':
        return { border: theme.colors.vibeBlue, icon: '🔔' };
      case 'joinedEvent':
        return { border: theme.colors.vibeBlue, icon: '🎉' };
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
        return { border: '#00FFFF', icon: 'ℹ️' };
    }
  };

  const handleButtonPress = (onPress, shouldHide = true) => {
    console.log('🔘 Context button pressed');
    if (onPress) {
      onPress();
    }
    if (shouldHide) {
      hideAlert();
    }
  };

  return (
    <VibeAlertContext.Provider value={alertMethods}>
      {children}
      {banner && (
        <VibeNotificationBanner
          title={banner.title}
          message={banner.message}
          type={banner.type}
          visible={banner.visible}
          onPress={banner.onPress}
          onDismiss={hideBanner}
          autoHide={banner.autoHide}
          duration={banner.duration}
        />
      )}
      {alert && (
        <View style={styles.overlay}>
          <View style={styles.alertContainer}>
            <View
              style={[
                styles.alertBox,
                { borderColor: getAlertColors(alert.type).border },
                alert.type === 'joinedEvent' && styles.blueTintedBackground,
              ]}
            >
              <View style={styles.header}>
                <Text style={styles.icon}>
                  {getAlertColors(alert.type).icon}
                </Text>
                <Text
                  style={[
                    styles.title,
                    { color: alert.type === 'confirm' ? '#00FFFF' : getAlertColors(alert.type).border },
                  ]}
                >
                  {alert.title}
                </Text>
              </View>

              {alert.message ? (
                <Text style={styles.message}>{alert.message}</Text>
              ) : null}

              <View
                style={[
                  styles.buttonContainer,
                  (alert.type === 'subscribe' ||
                    alert.type === 'joinedEvent' ||
                    alert.type === 'menu' ||
                    alert.type === 'redmenu') &&
                    styles.subscribeButtonContainer,
                ]}
              >
                {alert.buttons.map((button, index) => {
                  const isSubscribe = alert.type === 'subscribe';
                  const isJoinedEvent = alert.type === 'joinedEvent';
                  const isMenu = alert.type === 'menu';
                  const isRedMenu = alert.type === 'redmenu';
                  const isPrimary = button.style === 'primary';
                  const isSecondary = button.style === 'secondary';
                  const isGreen = button.style === 'green';
                  const isBlue = button.style === 'blue';
                  const isCancel = button.style === 'cancel';
                  const isLastButton = index === alert.buttons.length - 1;

                  return (
                    <TouchableOpacity
                      key={`alert-button-${index}`}
                      style={[
                        styles.button,
                        (isSubscribe || isJoinedEvent) && styles.subscribeButton,
                        isMenu && styles.menuButton,
                        isMenu && isLastButton && styles.menuCancelButton,
                        isRedMenu && styles.subscribeButton,
                        isRedMenu && isLastButton && styles.cancelButton,
                        isPrimary && styles.primaryButton,
                        isSecondary && styles.secondaryButton,
                        isGreen && styles.greenButton,
                        isBlue && styles.blueButton,
                        isCancel && !isJoinedEvent && styles.cancelButton,
                        isCancel && isJoinedEvent && styles.redCancelButton,
                        !isSubscribe &&
                          !isJoinedEvent &&
                          !isMenu &&
                          !isRedMenu &&
                          !isGreen &&
                          !isBlue &&
                          !isCancel && {
                            backgroundColor: getAlertColors(alert.type).border,
                          },
                        isRedMenu &&
                          !isLastButton && {
                            backgroundColor: 'transparent',
                            borderColor: getAlertColors(alert.type).border,
                            borderWidth: 2,
                          },
                      ]}
                      onPress={() => handleButtonPress(button.onPress)}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isSecondary && styles.secondaryButtonText,
                          isCancel && !isJoinedEvent && styles.cancelButtonText,
                          isCancel && isJoinedEvent && styles.redCancelButtonText,
                          isMenu && isLastButton && styles.cancelButtonText,
                          isRedMenu && isLastButton && styles.cancelButtonText,
                          isRedMenu &&
                            !isLastButton && {
                              color: getAlertColors(alert.type).border,
                            },
                        ]}
                      >
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999999,
  },
  alertContainer: {
    width: '90%',
    maxWidth: 320,
  },
  alertBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 3,
    padding: 20,
  },
  blueTintedBackground: {
    backgroundColor: 'rgba(0, 40, 80, 0.95)', // Dark blue background with slight transparency
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
    fontWeight: '700',
    color: '#00f2fe',
    flex: 1,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
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
    borderBottomWidth: 4,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00FFFF',
  },
  subscribeButton: {
    minWidth: '100%',
    borderBottomWidth: 4,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
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
    backgroundColor: '#0072ff',
    borderColor: '#00FFFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#00FFFF',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.gray,
  },
  redCancelButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.vibeOrange, // Orange border for error/destructive actions
    borderWidth: 3,
  },
  greenButton: {
    backgroundColor: theme.colors.vibeForest, // Forest green background
    borderColor: theme.colors.vibeForest, // Forest green border (matching background)
  },
  blueButton: {
    backgroundColor: '#0072ff',
    borderColor: '#00FFFF',
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#00FFFF',
  },
  cancelButtonText: {
    color: theme.colors.gray,
  },
  redCancelButtonText: {
    color: theme.colors.vibeRed,
  },
});
