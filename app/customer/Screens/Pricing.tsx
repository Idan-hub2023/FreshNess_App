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
    { id: '1', name: 'Wash & Fold' },
    { id: '2', name: 'Dry Cleaning' },
    { id: '3', name: 'Ironing' },
  ];

      const baseURL = Platform.OS === 'android' 
    ? 'https://freshness-eakm.onrender.com/api' 
    : 'http://192.168.1.67:5000/api';
  
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
            icon: getIconForItem(item.name)
          })),
          'Dry Cleaning': data.map(item => ({
            id: item._id,
            name: item.name,
            price: formatPrice(item?.prices?.dryCleaning),
            icon: getIconForItem(item.name)
          })),
          'Ironing': data.map(item => ({
            id: item._id,
            name: item.name,
            price: formatPrice(item?.prices?.ironOnly),
            icon: getIconForItem(item.name)
          })),
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

  const formatPrice = (priceInCents) => {
    if (typeof priceInCents !== 'number') return 'N/A';
    return `${(priceInCents / 100).toFixed(2)} RWF`;
  };

  const getIconForItem = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('shirt')) return 'checkroom';
    if (lowerName.includes('pants')) return 'work';
    if (lowerName.includes('dress')) return 'style';
    if (lowerName.includes('coat') || lowerName.includes('jacket')) return 'checkroom';
    return 'local-laundry-service'; // default
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <MaterialIcons name={item.icon} size={24} color="#4a90e2" style={styles.itemIcon} />
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemPrice}>{item.price}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
        <Text style={styles.headerTitle}>Laundry Price List</Text>
        <Text style={styles.headerSubtitle}>Our transparent pricing</Text>
      </View>

      <View style={styles.categoryOuterContainer}>
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
              activeOpacity={0.7}
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

      <FlatList
        data={items[activeCategory]}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={() => (
          <View style={styles.tableHeader}>
            <Text style={styles.headerText}>Item</Text>
            <Text style={styles.headerText}>Price</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#4a90e2',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  categoryOuterContainer: {
    backgroundColor: '#f5f5f5',
  },
  categoryContainer: {
    paddingVertical: 10,
    paddingLeft: 15,
    paddingRight: 5,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
  },
  activeCategory: {
    backgroundColor: '#4a90e2',
  },
  categoryText: {
    color: '#555555',
    fontWeight: '600',
  },
  activeCategoryText: {
    color: 'white',
  },
  listContainer: {
    padding: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
  },
  headerText: {
    fontWeight: 'bold',
    color: '#555555',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  itemIcon: {
    width: 30,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    marginLeft: 10,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a90e2',
    minWidth: 70,
    textAlign: 'right',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    flex: 1,
  },
backButton: {
  position: 'absolute',
  left: 16,
  top: 16,
  padding: 10,
  zIndex: 10,
  backgroundColor: colors.accent, // Use your accent color
  borderRadius: 20,
  width: 40,
  height: 40,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
},
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LaundryPriceList;