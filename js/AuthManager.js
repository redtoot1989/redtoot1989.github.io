// Improved AuthManager.js with line-by-line comments and optimizations
// NOTE: Replace firebase config section with your actual Firebase project config.

import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

/**************************************
 * Firebase Initialization
 **************************************/
// TODO: Insert your Firebase config here
// const firebaseConfig = { ... };
// if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore();

/**
 * AuthManager - Enhanced Authentication Manager
 */
export class AuthManager {
    constructor({ db, helpers }) {
        this.currentUser = null;                // Currently authenticated user
        this.userData = null;                   // User data loaded from Firestore
        this.auth = firebase.auth();            // Firebase Auth service reference
        this.db = db;                           // Firestore reference
        this.helpers = helpers;                 // Custom helper functions
        this.sessions = new Map();              // In-memory session storage

        // Default security configurations
        this.security = {
            maxLoginAttempts: 5,                // Maximum allowed login attempts
            lockoutTime: 15 * 60 * 1000,        // Lockout time (15 minutes)
            sessionTimeout: 24 * 60 * 60 * 1000 // Session timeout (24 hours)
        };

        // User activity-based events to track session activity
        this.activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        this.init();                            // Initialize the authentication system
    }

    /**************************************
     * Initialization Process
     **************************************/
    async init() {
        try {
            // Persist session even after window/browser is closed
            await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

            this.setupAuthStateListener();       // Listen to authentication state changes
            await this.loadSecuritySettings();  // Load security settings from Firestore
            this.setupSessionManagement();      // Start session cleanup cycle
            this.setupActivityListeners();      // Watch for user activity

            console.log('🔐 Auth Manager initialized successfully');
        } catch (err) {
            console.error('❌ Auth initialization failed:', err);
            this.helpers.showNotification('System initialization failed', 'error');
        }
    }

    /**************************************
     * Load Security Settings From Firestore
     **************************************/
    async loadSecuritySettings() {
        try {
            const settings = await this.db.collection('settings').doc('security').get();
            if (settings.exists) this.security = { ...this.security, ...settings.data() };
        } catch (err) {
            console.warn('Failed to load security settings:', err);
        }
    }

    /**************************************
     * Authentication State Listener
     **************************************/
    setupAuthStateListener() {
        this.auth.onAuthStateChanged(user => this.handleAuthStateChange(user));
    }

    /**************************************
     * Session Management
     **************************************/
    setupSessionManagement() {
        // Check for inactive sessions every 60 seconds
        setInterval(() => this.cleanupExpiredSessions(), 60 * 1000);
    }

    setupActivityListeners() {
        // Update last activity timestamp when the user interacts with the page
        this.activityEvents.forEach(ev => {
            document.addEventListener(ev, () => this.updateLastActivity(), { passive: true });
        });
    }

    updateLastActivity() {
        if (this.currentUser && this.sessions.has(this.currentUser.uid)) {
            this.sessions.set(this.currentUser.uid, {
                ...this.sessions.get(this.currentUser.uid),
                lastActivity: Date.now()
            });
        }
    }

    async cleanupExpiredSessions() {
        const now = Date.now();

        for (const [uid, session] of this.sessions) {
            if (now - session.lastActivity > this.security.sessionTimeout) {
                console.log('🕐 Auto-logout due to inactivity:', uid);
                await this.signOut();
                break;
            }
        }
    }

    /**************************************
     * Authentication State Handling
     **************************************/
    async handleAuthStateChange(user) {
        const previousUser = this.currentUser;
        this.currentUser = user;

        if (user) await this.handleSignIn(user, previousUser);
        else await this.handleSignOut(previousUser);

        this.emitEvent('authStateChanged', { user, previousUser });
    }

    async handleSignIn(user, previousUser) {
        if (await this.isUserBlocked(user.uid)) {
            await this.auth.signOut();
            throw new Error('This account is temporarily blocked');
        }

        await this.updateUserData(user);         // Store/update Firestore user data
        await this.updateOnlineStatus(true);      // Mark user as online
        await this.initUserSession(user);         // Create a session entry

        await this.logEvent('user_login', {
            provider: user.providerData[0]?.providerId,
            isNewUser: !previousUser
        });

        console.log('✅ User signed in:', user.email);
    }

    async handleSignOut(previousUser) {
        if (!previousUser) return;

        await this.updateOnlineStatus(false);    // Mark user offline
        this.cleanupUserSession(previousUser.uid);
        await this.logEvent('user_logout');

        console.log('👤 User signed out');
    }

    /**************************************
     * User Data & Session Tracking
     **************************************/
    async initUserSession(user) {
        const sessionData = {
            userId: user.uid,
            loginTime: Date.now(),               // Session start timestamp
            lastActivity: Date.now(),            // Tracks user activity
            userAgent: navigator.userAgent,
            ipAddress: await this.getIP(),       // Fetch public IP
            deviceInfo: this.getDeviceInfo()     // Device metadata
        };

        this.sessions.set(user.uid, sessionData);

        await this.db.collection('user_sessions').doc(user.uid).set({
            ...sessionData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    cleanupUserSession(uid) {
        this.sessions.delete(uid);               // Remove from memory

        this.db.collection('user_sessions').doc(uid).update({
            logoutTime: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(console.warn);
    }

    async updateUserData(user) {
        const ref = this.db.collection('users').doc(user.uid);
        const snap = await ref.get();

        const data = {
            username: user.displayName || this.generateUsername(user.email),
            email: user.email,
            photoURL: user.photoURL || '',
            emailVerified: user.emailVerified,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            loginCount: firebase.firestore.FieldValue.increment(1)
        };

        if (!snap.exists) {
            // Create new user profile if not found
            await ref.set({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isAdmin: false,
                isVip: false,
                isBlocked: false,
                status: 'active',
                preferences: { language: 'en', notifications: true, theme: 'light' }
            });

            await this.logEvent('user_registered', { email: user.email });
        } else {
            await ref.update(data);              // Update existing profile
        }

        this.userData = { ...snap.data(), ...data };
    }

    generateUsername(email) {
        return email ? email.split('@')[0] : 'user_' + Math.random().toString(36).substring(2, 7);
    }

    async updateOnlineStatus(isOnline) {
        if (!this.currentUser) return;

        const ref = this.db.collection('users').doc(this.currentUser.uid);

        await ref.update({
            isOnline,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(console.warn);
    }

    /**************************************
     * Authentication Methods
     **************************************/
    async signInWithEmail(email, password, rememberMe = false) {
        if (await this.isRateLimited(email)) {
            return { success: false, error: 'Too many attempts, try again later' };
        }

        const persistence = rememberMe
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        await this.auth.setPersistence(persistence);

        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            await this.resetRateLimit(email);
            return { success: true, user: userCredential.user };
        } catch (error) {
            await this.incrementFailedAttempts(email);
            const msg = this.helpers.handleError(error, 'email_signin');
            return { success: false, error: msg, code: error.code };
        }
    }

    async registerWithEmail(email, password, userData = {}) {
        if (!this.validatePassword(password)) throw new Error('Weak password');
        if (await this.checkEmailExists(email)) throw new Error('Email already exists');

        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await user.updateProfile({ displayName: userData.username || this.generateUsername(email) });
        await user.sendEmailVerification();
        await this.updateUserData(user);

        return { success: true, user, message: 'Account created. Check your email.' };
    }

    async signInWithProvider(providerName) {
        let provider;

        switch (providerName.toLowerCase()) {
            case 'google': provider = new firebase.auth.GoogleAuthProvider(); break;
            case 'facebook': provider = new firebase.auth.F

