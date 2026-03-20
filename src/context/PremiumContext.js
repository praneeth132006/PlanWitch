import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import AdService from '../services/AdService';

const PremiumContext = createContext(null);

export const usePremium = () => {
    const context = useContext(PremiumContext);
    if (!context) {
        throw new Error('usePremium must be used within a PremiumProvider');
    }
    return context;
};

export const PremiumProvider = ({ children }) => {
    const { user } = useAuth();
    // TEMPORARY: Make app free for all users
    const [isPremium, setIsPremium] = useState(true);
    const [loading, setLoading] = useState(false);
    const [offerings, setOfferings] = useState(null);

    useEffect(() => {
        if (user?.isAdmin) {
            setIsPremium(true);
        }
    }, [user?.isAdmin]);

    useEffect(() => {
        AdService.setDisabled(isPremium);
    }, [isPremium]);

    const purchasePackage = async (pack) => {
        Alert.alert('Not Available', 'Subscriptions are only available on the mobile app.');
        return { success: false };
    };

    const restorePurchases = async () => {
        return { success: false };
    };

    const setPremiumStatus = (status) => {
        setIsPremium(status);
        if (status) {
            Alert.alert('Dev Mode', 'Premium Unlocked (Fake)');
        } else {
            Alert.alert('Dev Mode', 'Premium Locked');
        }
    };

    return (
        <PremiumContext.Provider value={{
            isPremium,
            loading,
            offerings,
            purchasePackage,
            restorePurchases,
            setPremiumStatus // Expert for Dev
        }}>
            {children}
        </PremiumContext.Provider>
    );
};
