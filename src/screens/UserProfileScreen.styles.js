import { StyleSheet } from 'react-native';
import theme from '../theme/themes';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  avatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
    position: 'relative',
  },
  closeButton: {
    // Default CloseButton styling
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.vibeBlue,
  },
  editButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  topButtonsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  topButtonsRightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButtonText: {
    fontSize: 18,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  profileInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  profilePictureContainer: {
    alignItems: 'center',
    gap: 12,
  },
  editingSection: {
    width: '100%',
    gap: 12,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.vibeBlue,
    shadowColor: theme.colors.vibeBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  avatarText: {
    color: theme.colors.vibeBlue,
    fontSize: 40,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
    textShadowColor: theme.colors.vibeBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  userEmail: {
    color: theme.colors.gray,
    fontSize: 16,
    marginBottom: 15,
    fontFamily: theme.fonts.main,
  },
  reliabilityContainer: {
    marginTop: 10,
  },
  joinDate: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  editInput: {
    marginBottom: 10,
    width: 250,
  },
  contactContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  contactDivider: {
    height: 1,
    backgroundColor: theme.colors.vibeBlue,
  },
  requiredMissing: {
    color: theme.colors.vibeRed,
    fontStyle: 'italic',
  },
  requiredText: {
    color: theme.colors.vibeRed,
    fontSize: 12,
  },
  contactInput: {
    marginBottom: 0,
    flex: 1,
  },
  nameEditContainer: {
    flex: 1,
    gap: 8,
  },
  nameInput: {
    marginBottom: 0,
  },
  cardSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  aboutSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  aboutContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  aboutTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  aboutItem: {
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  aboutText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  activitySection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  activityContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  activityTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  socialSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  socialContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  socialTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00C6FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  contactSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  contactContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  contactTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  bioCard: {
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  bioText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  bioInput: {
    minHeight: 100,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    width: '100%',
  },
  settingsButton: {
    marginBottom: 12,
  },
  buttonSeparator: {
    height: 1,
    backgroundColor: theme.colors.vibeBlue,
    marginVertical: 20,
  },
  actionButton: {
    marginBottom: 12,
  },
  qrSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  qrContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  qrTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  socialButtonContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  followButton: {
    alignSelf: 'stretch',
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: 16,
    textAlign: 'center',
  },
});