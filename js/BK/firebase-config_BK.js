/**
 * Firebase Configuration & Initialization
 * Optimized for ReedToot application with comprehensive error handling
 * @version 1.1.0
 */

(function (window) {
    'use strict';

    // Firebase configuration object
    const firebaseConfig = {
        apiKey: "AIzaSyBXf3qNF2T31ACZK8280ZGy3vBT1tds7rg",
        authDomain: "reedtoot-3bf23.firebaseapp.com",
        projectId: "reedtoot-3bf23",
        storageBucket: "reedtoot-3bf23.firebasestorage.app",
        messagingSenderId: "248298483690",
        appId: "1:248298483690:web:09e27fc6915a3a5e8c0c93",
        measurementId: "G-W6YF3LLE8X"
    };

    // Performance monitoring
    const initStartTime = performance.now();
    let initializationSuccessful = false;

    /**
     * Initialize Firebase services with comprehensive error handling
     */
    const initializeFirebase = () => {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }

            // Initialize Firebase only once (prevent duplicate apps)
            let app;
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
                console.log('🔥 Firebase initialized successfully');
            } else {
                app = firebase.app();
                console.log('🔥 Firebase already initialized, using existing app');
            }

            // Initialize services with error handling
            const auth = firebase.auth();
            const db = firebase.firestore();
            const storage = firebase.storage();

            // Configure Firestore for offline persistence
            configureFirestore(db);
            
            // Initialize analytics if available
            const analytics = initializeAnalytics();

            // Expose services globally
            exposeServicesToGlobal({
                app,
                auth,
                db,
                storage,
                analytics
            });

            initializationSuccessful = true;
            logInitializationPerformance(initStartTime);

        } catch (error) {
            handleInitializationError(error);
        }
    };

    /**
     * Configure Firestore with offline persistence and settings
     */
    const configureFirestore = (db) => {
        try {
            // Enable offline persistence
            db.enablePersistence()
                .then(() => {
                    console.log('💾 Firestore offline persistence enabled');
                })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
                    } else if (err.code === 'unimplemented') {
                        console.warn('⚠️ The current browser doesn\'t support persistence');
                    }
                });

            // Optional: Configure Firestore settings
            db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });

        } catch (error) {
            console.warn('Firestore configuration warning:', error.message);
        }
    };

    /**
     * Initialize Firebase Analytics if available
     */
    const initializeAnalytics = () => {
        try {
            if (firebase.analytics) {
                const analytics = firebase.analytics();
                analytics.setAnalyticsCollectionEnabled(true);
                console.log('📊 Analytics initialized successfully');
                return analytics;
            }
        } catch (error) {
            console.warn('Analytics not available:', error.message);
        }
        return null;
    };

    /**
     * Expose Firebase services to global window object
     */
    const exposeServicesToGlobal = (services) => {
        try {
            window.firebaseApp = services.app;
            window.auth = services.auth;
            window.db = services.db;
            window.storage = services.storage;
            window.firebase = firebase;

            if (services.analytics) {
                window.firebaseAnalytics = services.analytics;
            }

            // Emit custom event for other scripts to listen to
            window.dispatchEvent(new CustomEvent('firebaseInitialized', {
                detail: { services, timestamp: new Date() }
            }));

        } catch (error) {
            console.error('Error exposing services to global scope:', error);
        }
    };

    /**
     * Log initialization performance metrics
     */
    const logInitializationPerformance = (startTime) => {
        const initDuration = performance.now() - startTime;
        console.log(`⚡ Firebase initialization completed in ${initDuration.toFixed(2)}ms`);
        
        // Send to analytics if available
        if (window.firebaseAnalytics) {
            window.firebaseAnalytics.logEvent('firebase_init_complete', {
                duration_ms: Math.round(initDuration),
                success: true
            });
        }
    };

    /**
     * Handle initialization errors with fallback strategies
     */
    const handleInitializationError = (error) => {
        console.error('❌ Firebase initialization failed:', error);
        
        // Create mock services for development environment
        if (isDevelopmentEnvironment()) {
            console.warn('🔧 Development mode: Creating mock Firebase services');
            createMockServices();
        } else {
            // In production, you might want to show a user-friendly error
            showUserFriendlyError();
        }
    };

    /**
     * Check if we're in a development environment
     */
    const isDevelopmentEnvironment = () => {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('local') ||
               window.location.protocol === 'file:';
    };

    /**
     * Create mock services for development when Firebase fails
     */
    const createMockServices = () => {
        const mockAuth = {
            currentUser: null,
            onAuthStateChanged: (callback) => {
                setTimeout(() => callback(null), 100);
                return () => {};
            },
            signInWithEmailAndPassword: (email, password) => 
                Promise.reject(new Error('Mock auth service - not implemented')),
            createUserWithEmailAndPassword: (email, password) => 
                Promise.reject(new Error('Mock auth service - not implemented')),
            signOut: () => Promise.resolve()
        };

        const mockFirestore = {
            collection: (name) => ({
                doc: (id) => ({
                    get: () => Promise.resolve({ exists: false, data: () => null, id }),
                    set: (data) => {
                        console.log('Mock Firestore: Setting document', name, id, data);
                        return Promise.resolve();
                    },
                    update: (data) => {
                        console.log('Mock Firestore: Updating document', name, id, data);
                        return Promise.resolve();
                    },
                    delete: () => {
                        console.log('Mock Firestore: Deleting document', name, id);
                        return Promise.resolve();
                    },
                    onSnapshot: () => () => {}
                }),
                where: () => ({
                    get: () => Promise.resolve({ empty: true, docs: [] }),
                    onSnapshot: () => () => {}
                }),
                get: () => Promise.resolve({ empty: true, docs: [] }),
                onSnapshot: () => () => {}
            })
        };

        const mockStorage = {
            ref: (path) => ({
                put: (file) => Promise.reject(new Error('Mock storage - not implemented')),
                getDownloadURL: () => Promise.reject(new Error('Mock storage - not implemented'))
            })
        };

        // Expose mock services
        window.auth = mockAuth;
        window.db = mockFirestore;
        window.storage = mockStorage;
        window.firebaseApp = { name: '[Mock Firebase App]' };
        
        console.warn('🚀 Mock Firebase services initialized for development');
    };

    /**
     * Show user-friendly error message (optional)
     */
    const showUserFriendlyError = () => {
        // You can implement a user-friendly error message here
        // For example, show a notification or update the UI
        const errorEvent = new CustomEvent('firebaseError', {
            detail: { 
                message: 'Unable to connect to services. Please check your internet connection.',
                timestamp: new Date()
            }
        });
        window.dispatchEvent(errorEvent);
    };

    /**
     * Public API for checking initialization status
     */
    window.getFirebaseStatus = () => ({
        initialized: initializationSuccessful,
        timestamp: new Date(),
        services: initializationSuccessful ? {
            auth: !!window.auth,
            firestore: !!window.db,
            storage: !!window.storage,
            analytics: !!window.firebaseAnalytics
        } : null
    });

    // Initialize Firebase when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFirebase);
    } else {
        initializeFirebase();
    }

})(window);

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.firebaseConfig;
}
