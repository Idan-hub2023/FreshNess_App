import colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LaundryPriceList = () => {
  const [activeCategory, setActiveCategory] = useState('Wash & Fold');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const router = useRouter();

  const categories = [
    { id: '1', name: 'Wash & Fold', key: 'washAndFold' },
    { id: '2', name: 'Dry Cleaning', key: 'dryCleaning' },
    { id: '3', name: 'Ironing', key: 'ironOnly' },
    { id: '4', name: 'Wash & Iron', key: 'washAndIron' },
  ];

  const baseURL = 'https://freshness-eakm.onrender.com/api';

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get(`${baseURL}/items`);
        const data = response.data;

        const transformedItems = {
          'Wash & Fold': data.map(item => ({
            id: item._id,
            name: item.name,
            price: formatPrice(item?.prices?.washAndFold),
            icon: getIconForItem(item.name),
            available: item?.prices?.washAndFold > 0
          })).filter(item => item.available),
          
          'Dry Cleaning': data.map(item => ({
            id: item._id,
            name: item.name,
            price: formatPrice(item?.prices?.dryCleaning),
            icon: getIconForItem(item.name),
            available: item?.prices?.dryCleaning > 0
          })).filter(item => item.available),
          
          'Ironing': data.map(item => ({
            id: item._id,
            name: item.name,
            price: formatPrice(item?.prices?.ironOnly),
            icon: getIconForItem(item.name),
            available: item?.prices?.ironOnly > 0
          })).filter(item => item.available),

          'Wash & Iron': data.map(item => ({
            id: item._id,
            name: item.name,
            price: formatPrice(item?.prices?.washAndIron),
            icon: getIconForItem(item.name),
            available: item?.prices?.washAndIron > 0
          })).filter(item => item.available),
        };

        setItems(transformedItems);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch items:', err);
        setError('Could not load laundry prices. Please try again.');
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const formatPrice = (price) => {
    if (!price || typeof price !== 'number' || price <= 0) return null;
    return `${price.toLocaleString()} RWF`;
  };

  const getIconForItem = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('shirt') || lowerName.includes('blouse')) return 'checkroom';
    if (lowerName.includes('pants') || lowerName.includes('trouser')) return 'work';
    if (lowerName.includes('dress') || lowerName.includes('skirt')) return 'style';
    if (lowerName.includes('coat') || lowerName.includes('jacket') || lowerName.includes('blazer')) return 'dry_cleaning';
    if (lowerName.includes('suit')) return 'business_center';
    if (lowerName.includes('tie')) return 'work_outline';
    if (lowerName.includes('curtain') || lowerName.includes('bedsheet')) return 'home';
    if (lowerName.includes('towel')) return 'shower';
    return 'local-laundry-service'; // default
  };

  const renderItem = ({ item, index }) => (
    <View style={[styles.itemCard, index % 2 === 0 && styles.evenCard]}>
      <View style={styles.itemLeft}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={item.icon} size={28} color={colors.accent || "#4a90e2"} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.serviceText}>Per piece</Text>
        </View>
      </View>
      <View style={styles.priceContainer}>
        <Text style={styles.itemPrice}>{item.price}</Text>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="local-laundry-service" size={64} color="#cccccc" />
      <Text style={styles.emptyText}>No items available for this service</Text>
      <Text style={styles.emptySubtext}>Please check other categories</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.accent || "#4a90e2"} />
        <Text style={styles.loadingText}>Loading prices...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialIcons name="error-outline" size={64} color="#ff6b6b" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setLoading(true);
          setError(null);
        }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentItems = items[activeCategory] || [];
  const currentCategory = categories.find(cat => cat.name === activeCategory);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Laundry Prices</Text>
          <Text style={styles.headerSubtitle}>Transparent & Affordable Pricing</Text>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                activeCategory === category.name && styles.activeCategory
              ]}
              onPress={() => setActiveCategory(category.name)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.categoryText,
                activeCategory === category.name && styles.activeCategoryText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Items List */}
      <View style={styles.listSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{activeCategory} Prices</Text>
          <Text style={styles.itemCount}>
            {currentItems.length} item{currentItems.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <FlatList
          data={currentItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: colors.accent || '#4a90e2',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    marginLeft: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  categorySection: {
    backgroundColor: 'white',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryContainer: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeCategory: {
    backgroundColor: colors.accent || '#4a90e2',
    borderColor: colors.accent || '#4a90e2',
  },
  categoryText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 14,
  },
  activeCategoryText: {
    color: 'white',
  },
  listSection: {
    flex: 1,
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  itemCount: {
    fontSize: 14,
    color: '#666666',
    backgroundColor: colors.accent || '#4a90e2',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  evenCard: {
    backgroundColor: '#fafbfc',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background || '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  serviceText: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent || '#4a90e2',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.accent || '#4a90e2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default LaundryPriceList;