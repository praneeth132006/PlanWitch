import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as logger from "firebase-functions/logger";

if (admin.apps.length === 0) {
    admin.initializeApp({
        databaseURL: "https://routemate-6a885-default-rtdb.asia-southeast1.firebasedatabase.app",
    });
}

// Use Realtime Database (already working in the project) instead of Firestore
const db = admin.database();

// Transporter configuration
const getTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "praneeth132006b@gmail.com",
            pass: "vmirekqpvmlawxxm",
        },
    });
};

export const requestOTP = onCall({ region: "us-central1" }, async (request) => {
    const { email } = request.data;
    logger.info(`requestOTP called for: ${email}`);

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        throw new HttpsError("invalid-argument", "Valid email is required.");
    }

    try {
        // 1. Check if user already exists
        try {
            await admin.auth().getUserByEmail(email);
            throw new HttpsError("already-exists", "User with this email already exists.");
        } catch (error: any) {
            if (error.code !== "auth/user-not-found") {
                throw error;
            }
        }

        // 2. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now

        // 3. Store OTP in Realtime Database
        // Sanitize email for use as a key (replace . with ,)
        const emailKey = email.replace(/\./g, ",");
        await db.ref(`otps/${emailKey}`).set({
            otp,
            expiresAt,
        });
        logger.info(`OTP stored in Realtime Database for ${email}: ${otp}`);

        // 4. Send Email
        const mailOptions = {
            from: `"TravelWitch" <praneeth132006b@gmail.com>`,
            to: email,
            subject: "Your TravelWitch Verification Code",
            text: `Your verification code is: ${otp}. It expires in 5 minutes.`,
            html: `<div style="font-family:Arial,sans-serif;max-width:400px;margin:auto;padding:20px;border:1px solid #eee;border-radius:12px;"><h2 style="text-align:center;color:#333;">TravelWitch</h2><p style="text-align:center;color:#666;">Your verification code is:</p><h1 style="text-align:center;letter-spacing:8px;color:#4F46E5;font-size:32px;">${otp}</h1><p style="text-align:center;color:#999;font-size:12px;">This code expires in 5 minutes.</p></div>`,
        };
        await getTransporter().sendMail(mailOptions);
        logger.info(`Email sent to ${email}`);

        return { success: true, message: "OTP sent successfully." };
    } catch (error: any) {
        logger.error("requestOTP error:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "Failed to send OTP.");
    }
});

export const verifyOTP = onCall({ region: "us-central1" }, async (request) => {
    const { email, otp } = request.data;

    if (!email || !otp) {
        throw new HttpsError("invalid-argument", "Email and OTP are required.");
    }

    try {
        const emailKey = email.replace(/\./g, ",");
        const snapshot = await db.ref(`otps/${emailKey}`).once("value");

        if (!snapshot.exists()) {
            throw new HttpsError("not-found", "OTP not found or expired.");
        }

        const data = snapshot.val();

        if (data.otp !== otp) {
            throw new HttpsError("permission-denied", "Incorrect OTP.");
        }

        if (data.expiresAt < Date.now()) {
            await db.ref(`otps/${emailKey}`).remove();
            throw new HttpsError("failed-precondition", "OTP has expired.");
        }

        // OTP is valid, delete it so it can't be reused
        await db.ref(`otps/${emailKey}`).remove();

        return { success: true };
    } catch (error: any) {
        logger.error("verifyOTP error:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "Failed to verify OTP.");
    }
});
