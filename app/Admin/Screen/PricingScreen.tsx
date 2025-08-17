import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

const API_BASE_URL = Platform.OS === 'android' 
    ? 'https://freshness-eakm.onrender.com/api' 
    : 'http://192.168.1.67:5000/api';

const PricingScreen = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        prices: {
            washAndFold: '',
            ironOnly: '',
            dryCleaning: '',
            washAndIron: ''
        },
        category: 'Clothes'
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = ['Clothes', 'Shoes', 'Beddings', 'Other'];

    const fetchServices = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${API_BASE_URL}/items`, {
                timeout: 10000
            });
            console.log('Fetched services:', response.data);
            setServices(response.data || []);
        } catch (err) {
            console.error('Failed to fetch services:', err);
            let errorMessage = 'Failed to load services. Please try again.';
            
            if (err.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout. Please check your connection.';
            } else if (err.response?.status === 404) {
                errorMessage = 'Services not found.';
            } else if (err.code === 'ERR_NETWORK') {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            prices: {
                washAndFold: '',
                ironOnly: '',
                dryCleaning: '',
                washAndIron: ''
            },
            category: 'Clothes'
        });
        setEditingService(null);
    };

    const handleInputChange = (field, value) => {
        if (field.includes('prices.')) {
            const priceField = field.split('.')[1];
            setFormData(prev => ({
                ...prev,
                prices: {
                    ...prev.prices,
                    [priceField]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const validateForm = () => {
        // Check item name
        if (!formData.name.trim()) {
            Alert.alert('Missing Input', 'Please enter the item name');
            return false;
        }

        // Check if name already exists (excluding current editing item)
        const existingItem = services.find(item => 
            item.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
            (!editingService || item._id !== editingService._id)
        );
        
        if (existingItem) {
            Alert.alert('Duplicate Item', 'An item with this name already exists');
            return false;
        }

        const { washAndFold, ironOnly, dryCleaning, washAndIron } = formData.prices;
        
        // Validate washAndFold (required)
        if (!washAndFold || isNaN(Number(washAndFold))) {
            Alert.alert('Invalid Price', 'Wash & Fold price must be a number');
            return false;
        }
        if (Number(washAndFold) <= 0) {
            Alert.alert('Invalid Price', 'Wash & Fold price must be positive');
            return false;
        }
        
        // Validate optional prices
        const validateOptionalPrice = (price, name) => {
            if (price && (isNaN(Number(price)) || Number(price) < 0)) {
                Alert.alert('Invalid Price', `${name} price must be a positive number or leave empty`);
                return false;
            }
            return true;
        };

        if (!validateOptionalPrice(ironOnly, 'Iron Only')) return false;
        if (!validateOptionalPrice(dryCleaning, 'Dry Cleaning')) return false;
        if (!validateOptionalPrice(washAndIron, 'Wash & Iron')) return false;
        
        return true;
    };

    const handleAddService = async () => {
        if (!validateForm()) {
            return;
        }

        const itemData = {
            name: formData.name.trim(),
            prices: {
                washAndFold: Number(formData.prices.washAndFold),
                ironOnly: Number(formData.prices.ironOnly || '0'),
                dryCleaning: Number(formData.prices.dryCleaning || '0'),
                washAndIron: Number(formData.prices.washAndIron || '0')
            },
            category: formData.category
        };

        setIsSubmitting(true);

        try {
            let response;
            if (editingService) {
                console.log('Updating item:', editingService._id, itemData);
                response = await axios.put(`${API_BASE_URL}/items/${editingService._id}`, itemData, {
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                Alert.alert('Success', 'Service updated successfully');
            } else {
                console.log('Creating new item:', itemData);
                response = await axios.post(`${API_BASE_URL}/items`, itemData, {
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                Alert.alert('Success', 'Service added successfully');
            }
            
            console.log('API Response:', response.data);
            await fetchServices();
            resetForm();
            setShowForm(false);
        } catch (error) {
            console.error('Error saving service:', error);
            
            let errorMessage = 'Failed to save service. Please try again.';
            
            if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout. Please check your connection.';
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (error.response) {
                const status = error.response.status;
                const responseMessage = error.response.data?.message;
                
                switch (status) {
                    case 400:
                        errorMessage = responseMessage || 'Invalid data provided';
                        break;
                    case 404:
                        errorMessage = 'Service not found';
                        break;
                    case 409:
                        errorMessage = 'Service with this name already exists';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later.';
                        break;
                    default:
                        errorMessage = responseMessage || `Server error (${status})`;
                }
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (service) => {
        console.log('Editing service:', service);
        setEditingService(service);
        setFormData({
            name: service.name,
            prices: {
                washAndFold: service.prices.washAndFold.toString(),
                ironOnly: service.prices.ironOnly.toString(),
                dryCleaning: service.prices.dryCleaning.toString(),
                washAndIron: service.prices.washAndIron.toString()
            },
            category: service.category
        });
        setShowForm(true);
    };

    const confirmDelete = (service) => {
        setServiceToDelete(service);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!serviceToDelete) return;

        try {
            console.log('Deleting service:', serviceToDelete._id);
            await axios.delete(`${API_BASE_URL}/items/${serviceToDelete._id}`, {
                timeout: 10000
            });
            Alert.alert('Success', 'Service deleted successfully');
            await fetchServices();
            setShowDeleteModal(false);
            setServiceToDelete(null);
        } catch (error) {
            console.error('Error deleting service:', error);
            
            let errorMessage = 'Failed to delete service. Please try again.';
            
            if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout. Please check your connection.';
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (error.response) {
                const status = error.response.status;
                const responseMessage = error.response.data?.message;
                
                switch (status) {
                    case 404:
                        errorMessage = 'Service not found';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later.';
                        break;
                    default:
                        errorMessage = responseMessage || `Error (${status})`;
                }
            }
            
            Alert.alert('Delete Failed', errorMessage);
        }
    };

    const renderPriceItem = (label, price) => (
        <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>{label}:</Text>
            <Text style={styles.priceValue}>{price} RWF</Text>
        </View>
    );

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
            </View>
            
            <View style={styles.priceContainer}>
                {renderPriceItem('Wash & Fold', item.prices.washAndFold)}
                {item.prices.ironOnly > 0 && renderPriceItem('Iron Only', item.prices.ironOnly)}
                {item.prices.dryCleaning > 0 && renderPriceItem('Dry Cleaning', item.prices.dryCleaning)}
                {item.prices.washAndIron > 0 && renderPriceItem('Wash & Iron', item.prices.washAndIron)}
            </View>
            
            <View style={styles.cardActions}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEdit(item)}
                >
                    <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => confirmDelete(item)}
                >
                    <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={styles.loadingText}>Loading services...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={fetchServices}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={100}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Service Pricing</Text>
                    <Text style={styles.subtitle}>Manage your laundry service prices</Text>
                </View>
                
                <View style={styles.actionsBar}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => {
                            if (showForm) {
                                resetForm();
                            }
                            setShowForm(!showForm);
                        }}
                    >
                        <Text style={styles.buttonText}>
                            {showForm ? 'Cancel' : '+ Add New Item'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showForm && (
                    <View style={styles.formContainer}>
                        <Text style={styles.formTitle}>
                            {editingService ? 'Edit Service' : 'Add New Service'}
                        </Text>
                        
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categoryContainer}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryButton,
                                        formData.category === cat && styles.selectedCategory
                                    ]}
                                    onPress={() => handleInputChange('category', cat)}
                                >
                                    <Text style={formData.category === cat ? styles.selectedCategoryText : styles.categoryText}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Item Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Shirt"
                            value={formData.name}
                            onChangeText={(text) => handleInputChange('name', text)}
                            autoCapitalize="words"
                            returnKeyType="next"
                        />

                        <Text style={styles.sectionLabel}>Pricing (RWF)</Text>
                        
                        <Text style={styles.label}>Wash & Fold *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Required - Enter price"
                            value={formData.prices.washAndFold}
                            onChangeText={(text) => handleInputChange('prices.washAndFold', text)}
                            keyboardType="numeric"
                            returnKeyType="next"
                        />

                        <Text style={styles.label}>Iron Only</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Optional - Leave empty if not offered"
                            value={formData.prices.ironOnly}
                            onChangeText={(text) => handleInputChange('prices.ironOnly', text)}
                            keyboardType="numeric"
                            returnKeyType="next"
                        />

                        <Text style={styles.label}>Dry Cleaning</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Optional - Leave empty if not offered"
                            value={formData.prices.dryCleaning}
                            onChangeText={(text) => handleInputChange('prices.dryCleaning', text)}
                            keyboardType="numeric"
                            returnKeyType="next"
                        />

                        <Text style={styles.label}>Wash & Iron</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Optional - Leave empty if not offered"
                            value={formData.prices.washAndIron}
                            onChangeText={(text) => handleInputChange('prices.washAndIron', text)}
                            keyboardType="numeric"
                            returnKeyType="done"
                        />

                        <TouchableOpacity 
                            style={[styles.saveButton, isSubmitting && styles.buttonDisabled]} 
                            onPress={handleAddService}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="white" />
                                    <Text style={styles.saveButtonText}>
                                        {editingService ? 'Updating...' : 'Saving...'}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    {editingService ? 'Update Service' : 'Save Service'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>Current Services</Text>
                    <Text style={styles.itemCount}>{services.length} {services.length === 1 ? 'item' : 'items'}</Text>
                </View>
                
                {services.length > 0 ? (
                    <FlatList
                        data={services}
                        keyExtractor={(item) => item._id}
                        renderItem={renderItem}
                        scrollEnabled={false}
                        contentContainerStyle={styles.listContainer}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No services added yet</Text>
                        <TouchableOpacity 
                            style={styles.emptyButton}
                            onPress={() => {
                                resetForm();
                                setShowForm(true);
                            }}
                        >
                            <Text style={styles.emptyButtonText}>Add your first service</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowDeleteModal(false)}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>
                
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirm Deletion</Text>
                        <Text style={styles.modalText}>
                            Are you sure you want to delete "{serviceToDelete?.name}"?
                        </Text>
                        <Text style={styles.modalWarning}>This action cannot be undone.</Text>
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleDelete}
                            >
                                <Text style={styles.modalButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2c3e50',
    },
    subtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        marginTop: 5,
    },
    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 20,
    },
    primaryButton: {
        backgroundColor: '#4a90e2',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    formContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 20,
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 15,
    },
    categoryButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        marginRight: 10,
        marginBottom: 10,
        backgroundColor: 'white',
    },
    selectedCategory: {
        backgroundColor: '#4a90e2',
        borderColor: '#4a90e2',
    },
    categoryText: {
        color: '#7f8c8d',
        fontSize: 14,
    },
    selectedCategoryText: {
        color: 'white',
        fontSize: 14,
    },
    label: {
        fontSize: 14,
        color: '#2c3e50',
        marginBottom: 5,
        fontWeight: '500',
    },
    sectionLabel: {
        fontSize: 16,
        color: '#2c3e50',
        marginTop: 15,
        marginBottom: 10,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
        color: '#2c3e50',
    },
    saveButton: {
        backgroundColor: '#4a90e2',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#7f8c8d',
        fontSize: 16,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2c3e50',
    },
    itemCount: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    listContainer: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
        flex: 1,
    },
    cardCategory: {
        fontSize: 12,
        color: '#7f8c8d',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 10,
    },
    priceContainer: {
        marginVertical: 10,
    },
    priceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingVertical: 2,
    },
    priceLabel: {
        fontSize: 15,
        color: '#7f8c8d',
    },
    priceValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 15,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginLeft: 10,
    },
    editButton: {
        backgroundColor: '#f39c12',
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: 'white',
        borderRadius: 12,
        marginTop: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 15,
        textAlign: 'center',
    },
    emptyButton: {
        backgroundColor: '#4a90e2',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    retryButton: {
        backgroundColor: '#4a90e2',
        padding: 12,
        borderRadius: 6,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 25,
        width: '85%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 15,
    },
    modalText: {
        fontSize: 16,
        color: '#34495e',
        marginBottom: 5,
        textAlign: 'center',
    },
    modalWarning: {
        fontSize: 14,
        color: '#e74c3c',
        marginBottom: 20,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
        marginLeft: 10,
    },
    cancelButton: {
        backgroundColor: '#bdc3c7',
    },
    confirmButton: {
        backgroundColor: '#e74c3c',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: '500',
    },
});

export default PricingScreen;