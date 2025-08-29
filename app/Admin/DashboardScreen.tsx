import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const managementSections = [
    {
      id: "users",
      label: "Users",
      icon: "people-outline",
      color: "#4A90E2",
      backgroundColor: "#F0F7FF",
      onPress: () => router.push("/Admin/Screen/UsersScreen"),
    },
    {
      id: "riders",
      label: "Riders",
      icon: "bicycle-outline",
      color: "#50C878",
      backgroundColor: "#F0FFF4",
      onPress: () => router.push('/Admin/Screen/RidersScreen')
    },
    {
      id: "orders",
      label: "Orders & Status",
      icon: "receipt-outline",
      color: "#FF6B35",
      backgroundColor: "#FFF5F0",
      onPress: () => router.push('/Admin/Screen/OrdersScreen')
    },
    {
      id: "LoggedInRider",
      label: "Logged In Rider",
      icon: "person-outline",
      color: "#FF6B35",
      backgroundColor: "#FFF5F0",
      onPress: () => router.push('/Admin/Screen/CreatedRider')
    },
    {
      id: "pricing",
      label: "Pricing",
      icon: "pricetag-outline",
      color: "#9B59B6",
      backgroundColor: "#F8F4FF",
      onPress: () => router.push('/Admin/Screen/PricingScreen')
    },
    {
      id: "reports",
      label: "Reports",
      icon: "bar-chart-outline",
      color: "#E74C3C",
      backgroundColor: "#FFF0F0",
      onPress: () => router.push('/Admin/Screen/Report')
    },
  ];

  useFocusEffect(
  React.useCallback(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/auth/login'); // Or the route to your login screen
      }
    };
    checkAuth();
  }, [])
);


  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        return true; 
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );
      return () => backHandler.remove();
    }, [])
  );

  const renderCard = (section, index) => {
    const animatedStyle = {
      opacity: fadeAnim,
      transform: [
        {
          translateY: slideAnim,
        },
      ],
    };

    return (
      <Animated.View
        key={section.id}
        style={[styles.cardWrapper, animatedStyle]}
      >
        <TouchableOpacity
          style={[styles.card, { backgroundColor: section.backgroundColor }]}
          activeOpacity={0.8}
          onPress={section.onPress}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: section.color }]}>
              <Icon
                name={section.icon}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.cardArrow}>
              <Icon name="chevron-forward" size={18} color="#C1C1C1" />
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>{section.label}</Text>
          </View>
          
          <View style={styles.cardFooter}>
            <View style={[styles.progressBar, { backgroundColor: `${section.color}20` }]}>
              <View style={[styles.progressFill, { backgroundColor: section.color, width: '75%' }]} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Animated.View style={[styles.headerContainer, { opacity: fadeAnim }]}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>You are welcome</Text>
              <Text style={styles.adminText}>Administrator</Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          
          </Animated.View>

          {/* Management Section */}
          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Management Center</Text>
              <Text style={styles.sectionSubtitle}>
                Comprehensive tools to manage your platform efficiently
              </Text>
            </View>

            <View style={styles.cardsContainer}>
              {managementSections.map((section, index) => renderCard(section, index))}
            </View>
          </View>

          {/* Quick Actions */}
          <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/Admin/Screen/DryCleaners')}
              >
                <Icon name="list-outline" 
                size={20} 
                color="#4A90E2"
                 />
                <Text style={styles.quickActionText}>List Of dry cleaners</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionButton} onPress={()=>router.push('./Screen/AddDry')}>
                <Icon 
                name="add-circle-outline" 
                size={20} 
                color="#50C878"
                onPress={()=>router.push('./Screen/AddDry')}
                 />
                <Text style={styles.quickActionText}>Add Dry Cleaner</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  adminText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginTop: 4,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F8FAFB',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: (width - 60) / 2,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    marginBottom: 16,
  },
  cardCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    lineHeight: 20,
  },
  cardFooter: {
    marginTop: 'auto',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  quickActions: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 8,
  },
});