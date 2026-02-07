import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import REVENUE_CAT_CONFIG from '../config/revenueCat';

const PremiumContext = createContext(null);

export const usePremium = () => {
    const context = useContext(PremiumContext);
    if (!context) {
        throw new Error('usePremium must be used within a PremiumProvider');
    }
    return context;
};

export const PremiumProvider = ({ children }) => {
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [offerings, setOfferings] = useState(null);

    useEffect(() => {
        const initPurchases = async () => {
            try {
                Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

                if (Platform.OS === 'android') {
                    Purchases.configure({ apiKey: REVENUE_CAT_CONFIG.apiKey });
                } else if (Platform.OS === 'ios') {
                    // Purchases.configure({ apiKey: 'YOUR_IOS_API_KEY' });
                }

                // Check active entitlements
                const customerInfo = await Purchases.getCustomerInfo();
                setIsPremium(customerInfo.entitlements.active[REVENUE_CAT_CONFIG.entitlementId] !== undefined);

                // Load offerings
                const offeringsData = await Purchases.getOfferings();
                if (offeringsData.current !== null) {
                    setOfferings(offeringsData.current);
                }
            } catch (error) {
                console.error('RevenueCat Init Error:', error);
            } finally {
                setLoading(false);
            }
        };

        initPurchases();

        // Listen for customer info updates
        const listener = (customerInfo) => {
            setIsPremium(customerInfo.entitlements.active[REVENUE_CAT_CONFIG.entitlementId] !== undefined);
        };

        Purchases.addCustomerInfoUpdateListener(listener);

        return () => {
            // No direct remove listener in some versions, but usually handled by SDK
        };
    }, []);

    const purchasePackage = async (pack) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            if (customerInfo.entitlements.active[REVENUE_CAT_CONFIG.entitlementId] !== undefined) {
                setIsPremium(true);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            if (!error.userCancelled) {
                console.error('Purchase Error:', error);
            }
            return { success: false, error };
        }
    };

    const restorePurchases = async () => {
        try {
            const customerInfo = await Purchases.restorePurchases();
            const isActive = customerInfo.entitlements.active[REVENUE_CAT_CONFIG.entitlementId] !== undefined;
            setIsPremium(isActive);
            return { success: true, isActive };
        } catch (error) {
            console.error('Restore Error:', error);
            return { success: false, error };
        }
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
            setPremiumStatus
        }}>
            {children}
        </PremiumContext.Provider>
    );
};
