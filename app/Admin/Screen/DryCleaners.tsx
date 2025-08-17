import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
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

type DryCleaner = {
  _id: string;
  name: string;
  phone: string;
  locationName: string;
  latitude: number;
  longitude: number;
  __v: number;
};

type Admin = {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

const API_URL = Platform.OS === 'android' 
  ? 'https://freshness-eakm.onrender.com/api' 
  : 'http://192.168.1.67:5000/api/rider';

const AdminDashboard = () => {
  const [dryCleaners, setDryCleaners] = useState<DryCleaner[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdmins, setShowAdmins] = useState(false);
  const [selectedDryCleaner, setSelectedDryCleaner] = useState<DryCleaner | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Fetch dry cleaners
      const cleanersResponse = await axios.get(`${API_URL}/drycleaner`);
      setDryCleaners(cleanersResponse.data);
      
      // Fetch admins
      const adminsResponse = await axios.get(`${API_URL}/admins`);
      setAdmins(adminsResponse.data);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    fetchData();
  };

  const handleViewDetails = (cleaner: DryCleaner) => {
    setSelectedDryCleaner(cleaner);
    setModalVisible(true);
  };

  const filteredDryCleaners = dryCleaners.filter(cleaner =>
    cleaner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cleaner.phone.includes(searchQuery) ||
    cleaner.locationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderDryCleanerItem = ({ item }: { item: DryCleaner }) => (
    <TouchableOpacity 
      style={styles.cleanerCard}
      onPress={() => handleViewDetails(item)}
    >
      <View style={styles.cleanerHeader}>
        <View style={styles.avatar}>
          <Ionicons name="shirt" size={24} color="#ffffff" />
        </View>
        <View style={styles.cleanerInfo}>
          <Text style={styles.cleanerName}>{item.name}</Text>
          <Text style={styles.cleanerLocation}>{item.locationName}</Text>
        </View>
      </View>
      <View style={styles.cleanerFooter}>
        <View style={styles.contactInfo}>
          <Ionicons name="call" size={16} color="#6b7280" />
          <Text style={styles.contactText}>{item.phone}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAdminItem = ({ item }: { item: Admin }) => (
    <View style={styles.adminCard}>
      <View style={styles.adminHeader}>
        <View style={styles.adminAvatar}>
          <Ionicons name="person" size={20} color="#ffffff" />
        </View>
        <View style={styles.adminInfo}>
          <Text style={styles.adminName}>{item.name}</Text>
          <Text style={styles.adminEmail}>{item.phone}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {showAdmins ? 'Admin Registrations' : 'Registered Dry Cleaners'}
        </Text>
        <Text style={styles.subtitle}>
          {showAdmins 
            ? `${admins.length} admins registered`
            : `${dryCleaners.length} dry cleaners registered`}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${showAdmins ? 'admins' : 'dry cleaners'}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => {
          setShowAdmins(!showAdmins);
          setSearchQuery('');
        }}
      >
        <Text style={styles.toggleButtonText}>
          {showAdmins ? 'View Dry Cleaners' : 'View Admin Registrations'}
        </Text>
      </TouchableOpacity>

      {showAdmins ? (
        <FlatList
          data={admins}
          keyExtractor={(item) => item._id}
          renderItem={renderAdminItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No admins registered yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredDryCleaners}
          keyExtractor={(item) => item._id}
          renderItem={renderDryCleanerItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shirt-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching dry cleaners found' : 'No dry cleaners registered yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* Dry Cleaner Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="arrow-back" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Dry Cleaner Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedDryCleaner && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailAvatar}>
                <Ionicons name="shirt" size={48} color="#ffffff" />
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Basic Information</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="business" size={20} color="#6b7280" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{selectedDryCleaner.name}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={20} color="#6b7280" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedDryCleaner.phone}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Location</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={20} color="#6b7280" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>{selectedDryCleaner.locationName}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="map" size={20} color="#6b7280" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Coordinates</Text>
                    <Text style={styles.detailValue}>
                      {selectedDryCleaner.latitude}, {selectedDryCleaner.longitude}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
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
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
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
  toggleButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  cleanerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cleanerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cleanerInfo: {
    flex: 1,
  },
  cleanerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cleanerLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  cleanerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  adminCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  adminEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  adminFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  adminRole: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    padding: 16,
  },
  detailAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
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
  detailText: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
  },
});

export default AdminDashboard;