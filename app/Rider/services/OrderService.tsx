import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationService from './LocationService';
import axios from 'axios';

class OrderService {
  static async getOrdersForLocation() {
    try {
      const hasPermission = await LocationService.requestLocationPermission();
      if (!hasPermission) {
        console.warn('Location permission denied');
        return [];
      }

      const currentCoords = await LocationService.getCurrentPosition();

      // 🔥 Fetch orders from API
      const response = await axios.get('https://freshness-eakm.onrender.com/api/orders');
      const allOrders = response.data;

      // ✅ Filter orders in Muhoza only if rider is in Muhoza
      if (LocationService.isInWorkArea(currentCoords.latitude, currentCoords.longitude)) {
        return allOrders.filter(order =>
          LocationService.isInWorkArea(order.location.latitude, order.location.longitude)
        );
      }

      return [];
    } catch (error) {
      console.error('Error getting orders by location:', error);
      return [];
    }
  }

  static async acceptOrder(orderId) {
    try {
      const acceptedOrders = await AsyncStorage.getItem('acceptedOrders') || '[]';
      const orders = JSON.parse(acceptedOrders);
      orders.push({ orderId, acceptedAt: new Date().toISOString() });
      await AsyncStorage.setItem('acceptedOrders', JSON.stringify(orders));
      return true;
    } catch (error) {
      console.error('Error accepting order:', error);
      return false;
    }
  }
}

export default OrderService;
