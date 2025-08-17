import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });

    const fadeIn = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    });

    const slideIn = Animated.timing(slideAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    });

    Animated.parallel([fadeIn, slideIn]).start();

    return () => {
      backHandler.remove();
    };
  }, []);

  const navigationItems = useMemo(
    () => [
      {
        id: 'Book Laundry Pickup ',
        icon: 'schedule',
        title: 'Book Laundry Pickup ',
        color: '#2563EB',
        gradient: ['#2563EB', '#3B82F6'],
        description: 'Book your next laundry pickup',
        badge: 'Popular',
        onPress: () => router.push('/customer/Screens/Book'),
      },
      {
        id: 'track',
        icon: 'track-changes',
        title: 'Track Order',
        color: '#1D4ED8',
        gradient: ['#1D4ED8', '#2563EB'],
        description: 'Real-time order monitoring',
        onPress: () => router.push('/customer/Screens/Track'),
      },
      {
        id: 'pricing',
        icon: 'local-offer',
        title: 'View Pricing',
        color: '#1E40AF',
        gradient: ['#1E40AF', '#1D4ED8'],
        description: 'Transparent pricing structure',
        onPress: () => router.push('/customer/Screens/Pricing'),
      },
      {
        id: 'orders',
        icon: 'history',
        title: 'Order History',
        color: '#60A5FA',
        gradient: ['#60A5FA', '#3B82F6'],
        description: 'Access your complete history',
        onPress: () => router.push('/customer/Screens/Orders'),
      },
    ],
    []
  );

  useFocusEffect(
    React.useCallback(() => {
      const checkAuth = async () => {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          router.replace('/auth/login');
        }
      };

      const onBackPress = () => {
        Alert.alert(
          'Hold on!',
          'Please use the logout button to exit.',
          [{ text: 'OK', style: 'cancel' }],
          { cancelable: true }
        );
        return true;
      };

      checkAuth();
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [])
  );

  const renderQuickStat = (stat, index) => (
    <Animated.View
      key={stat.label}
      style={[
        styles.statCard,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <MaterialIcon name={stat.icon} size={24} color={colors.primary} />
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </Animated.View>
  );

  const renderNavigationCard = (item, index) => (
    <Animated.View
      key={item.id}
      style={[
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.modernCard}
        onPress={item.onPress}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.modernIconContainer}>
              <MaterialIcon name={item.icon} size={28} color="white" />
            </View>
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </View>
          <View style={styles.modernCardContent}>
            <Text style={styles.modernCardTitle}>{item.title}</Text>
            <Text style={styles.modernCardDescription}>{item.description}</Text>
          </View>
          <View style={styles.cardArrow}>
            <Icon name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#2563EB"
        translucent={false}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Premium Header Section */}
        <Animated.View
          style={[
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#2563EB', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumHeader}
          >
            <View style={styles.headerContent}>
              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.brandTitle}>Freshness</Text>
              <Text style={styles.tagline}>
                Experience luxury laundry services with professional care
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Hero Section with Enhanced Design */}
        <Animated.View 
          style={[
            styles.enhancedHeroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.premiumImageWrapper}>
            <View style={styles.imageGlow} />
            <Image
              source={require('../../assets/images/Laundry and dry cleaning-pana.png')}
              style={styles.premiumHeroImage}
            />
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={styles.premiumHeroText}>
              Premium Laundry Experience
            </Text>
            <Text style={styles.premiumHeroSubtext}>
              Professional cleaning with same-day delivery and eco-friendly processes
            </Text>
          </View>
        </Animated.View>

        {/* Modern Services Grid */}
        <View style={styles.servicesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.modernSectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionSubtitle}>Choose your service</Text>
          </View>
          <View style={styles.servicesGrid}>
            {navigationItems.map(renderNavigationCard)}
          </View>
        </View>

        {/* Premium Features Section */}
        <Animated.View 
          style={[
            styles.featuresSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.featuresTitle}>Why Choose Freshness?</Text>
          <View style={styles.featuresList}>
            {[
              { icon: 'verified', text: 'Certified professionals', color: '#2563EB' },
              { icon: 'eco', text: 'Eco-friendly processes', color: '#3B82F6' },
              { icon: 'schedule', text: '24/7 customer support', color: '#1D4ED8' },
              { icon: 'local-shipping', text: 'Same-day delivery', color: '#1E40AF' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <MaterialIcon name={feature.icon} size={20} color={feature.color} />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Enhanced Footer */}
        <LinearGradient
          colors={['#1E40AF', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumFooter}
        >
          <View style={styles.footerContent}>
            <Text style={styles.footerTitle}>Need Assistance?</Text>
            <Text style={styles.premiumFooterText}>
              Our premium support team is available 24/7 to help you
            </Text>
            <TouchableOpacity style={styles.contactButton}>
              <MaterialIcon name="support-agent" size={20} color="white" />
              <Text style={styles.contactButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingBottom: 90,
  },
  
  // Premium Header Styles
  premiumHeader: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: width * 0.85,
  },

  // Quick Stats Styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: -15,
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },

  // Enhanced Hero Section
  enhancedHeroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
    backgroundColor: '#F0F5FF',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
  },
  premiumImageWrapper: {
    position: 'relative',
    borderRadius: 28,
    backgroundColor: 'white',
    shadowColor: '#2563EB',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
    padding: 24,
    marginBottom: 24,
  },
  imageGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 38,
    backgroundColor: '#2563EB',
    opacity: 0.1,
  },
  premiumHeroImage: {
    width: 300,
    height: 260,
    resizeMode: 'contain',
  },
  heroTextContainer: {
    alignItems: 'center',
  },
  premiumHeroText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  premiumHeroSubtext: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: width * 0.8,
  },

  // Modern Services Section
  servicesContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  modernSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  servicesGrid: {
    gap: 16,
  },
  modernCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
  },
  cardGradient: {
    padding: 20,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modernIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modernCardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  modernCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  modernCardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  cardArrow: {
    alignSelf: 'flex-end',
  },

  // Premium Features Section
  featuresSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresList: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#2563EB',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  featureText: {
    fontSize: 16,
    color: '#334155',
    marginLeft: 16,
    fontWeight: '500',
  },

  // Premium Footer
  premiumFooter: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  footerContent: {
    padding: 24,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  premiumFooterText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});