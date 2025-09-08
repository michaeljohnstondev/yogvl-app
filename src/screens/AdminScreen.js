import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import theme from '../theme/themes';
import VibeButton from '../components/ui/VibeButton';
import CloseButton from '../components/ui/CloseButton';
import { 
  isGlobalAdmin, 
  getAllReportsForGlobalAdmin, 
  getReportStatsByStudio,
  updateReport,
  getStudioOptions 
} from '../services/adminService';
import { moderationService } from '../services/moderationService';
import ModerationActionModal from '../components/ui/ModerationActionModal';
import AdminNotificationTool from '../components/ui/AdminNotificationTool';
import NotificationTester from '../components/ui/NotificationTester';
import { VenueService } from '../services/VenueService';
import { StudioRequestService } from '../services/StudioRequestService';
import { migrateStudiosToFirebase } from '../scripts/migrateStudios';

export default function AdminScreen({ navigation }) {
  const { userData, currentUserId } = useAuth();
  
  // Reports management state
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedStudioFilter, setSelectedStudioFilter] = useState('all');
  const [reportStats, setReportStats] = useState({});
  const [showReportsSection, setShowReportsSection] = useState(false);
  
  // Moderation modal state
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('messages');
  
  // Venue seeding state
  const [seedingVenues, setSeedingVenues] = useState(false);
  
  // Studio migration state
  const [migratingStudios, setMigratingStudios] = useState(false);
  
  // Studio requests state
  const [studioRequests, setStudioRequests] = useState([]);
  const [loadingStudioRequests, setLoadingStudioRequests] = useState(false);

  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Handle venue seeding
  const handleSeedVenues = async () => {
    setSeedingVenues(true);
    try {
      await VenueService.seedGreenvilleVenues();
      Alert.alert(
        'Success',
        'Venues have been seeded successfully! The database now contains popular Greenville venues for address auto-population.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error seeding venues:', error);
      Alert.alert(
        'Error',
        'Failed to seed venues. Check console for details.',
        [{ text: 'OK' }]
      );
    } finally {
      setSeedingVenues(false);
    }
  };

  // Handle studio migration
  const handleMigrateStudios = async () => {
    setMigratingStudios(true);
    try {
      const summary = await migrateStudiosToFirebase();
      Alert.alert(
        'Migration Complete',
        `Successfully migrated ${summary.migrated} out of ${summary.total} studios to Firebase. ${summary.skipped > 0 ? `${summary.skipped} studios were skipped due to errors.` : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error migrating studios:', error);
      Alert.alert(
        'Migration Error',
        'Failed to migrate studios to Firebase. Check console for details.',
        [{ text: 'OK' }]
      );
    } finally {
      setMigratingStudios(false);
    }
  };

  // Reports Management Functions
  const loadReports = async () => {
    if (!isGlobalAdmin(userData)) {
      console.log('User is not a global admin, skipping reports load');
      return;
    }

    setLoadingReports(true);
    try {
      const allReports = await getAllReportsForGlobalAdmin(100);
      setReports(allReports);
      setReportStats(getReportStatsByStudio(allReports));
      console.log(`[AdminScreen] Loaded ${allReports.length} reports across all studios`);
    } catch (error) {
      console.error('[AdminScreen] Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports: ' + error.message);
    } finally {
      setLoadingReports(false);
    }
  };

  const openModerationModal = (report, action) => {
    setSelectedReport(report);
    setSelectedAction(action);
    setShowModerationModal(true);
  };

  const handleModerationAction = async (customMessage) => {
    try {
      let result;
      let successMessage;
      
      switch (selectedAction) {
        case 'warning':
          result = await moderationService.issueWarning(selectedReport, currentUserId, customMessage);
          successMessage = 'Warning issued';
          break;
        case 'strike':
          result = await moderationService.issueStrike(selectedReport, currentUserId, customMessage);
          successMessage = `Strike issued (${result.totalStrikes} total)`;
          break;
        case 'temp_ban':
          result = await moderationService.issueTempBan(selectedReport, 7, customMessage, currentUserId); // 7 day temp ban
          successMessage = 'Temporary ban issued (7 days)';
          break;
        case 'perm_ban':
          result = await moderationService.issuePermBan(selectedReport, customMessage, currentUserId);
          successMessage = 'Permanent ban issued';
          break;
        case 'dismiss':
          result = await moderationService.dismissReport(selectedReport, customMessage);
          successMessage = 'Report dismissed';
          break;
        default:
          throw new Error('Invalid moderation action');
      }
      
      // Close modal and reset state
      setShowModerationModal(false);
      setSelectedReport(null);
      setSelectedAction(null);
      
      // Refresh reports
      await loadReports();
      
      Alert.alert('Success', successMessage);
    } catch (error) {
      console.error('[AdminScreen] Error with moderation action:', error);
      Alert.alert('Error', 'Failed to complete moderation action: ' + error.message);
    }
  };

  const cancelModerationAction = () => {
    setShowModerationModal(false);
    setSelectedReport(null);
    setSelectedAction(null);
  };

  const filterReportsByStudio = (reports, studioFilter) => {
    if (studioFilter === 'all') {
      return reports;
    }
    return reports.filter(report => report.studioId === studioFilter);
  };

  const formatReportDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const handleViewReportedItem = (report) => {
    if (report.type === 'event' && report.reportedEvent) {
      // Navigate to EventDetail screen
      navigation.navigate('EventDetail', {
        eventId: report.reportedEvent.id,
        studioId: report.studioId,
        fromAdmin: true
      });
    } else if (report.type === 'user' && report.reportedUser) {
      // Navigate to HostProfile screen to view user profile
      navigation.navigate('HostProfile', {
        hostId: report.reportedUser.id,
        fromAdmin: true
      });
    }
  };

  const renderReportItem = ({ item: report }) => (
    <TouchableOpacity 
      style={styles.reportItem}
      onPress={() => handleViewReportedItem(report)}
      activeOpacity={0.7}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.reportType}>{report.type === 'user' ? 'User Report' : 'Event Report'}</Text>
        <Text style={styles.reportStudio}>{report.studioDisplayName}</Text>
      </View>
      
      <View style={styles.reportContent}>
        <Text style={styles.reportReason}>Reason: {report.reason}</Text>
        <Text style={styles.reportDate}>Reported: {formatReportDate(report.reportedAt)}</Text>
        <Text style={styles.reportBy}>By: {report.reporterInfo?.name || 'Unknown'}</Text>
        
        {report.type === 'user' && (
          <Text style={styles.reportTarget}>
            👤 {report.reportedUser?.reportedInfo?.name || 'Unknown User'}
          </Text>
        )}
        
        {report.type === 'event' && (
          <>
            <Text style={styles.reportTarget}>
              📅 {report.reportedEvent?.eventData?.title || 'Unknown Event'}
            </Text>
            <Text style={styles.reportEventDetails}>
              {report.reportedEvent?.eventData?.location} • {formatReportDate(report.reportedEvent?.eventData?.eventTimestamp)}
            </Text>
          </>
        )}
        
        <Text style={styles.tapToView}>Tap to view {report.type === 'event' ? 'event' : 'profile'}</Text>
      </View>
      
      <View style={styles.reportActions}>
        <Text style={[styles.reportStatus, { color: getStatusColor(report.status) }]}>
          {report.status.toUpperCase()}
        </Text>
        
        {report.status === 'pending' && (
          <View style={styles.reportButtons}>
            <TouchableOpacity 
              style={[styles.reportButton, { backgroundColor: theme.colors.vibeBlue }]}
              onPress={(e) => {
                e.stopPropagation();
                openModerationModal(report, 'warning');
              }}
            >
              <Text style={styles.reportButtonText}>Warning</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.reportButton, { backgroundColor: theme.colors.vibeYellow }]}
              onPress={(e) => {
                e.stopPropagation();
                openModerationModal(report, 'strike');
              }}
            >
              <Text style={styles.reportButtonText}>Strike</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.reportButton, { backgroundColor: theme.colors.vibeOrange }]}
              onPress={(e) => {
                e.stopPropagation();
                openModerationModal(report, 'temp_ban');
              }}
            >
              <Text style={styles.reportButtonText}>Temp Ban</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.reportButton, { backgroundColor: theme.colors.vibeRed }]}
              onPress={(e) => {
                e.stopPropagation();
                openModerationModal(report, 'perm_ban');
              }}
            >
              <Text style={styles.reportButtonText}>Perm Ban</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.reportButton, { backgroundColor: theme.colors.gray }]}
              onPress={(e) => {
                e.stopPropagation();
                openModerationModal(report, 'dismiss');
              }}
            >
              <Text style={styles.reportButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return theme.colors.vibePink;
      case 'reviewed': return theme.colors.vibeBlue;
      case 'resolved': return theme.colors.vibeGreen;
      case 'dismissed': return theme.colors.gray;
      default: return theme.colors.white;
    }
  };

  const getReportsSummary = () => {
    const filteredReports = filterReportsByStudio(reports, selectedStudioFilter);
    const pending = filteredReports.filter(r => r.status === 'pending').length;
    const total = filteredReports.length;
    
    if (selectedStudioFilter === 'all') {
      return `${total} total reports (${pending} pending) across all studios`;
    } else {
      const studioName = getStudioOptions().find(s => s.id === selectedStudioFilter)?.displayName || 'Unknown Studio';
      return `${total} reports (${pending} pending) in ${studioName}`;
    }
  };

  // Load studio requests
  const loadStudioRequests = async () => {
    setLoadingStudioRequests(true);
    try {
      const requests = await StudioRequestService.getPendingRequests();
      setStudioRequests(requests);
      console.log(`[AdminScreen] Loaded ${requests.length} studio requests`);
    } catch (error) {
      console.error('[AdminScreen] Error loading studio requests:', error);
      Alert.alert('Error', 'Failed to load studio requests: ' + error.message);
    } finally {
      setLoadingStudioRequests(false);
    }
  };

  // Handle studio request approval
  const handleApproveStudio = async (requestId) => {
    try {
      const result = await StudioRequestService.approveStudioRequest(requestId, currentUserId);
      if (result.success) {
        Alert.alert('Success', result.message);
        await loadStudioRequests();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('[AdminScreen] Error approving studio:', error);
      Alert.alert('Error', 'Failed to approve studio request');
    }
  };

  // Handle studio request rejection
  const handleRejectStudio = async (requestId, reason = '') => {
    try {
      const result = await StudioRequestService.rejectStudioRequest(requestId, currentUserId, reason);
      if (result.success) {
        Alert.alert('Success', result.message);
        await loadStudioRequests();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('[AdminScreen] Error rejecting studio:', error);
      Alert.alert('Error', 'Failed to reject studio request');
    }
  };

  const promptRejectReason = (requestId) => {
    Alert.prompt(
      'Reject Studio Request',
      'Please provide a reason for rejection (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: (reason) => handleRejectStudio(requestId, reason || '')
        }
      ],
      'plain-text'
    );
  };

  // Load reports when component mounts if user is global admin
  useEffect(() => {
    if (isGlobalAdmin(userData)) {
      setShowReportsSection(true);
      loadReports();
      loadStudioRequests();
    }
  }, [userData]);

  // Check if user is not a global admin
  if (!isGlobalAdmin(userData)) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <CloseButton onPress={handleGoBack} />
          <Text style={styles.headerTitle}>Admin Tools</Text>
        </View>
        <View style={styles.noAccessContainer}>
          <Text style={styles.noAccessText}>Access Denied</Text>
          <Text style={styles.noAccessSubtext}>You don't have admin privileges.</Text>
        </View>
      </View>
    );
  }

  const renderMessagesTab = () => (
    <View style={styles.tabContent}>
      <AdminNotificationTool currentUserId={currentUserId} />
    </View>
  );

  const renderReportsTab = () => (
    <View style={styles.tabContent}>
      {showReportsSection && (
        <View>
          <Text style={styles.sectionTitle}>Reports Management</Text>
          
          {/* Reports Summary */}
          <View style={styles.reportsSummary}>
            <Text style={styles.summaryText}>{getReportsSummary()}</Text>
            <VibeButton
              label={loadingReports ? "Loading..." : "Refresh Reports"}
              onPress={loadReports}
              variant="toggle"
              color="blue"
              disabled={loadingReports}
              style={styles.refreshButton}
            />
          </View>

          {/* Studio Filter */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filter by Studio:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
              {getStudioOptions().map((studio) => (
                <TouchableOpacity
                  key={studio.id}
                  style={[
                    styles.filterButton,
                    selectedStudioFilter === studio.id && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedStudioFilter(studio.id)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedStudioFilter === studio.id && styles.filterButtonTextActive
                  ]}>
                    {studio.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmptyComponent = () => {
    if (loadingReports) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      );
    }

    return (
      <Text style={styles.noReportsText}>
        {selectedStudioFilter === 'all' ? 'No reports found across all studios' : 'No reports found for this studio'}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CloseButton onPress={handleGoBack} />
        <Text style={styles.headerTitle}>Admin Tools</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'studios' && styles.activeTab]}
          onPress={() => setActiveTab('studios')}
        >
          <Text style={[styles.tabText, activeTab === 'studios' && styles.activeTabText]}>
            Studio Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'testing' && styles.activeTab]}
          onPress={() => setActiveTab('testing')}
        >
          <Text style={[styles.tabText, activeTab === 'testing' && styles.activeTabText]}>
            Testing
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'messages' ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {renderMessagesTab()}
        </ScrollView>
      ) : activeTab === 'reports' ? (
        <FlatList
          data={filterReportsByStudio(reports, selectedStudioFilter)}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderReportsTab}
          ListEmptyComponent={renderEmptyComponent}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : activeTab === 'studios' ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Studio Requests</Text>
            
            <View style={styles.reportsSummary}>
              <Text style={styles.summaryText}>
                {studioRequests.length} pending studio requests
              </Text>
              <VibeButton
                label={loadingStudioRequests ? "Loading..." : "Refresh"}
                onPress={loadStudioRequests}
                variant="toggle"
                color="blue"
                disabled={loadingStudioRequests}
                style={styles.refreshButton}
              />
            </View>

            {loadingStudioRequests ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
                <Text style={styles.loadingText}>Loading studio requests...</Text>
              </View>
            ) : studioRequests.length === 0 ? (
              <Text style={styles.noReportsText}>No pending studio requests</Text>
            ) : (
              studioRequests.map((request) => (
                <View key={request.id} style={styles.studioRequestItem}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestLocation}>
                      {request.cityName}, {request.stateName}
                    </Text>
                    <Text style={styles.requestCount}>
                      {request.requestCount} request{request.requestCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestDate}>
                      Requested: {formatReportDate(request.requestedAt)}
                    </Text>
                    {request.reason && (
                      <Text style={styles.requestReason}>
                        Reason: {request.reason}
                      </Text>
                    )}
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestButton, { backgroundColor: theme.colors.vibeGreen }]}
                      onPress={() => handleApproveStudio(request.id)}
                    >
                      <Text style={styles.requestButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.requestButton, { backgroundColor: theme.colors.vibeRed }]}
                      onPress={() => promptRejectReason(request.id)}
                    >
                      <Text style={styles.requestButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <NotificationTester />
          
          {/* Venue Management Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Venue Management</Text>
            <Text style={styles.sectionDescription}>
              Seed the database with popular Greenville venues for address auto-population.
            </Text>
            
            <VibeButton
              label={seedingVenues ? "Seeding Venues..." : "Seed Greenville Venues"}
              onPress={handleSeedVenues}
              variant="outline"
              color="green"
              disabled={seedingVenues}
              style={styles.seedButton}
            />
            
            <Text style={styles.noteText}>
              Note: This adds ~25 popular Greenville venues to the database. 
              When users type these venue names in CreateEvent, the address will auto-populate.
            </Text>
          </View>
          
          {/* Studio Migration Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Studio Migration</Text>
            <Text style={styles.sectionDescription}>
              Migrate hardcoded studios to Firebase database for dynamic management.
            </Text>
            
            <VibeButton
              label={migratingStudios ? "Migrating Studios..." : "Migrate Studios to Firebase"}
              onPress={handleMigrateStudios}
              variant="outline"
              color="blue"
              disabled={migratingStudios}
              style={styles.seedButton}
            />
            
            <Text style={styles.noteText}>
              Note: This is a one-time migration that moves all hardcoded studio data to Firebase. 
              After migration, studios will be managed dynamically through the Studio Requests system.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Moderation Action Modal */}
      <ModerationActionModal
        visible={showModerationModal}
        report={selectedReport}
        action={selectedAction}
        onConfirm={handleModerationAction}
        onCancel={cancelModerationAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.vibeBlue,
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.vibeBlue,
  },
  tabText: {
    color: theme.colors.gray,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.main,
  },
  activeTabText: {
    color: theme.colors.vibeBlue,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
  debugText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
    paddingBottom: 8,
  },
  buttonGrid: {
    gap: 10,
  },
  actionButton: {
    marginVertical: 0,
  },
  inputSection: {
    marginVertical: 16,
  },
  inputLabel: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    borderTopWidth: 1,
    borderTopColor: theme.colors.darkGray,
    marginTop: 20,
  },
  footerText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
  },
  searchButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },

  // Reports Management Styles
  reportsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  summaryText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    flex: 1,
  },
  refreshButton: {
    marginLeft: 12,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  filterScrollView: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: theme.colors.darkGray,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.vibeBlue,
  },
  filterButtonText: {
    color: theme.colors.white,
    fontSize: 12,
    fontFamily: theme.fonts.main,
  },
  filterButtonTextActive: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    marginTop: 8,
  },
  noReportsText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    paddingVertical: 40,
  },
  reportItem: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportType: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  reportStudio: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
  },
  reportContent: {
    flex: 1,
    marginVertical: 8,
  },
  reportReason: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
    fontWeight: '500',
  },
  reportDate: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    marginBottom: 2,
  },
  reportBy: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    marginBottom: 6,
  },
  reportTarget: {
    color: theme.colors.white,
    fontSize: 15,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
    fontWeight: '600',
  },
  reportEventDetails: {
    color: theme.colors.gray,
    fontSize: 13,
    fontFamily: theme.fonts.main,
    marginBottom: 6,
  },
  tapToView: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    fontStyle: 'italic',
    marginTop: 4,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportStatus: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  reportButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  reportButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reportButtonText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  sectionContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  sectionDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    marginBottom: 16,
    lineHeight: 20,
  },
  seedButton: {
    marginBottom: 12,
  },
  noteText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  // Studio requests styles
  studioRequestItem: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestLocation: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  requestCount: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  requestDetails: {
    marginBottom: 12,
  },
  requestDate: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  requestReason: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  requestButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
});