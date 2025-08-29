import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
  

const { width } = Dimensions.get('window');

interface User {
  _id: string;
  fullname: string;
  email: string;
  phone?: string;
  role?: string;
  createdAt: string;
  profile?: string;
}

export default function UsersScreen({ navigation }: any) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  const router = useRouter();

      const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';
  
  const fetchUsers = async () => {
    try {
      setIsRefreshing(true);
      // Start animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // API call to localhost:5000
      const response = await fetch(`${API_BASE_URL}/users`);
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data);
      } else {
        console.error("Failed to fetch users:", data.message);
      }

      // End animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone && user.phone.toString().includes(searchQuery))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderUserItem = ({ item, index }: { item: User; index: number }) => {
    const itemAnimValue = new Animated.Value(0);
    
    Animated.timing(itemAnimValue, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();

    return (
      <Animated.View
        style={[
          {
            opacity: itemAnimValue,
            transform: [
              {
                translateY: itemAnimValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => {
            router.push({
              pathname: "./UserDetail",
              params: { user: JSON.stringify(item) },
            });
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
            style={styles.cardGradient}
          >
            <View style={styles.avatarContainer}>
              {item.profile ? (
                <Image source={{ uri: item.profile }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatar}>
                  {item.fullname.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <Text style={styles.userName}>{item.fullname}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.roleText}>
                    {item.role?.toUpperCase() || "USER"}
                  </Text>
                </View>
              </View>
              
              <View style={styles.contactInfo}>
                <View style={styles.userDetailRow}>
                  <Ionicons name="mail" size={16} color="#6366f1" />
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                {item.phone && (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="call" size={16} color="#10b981" />
                    <Text style={styles.userPhone}>{item.phone}</Text>
                  </View>
                )}
                <View style={styles.userDetailRow}>
                  <Ionicons name="calendar" size={16} color="#8b5cf6" />
                  <Text style={styles.userDate}>
                    Joined: {formatDate(item.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.chevronContainer}>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#94a3b8"
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Users Management</Text>
          <Text style={styles.subtitle}>
            {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"} found
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#6366f1"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email or phone..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Animated.View
          style={[
            styles.listContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={['rgba(103, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                  style={styles.emptyGradient}
                >
                  <Ionicons
                    name="people-outline"
                    size={80}
                    color="#6366f1"
                    style={styles.emptyIcon}
                  />
                  <Text style={styles.noResultText}>No users found</Text>
                  <Text style={styles.noResultSubtext}>
                    {searchQuery ? "Try adjusting your search query" : "No users available"}
                  </Text>
                </LinearGradient>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={fetchUsers}
                colors={['#667eea']}
                tintColor="#667eea"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    marginTop: -20,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 30,
  },
  userCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 50,
    height: 50,
    textAlignVertical: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 25,
    lineHeight: 50,
    color: '#6366f1',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginRight: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  contactInfo: {
    gap: 8,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 10,
    fontWeight: '500',
  },
  userPhone: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 10,
    fontWeight: '500',
  },
  userDate: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 10,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevronContainer: {
    padding: 8,
  },
  separator: {
    height: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  noResultText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
});