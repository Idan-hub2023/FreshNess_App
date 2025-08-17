import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TopNavBar = ({ onNotificationPress, onProfilePress }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const userObj = JSON.parse(userString);
          setUser(userObj);
        }
      } catch (error) {
        console.error('Failed to load user from AsyncStorage:', error);
      }
    }
    loadUser();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Freshness</Text>

      <View style={styles.icons}>
        <TouchableOpacity onPress={onProfilePress}>
          <Image
            source={{
              uri: user?.profile || 'https://i.pravatar.cc/300', // fallback image if no profile url
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TopNavBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 27,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginRight: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ccc', // placeholder bg color while loading
  },
});
