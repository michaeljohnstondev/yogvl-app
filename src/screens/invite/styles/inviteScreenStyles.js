import { StyleSheet } from 'react-native';
import theme from '../../../theme/themes';

export default StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.vibeBlue,
  },
  headerLeft: {
    width: 50,
    alignItems: 'flex-start',
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 0,
    backgroundColor: theme.colors.vibeBlue,
    borderRadius: 8,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },

  // Limit indicator
  limitContainer: {
    padding: 16,
    alignItems: 'center',
  },
  limitText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100, // Add padding to prevent content from being hidden behind fixed button
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginVertical: 12,
    gap: 12,
  },
  tabToggleButton: {
    flex: 1,
    marginVertical: 0,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderRadius: theme.sizes.buttonRadius,
    alignItems: 'center',
  },
  tabToggleButtonActive: {
    borderColor: theme.colors.vibeGreen,
    backgroundColor: 'transparent',
  },
  tabToggleButtonInactive: {
    borderColor: theme.colors.gray,
    backgroundColor: 'transparent',
  },
  tabToggleText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
  tabToggleTextActive: {
    color: theme.colors.vibeGreen,
  },
  tabToggleTextInactive: {
    color: theme.colors.gray,
  },
  appTabButton: {
    flex: 1,
  },
  phoneTabButton: {
    flex: 1,
  },
  manualTabButton: {
    flex: 1,
  },

  // Tab content
  tabContent: {
    minHeight: 200,
    marginBottom: 20,
  },
  searchInput: {
    marginBottom: 16,
  },

  // Custom Groups
  groupContainer: {
    marginBottom: 16,
  },
  groupButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  groupButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  groupButtonText: {
    color: theme.colors.gray,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  groupHint: {
    color: theme.colors.gray,
    fontSize: 11,
    fontFamily: theme.fonts.main,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  privateGroupHint: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    fontWeight: '500',
    textAlign: 'left',
    marginTop: 5,
  },
  groupLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  groupLoadingText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  manageGroupsButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  manageGroupsText: {
    color: theme.colors.vibeBlue,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },

  // Filter toggles
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  filterToggles: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterToggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  filterToggleText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },

  itemsList: {
    gap: 8,
  },

  // Person items
  personItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  disabledItem: {
    opacity: 0.5,
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarButton: {
    padding: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  personAvatar: {
    fontSize: 24,
  },
  personDetails: {
    flex: 1,
  },
  personName: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  personEmail: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  maxText: {
    color: theme.colors.gray,
    fontSize: 10,
    fontWeight: 'bold',
  },

  // QR Code Tab
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 24,
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    width: '100%',
  },
  qrSubtitle: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrDescription: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },

  // Selected section
  selectedSection: {
    marginTop: 20,
    paddingBottom: 40,
  },
  selectedTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 16,
  },
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  selectedDetail: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
  },
  removeText: {
    color: theme.colors.vibeRed,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Loading and empty states
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    marginTop: 16,
  },
  loadButton: {
    alignSelf: 'center',
    marginVertical: 0,
  },
  emptyText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    paddingVertical: 40,
  },

  // Group Management Modal
  groupModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  groupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  groupModalTitle: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  groupModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  groupManageItem: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  groupManageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteGroupButton: {
    padding: 6,
    borderRadius: 6,
  },
  deleteGroupText: {
    fontSize: 16,
  },
  groupManageName: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  groupMemberCount: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  groupMembersList: {
    gap: 8,
    marginBottom: 12,
  },
  groupMemberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 10,
  },
  groupMemberName: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    flex: 1,
  },
  removeMemberButton: {
    padding: 4,
  },
  removeMemberText: {
    color: theme.colors.vibeRed,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addToGroupButton: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  addToGroupText: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  createGroupButton: {
    backgroundColor: theme.colors.vibeBackgroundGreen,
    borderWidth: 1,
    borderColor: theme.colors.vibeGreen,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginVertical: 20,
  },
  createGroupText: {
    color: theme.colors.vibeGreen,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },

  // Create Group Modal
  createGroupModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  createGroupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  createGroupModalTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  cancelButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontFamily: theme.fonts.main,
  },
  createButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  disabledButtonText: {
    color: theme.colors.gray,
  },
  createGroupContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  inputSection: {
    marginBottom: 40,
  },
  inputLabel: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  groupNameInput: {
    marginBottom: 8,
  },
  inputHint: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    lineHeight: 20,
  },
  emojiPreview: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  emojiPreviewLabel: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  emojiPreviewText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },

  // Subscriber filter info
  subscriberFilterInfo: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue + '50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  subscriberFilterText: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Bottom button
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30, // Extra padding for safe area
    borderTopWidth: 1,
    borderTopColor: theme.colors.vibeBlue,
  },
  inviteButton: {
    // VibeButton handles its own styling, just override margins if needed
    marginVertical: 0,
  },
});
