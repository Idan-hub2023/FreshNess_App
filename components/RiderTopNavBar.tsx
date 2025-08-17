// components/TopNavBar.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const TopNavBar = () => {
  const [rider, setRider] = useState<{ fullname?: string; profile?: string }>({});

  useEffect(() => {
    const loadRider = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('rider');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setRider(parsedUser);
        }
      } catch (error) {
        console.log('Error loading rider data:', error);
      }
    };

    loadRider();
  }, []);

  return (
    <View style={styles.navBar}>
      <View style={styles.leftContainer}>
        {rider.profile && (
          <Image
            source={{ uri: rider.profile }}
            style={styles.profileImage}
          />
        )}
        <Text style={styles.title}>{rider.fullname || 'Rider Panel'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#1E3A8A',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TopNavBar;
