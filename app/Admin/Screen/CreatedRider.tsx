import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

type Rider = {
  _id: string;
  fullname: string;
  phone: number | string;
  email: string;
  profile?: string;
  role: string;
  assignedZone?: string | null;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  isActive?: boolean;
};

const API_URL = 'https://freshness-eakm.onrender.com/api/rider/user';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const RidersScreen = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const fetchRiders = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await api.get(`${API_URL}`);
      setRiders(response.data);
    } catch (err) {
      console.error('Error fetching riders:', err);
      let errorMessage = 'Failed to load riders. Please try again.';
      if (axios.isAxiosError(err) && err.response) {
        errorMessage = err.response.data.message || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPhoneForDisplay = (phone: number | string) => {
    return phone.toString();
  };

  const handleViewDetails = (rider: Rider) => {
    setSelectedRider(rider);
    setDetailModalVisible(true);
  };

  const handleImageError = (riderId: string) => {
    setImageErrors(prev => ({...prev, [riderId]: true}));
  };

  const onRefresh = React.useCallback(() => {
    fetchRiders();
  }, []);

  const filteredRiders = riders.filter(
    (rider) =>
      rider.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rider.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatPhoneForDisplay(rider.phone).includes(searchQuery)
  );

  const renderRiderCard = ({ item }: { item: Rider }) => (
    <TouchableOpacity 
      style={styles.riderCard}
      onPress={() => handleViewDetails(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          {item.profile && !imageErrors[item._id] ? (
            <Image
              style={styles.avatarImage}
              source={{ uri: item.profile }}
              resizeMode="cover"
              onError={() => handleImageError(item._id)}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.fullname.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{item.fullname}</Text>
          <View style={styles.roleContainer}>
            <Ionicons name="person" size={12} color="#6366f1" />
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
          {item.assignedZone && (
            <View style={styles.zoneContainer}>
              <Ionicons name="location" size={12} color="#10b981" />
              <Text style={styles.zoneText}>{item.assignedZone}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.contactItem}>
          <Ionicons name="call" size={14} color="#6b7280" />
          <Text style={styles.contactText}>{formatPhoneForDisplay(item.phone)}</Text>
        </View>
        <View style={styles.contactItem}>
          <Ionicons name="mail" size={14} color="#6b7280" />
          <Text style={styles.contactText}>{item.email}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.dateInfo}>
          <Ionicons name="calendar" size={12} color="#9ca3af" />
          <Text style={styles.dateText}>
            Joined {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={item.isActive ? "checkmark-circle" : "close-circle"} 
            size={12} 
            color={item.isActive ? "#10b981" : "#ef4444"} 
          />
          <Text style={[
            styles.statusText,
            { color: item.isActive ? "#10b981" : "#ef4444" }
          ]}>
            {item.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Riders Management</Text>
          <Text style={styles.subtitle}>Loading riders...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Riders Management</Text>
          <Text style={styles.subtitle}>{riders.length} riders registered</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRiders}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Riders Management</Text>
        <Text style={styles.subtitle}>{riders.length} riders registered</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search riders by name, email, or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredRiders}
        keyExtractor={(item) => item._id}
        renderItem={renderRiderCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No riders found' : 'No riders yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Add your first rider to get started'}
            </Text>
          </View>
        }
      />

      {/* Detail View Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rider Details</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {selectedRider && (
                <>
                  <View style={styles.detailAvatarContainer}>
                    {selectedRider.profile ? (
                      <Image
                        style={styles.detailAvatarImage}
                        source={{ uri: selectedRider.profile }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.detailAvatar}>
                        <Text style={styles.detailAvatarText}>
                          {selectedRider.fullname.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Basic Information</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="person" size={16} color="#6b7280" style={styles.detailIcon} />
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Full Name</Text>
                        <Text style={styles.detailValue}>{selectedRider.fullname}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="at" size={16} color="#6b7280" style={styles.detailIcon} />
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Role</Text>
                        <Text style={styles.detailValue}>{selectedRider.role}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={16} color="#6b7280" style={styles.detailIcon} />
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Member Since</Text>
                        <Text style={styles.detailValue}>{formatDate(selectedRider.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons 
                        name={selectedRider.isActive ? "checkmark-circle" : "close-circle"} 
                        size={16} 
                        color={selectedRider.isActive ? "#10b981" : "#ef4444"} 
                        style={styles.detailIcon} 
                      />
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Status</Text>
                        <Text style={[
                          styles.detailValue,
                          { color: selectedRider.isActive ? "#10b981" : "#ef4444" }
                        ]}>
                          {selectedRider.isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Contact Information</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={16} color="#6b7280" style={styles.detailIcon} />
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{formatPhoneForDisplay(selectedRider.phone)}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={16} color="#6b7280" style={styles.detailIcon} />
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{selectedRider.email}</Text>
                      </View>
                    </View>
                  </View>

                  {selectedRider.assignedZone && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Assignment</Text>
                      <View style={styles.detailRow}>
                        <Ionicons name="location" size={16} color="#6b7280" style={styles.detailIcon} />
                        <View style={styles.detailTextContainer}>
                          <Text style={styles.detailLabel}>Assigned Zone</Text>
                          <Text style={styles.detailValue}>{selectedRider.assignedZone}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  listContainer: {
    padding: 20,
    paddingTop: 16,
  },
  riderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  zoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  zoneText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10b981',
    marginLeft: 4,
  },
  contactInfo: {
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Detail Modal Styles
  detailAvatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  detailAvatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#ffffff',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
  }
});

export default RidersScreen;