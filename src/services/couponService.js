import {
    database,
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue,
    off,
} from '../config/firebase';

/**
 * Create a new coupon in the database
 * @param {Object} couponData - The coupon data (code, discount, maxJoiners, validFrom, validTo)
 */
export const createCoupon = async (couponData) => {
    const couponsRef = ref(database, 'coupons');
    const newCouponRef = push(couponsRef);
    const couponId = newCouponRef.key;

    const fullCouponData = {
        ...couponData,
        id: couponId,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
    };

    await set(newCouponRef, fullCouponData);
    return fullCouponData;
};

/**
 * Subscribe to the coupons list in real-time
 * @param {function} callback - Called with the updated list of coupons
 * @returns {function} Unsubscribe function
 */
export const subscribeToCoupons = (callback) => {
    const couponsRef = ref(database, 'coupons');
    const unsubscribe = onValue(couponsRef, (snapshot) => {
        const data = snapshot.exists()
            ? Object.values(snapshot.val()).sort((a, b) => b.createdAt - a.createdAt)
            : [];
        callback(data);
    });
    return () => off(couponsRef, 'value', unsubscribe);
};

/**
 * Update an existing coupon
 * @param {string} couponId - The ID of the coupon to update
 * @param {Object} updates - The updates to apply
 */
export const updateCoupon = async (couponId, updates) => {
    if (!couponId) return;
    const couponRef = ref(database, `coupons/${couponId}`);
    await update(couponRef, {
        ...updates,
        updatedAt: Date.now(),
    });
};

/**
 * Delete a coupon from the database
 * @param {string} couponId - The ID of the coupon to delete
 */
export const deleteCoupon = async (couponId) => {
    if (!couponId) return;
    await remove(ref(database, `coupons/${couponId}`));
};

/**
 * Validate a coupon code and check restrictions
 * @param {string} code - The coupon code to validate
 * @returns {Object} { success: boolean, discount: number, error: string }
 */
export const validateCoupon = async (code) => {
    if (!code) return { success: false, error: 'No coupon code provided' };

    const couponsRef = ref(database, 'coupons');
    const snapshot = await get(couponsRef);

    if (!snapshot.exists()) return { success: false, error: 'Invalid coupon code' };

    const coupons = Object.values(snapshot.val());
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());

    if (!coupon) return { success: false, error: 'Invalid coupon code' };
    if (!coupon.isActive) return { success: false, error: 'This coupon is no longer active' };

    const now = Date.now();
    if (coupon.validFrom && now < coupon.validFrom) {
        return { success: false, error: 'This coupon is not yet valid' };
    }
    if (coupon.validTo && now > coupon.validTo) {
        return { success: false, error: 'This coupon has expired' };
    }
    if (coupon.maxJoiners && coupon.usageCount >= coupon.maxJoiners) {
        return { success: false, error: 'This coupon has reached its usage limit' };
    }

    return { success: true, coupon };
};
