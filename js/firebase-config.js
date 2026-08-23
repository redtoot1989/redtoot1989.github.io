/**
 * Firebase Initialization – Improved & Fully Commented
 * Version 3.0
 * Clean, optimized, safe initialization with debug, retries, and mock fallback.
 */

(function (window) {
    "use strict";

    /* -------------------------------------------------------------------------
     * FIREBASE CONFIGURATION (Validated before use)
     * ------------------------------------------------------------------------- */
    const firebaseConfig = {
        apiKey: "AIzaSyBXf3qNF2T31ACZK8280ZGy3vBT1tds7rg",
        authDomain: "reedtoot-3bf23.firebaseapp.com",
        projectId: "reedtoot-3bf23",
        storageBucket: "reedtoot-3bf23.firebasestorage.app",
        messagingSenderId: "248298483690",
        appId: "1:248298483690:web:09e27fc6915a3a5e8c0c93",
        measurementId: "G-W6YF3LLE8X"
    };

    /* -------------------------------------------------------------------------
     * INTERNAL GLOBAL STATE FOR TRACKING INITIALIZATION STATUS
     * ------------------------------------------------------------------------- */
    const firebaseState = {
        initialized: false,
        initializationTime: null,
        services: {},
        errors: [],
        retryCount: 0,
        maxRetries: 3, // Maximum retries before falling back to mock services
        debugMode:
            localStorage.getItem("firebaseDebug") === "true" ||
            ["localhost", "127.0.0.1"].includes(window.location.hostname),
        logs: []
    };

    const initStartTime = performance.now(); // Performance measurement start

    /* -------------------------------------------------------------------------
     * DEBUGGER CLASS – HANDLES LOGGING, STATS, EXPORTING LOGS
     * ------------------------------------------------------------------------- */
    class FirebaseDebugger {
        constructor() {
            this.enabled = firebaseState.debugMode;
            this.logs = [];
        }

        // Turn debug mode ON
        enable() {
            this.enabled = true;
            localStorage.setItem("firebaseDebug", "true");
            this.log("Debug mode enabled", null, "debug");
        }

        // Turn debug mode OFF
        disable() {
            this.enabled = false;
            localStorage.setItem("firebaseDebug", "false");
            this.log("Debug mode disabled", null, "debug");
        }

        /**
         * Main logging method
         * Writes logs to: console (if enabled), internal log storage, and external panels.
         */
        log(message, data = null, level = "info") {
            const timestamp = new Date().toLocaleTimeString();
            const entry = { timestamp, level, message, data };

            // Save to internal log buffer
            this.logs.push(entry);
            firebaseState.logs.push(entry);
            if (this.logs.length > 200) this.logs = this.logs.slice(-100);

            // Only print to console if debug enabled OR log is error
            if (!this.enabled && level !== "error") return;

            const color = {
                info: "#4CAF50",
                warn: "#FF9800",
                error: "#F44336",
                debug: "#2196F3"
            }[level];

            console.log(`%c[FIREBASE ${timestamp}] ${message}`, `color:${color}`, data || "");

            this.sendToDebugPanel(entry);
        }

        info(msg, data) { this.log(msg, data, "info"); }
        warn(msg, data) { this.log(msg, data, "warn"); }
        error(msg, err) { this.log(msg, err, "error"); }
        debug(msg, data) { this.log(msg, data, "debug"); }

        // Send logs to an external debug panel (if implemented)
        sendToDebugPanel(entry) {
            if (window.mainApp?.options?.debugMode) {
                window.mainApp.log(`[Firebase] ${entry.message}`, entry.level, entry.data);
            }
        }

        // Download log history as JSON
        exportLogs() {
            const exportPayload = {
                exportedAt: new Date().toISOString(),
                firebaseState,
                config: this.maskSensitiveConfig(firebaseConfig),
                logs: this.logs
            };

            const file = new Blob([JSON.stringify(exportPayload, null, 2)], {
                type: "application/json"
            });

            const url = URL.createObjectURL(file);
            const a = document.createElement("a");
            a.href = url;
            a.download = `firebase-debug-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.info("Debug logs exported");
        }

        // Hide API key when exporting
        maskSensitiveConfig(config) {
            const copy = { ...config };
            if (copy.apiKey) {
                copy.apiKey = copy.apiKey.slice(0, 10) + "...****";
            }
            return copy;
        }
    }

    const debug = new FirebaseDebugger(); // Create debugger instance

    /* -------------------------------------------------------------------------
     * VALIDATE FIREBASE CONFIG BEFORE INITIALIZATION
     * ------------------------------------------------------------------------- */
    function validateFirebaseConfig(config) {
        debug.debug("Validating Firebase configuration...");

        const required = [
            "apiKey",
            "authDomain",
            "projectId",
            "storageBucket",
            "messagingSenderId",
            "appId"
        ];

        const missing = required.filter(f => !config[f]);
        if (missing.length) {
            throw new Error(`Missing Firebase config fields: ${missing.join(", ")}`);
        }

        debug.info("Firebase configuration is valid");
    }

    /* -------------------------------------------------------------------------
     * CHECK IF FIREBASE SDK IS LOADED
     * ------------------------------------------------------------------------- */
    async function checkFirebaseSDK() {
        debug.debug("Checking Firebase SDK...");

        if (typeof firebase === "undefined") {
            throw new Error("Firebase SDK not loaded – missing <script> tags.");
        }

        debug.info("Firebase SDK detected", { version: firebase.SDK_VERSION });
    }

    /* -------------------------------------------------------------------------
     * INITIALIZE FIREBASE SERVICES
     * ------------------------------------------------------------------------- */
    function initFirebaseApp() {
        const apps = firebase.apps || [];
        if (apps.length > 0) {
            debug.warn("Firebase app already initialized. Reusing instance.");
            return apps[0];
        }

        debug.info("Initializing new Firebase app...");
        return firebase.initializeApp(firebaseConfig);
    }

    function initServices(app) {
        debug.debug("Initializing Firebase services...");
        const services = {};

        // AUTH
        services.auth = firebase.auth(app);

        // FIRESTORE
        services.db = firebase.firestore(app);

        // STORAGE
        services.storage = firebase.storage(app);

        debug.info("Firebase services initialized", Object.keys(services));
        return services;
    }

    /* -------------------------------------------------------------------------
     * FIRESTORE CONFIGURATION
     * ------------------------------------------------------------------------- */
    function configureFirestore(db) {
        debug.debug("Configuring Firestore...");

        db.enablePersistence().catch(err => {
            if (err.code === "failed-precondition") {
                debug.warn("Firestore persistence blocked (multiple tabs)");
            } else if (err.code === "unimplemented") {
                debug.warn("Firestore persistence unsupported on this browser");
            } else {
                debug.error("Firestore persistence error", err);
            }
        });

        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            ignoreUndefinedProperties: true
        });

        debug.info("Firestore configuration complete");
    }

    /* -------------------------------------------------------------------------
     * AUTH CONFIGURATION
     * ------------------------------------------------------------------------- */
    function configureAuth(auth) {
        auth.onAuthStateChanged(user => {
            debug.debug("Auth state changed", user ? { uid: user.uid, email: user.email } : null);
        });

        auth.onIdTokenChanged(
            () => {},
            error => debug.error("Auth token error", error)
        );

        debug.info("Auth configuration complete");
    }

    /* -------------------------------------------------------------------------
     * ANALYTICS INITIALIZATION
     * ------------------------------------------------------------------------- */
    function initAnalytics(app) {
        if (!firebase.analytics) {
            debug.warn("Analytics not available");
            return null;
        }

        const analytics = firebase.analytics(app);

        if (debug.enabled) {
            analytics.setAnalyticsCollectionEnabled(false);
            debug.info("Analytics disabled in debug mode");
        } else {
            analytics.setAnalyticsCollectionEnabled(true);
            debug.info("Analytics enabled");
        }

        return analytics;
    }

    /* -------------------------------------------------------------------------
     * EXPOSE SERVICES TO GLOBAL WINDOW OBJECT
     * ------------------------------------------------------------------------- */
    function exposeServices(services, analytics) {
        Object.assign(window, {
            firebaseApp: services.app,
            auth: services.auth,
            db: services.db,
            storage: services.storage,
            firebaseAnalytics: analytics,
            firebaseDebug: debug
        });

        window.dispatchEvent(
            new CustomEvent("firebaseInitialized", {
                detail: {
                    timestamp: new Date(),
                    services: Object.keys(services),
                    debugMode: debug.enabled
                }
            })
        );

        debug.info("Services exposed to global window");
    }

    /* -------------------------------------------------------------------------
     * PERFORMANCE LOGGING
     * ------------------------------------------------------------------------- */
    function logPerformance(startTime) {
        const duration = performance.now() - startTime;

        debug.info("Firebase initialization performance", {
            duration_ms: Math.round(duration)
        });

        if (window.firebaseAnalytics && !debug.enabled) {
            window.firebaseAnalytics.logEvent("firebase_init_complete", {
                duration_ms: Math.round(duration)
            });
        }
    }

    /* -------------------------------------------------------------------------
     * ERROR HANDLING + RETRY SYSTEM
     * ------------------------------------------------------------------------- */
    async function handleInitError(error) {
        firebaseState.errors.push({
            message: error.message,
            timestamp: new Date(),
            retryCount: firebaseState.retryCount
        });

        debug.error("Firebase initialization failed", error);

        // Retry (exponential backoff)
        if (firebaseState.retryCount < firebaseState.maxRetries) {
            firebaseState.retryCount++;
            const delay = Math.min(1000 * Math.pow(2, firebaseState.retryCount), 10000);
            debug.warn(`Retrying initialization in ${delay}ms...`);

            return setTimeout(initializeFirebase, delay);
        }

        debug.error("Exceeded retry limit. Falling back to mock services.");

        if (isDevEnvironment()) createMockServices();
        else showFriendlyErrorMessage();
    }

    /* -------------------------------------------------------------------------
     * CHECK FOR DEVELOPMENT ENVIRONMENT
     * ------------------------------------------------------------------------- */
    function isDevEnvironment() {
        const host = window.location.hostname;
        return ["localhost", "127.0.0.1"].includes(host) || host.includes("192.168.");
    }

    /* -------------------------------------------------------------------------
     * MOCK SERVICES FOR DEVELOPMENT
     * ------------------------------------------------------------------------- */
    function createMockServices() {
        debug.warn("Using mock Firebase services (development mode)");

        const mockAuth = {
            currentUser: null,
            onAuthStateChanged: cb => {
                debug.debug("Mock auth listener added");
                setTimeout(() => cb(null), 50);
            }
        };

        const mockDB = {
            collection: name => ({
                doc: id => ({
                    get: () => Promise.resolve({ exists: false }),
                    set: data => Promise.resolve(),
                    update: data => Promise.resolve(),
                    delete: () => Promise.resolve()
                })
            })
        };

        const mockStorage = {
            ref: () => ({
                put: () => Promise.reject("Mock storage cannot upload"),
                getDownloadURL: () => Promise.reject("Mock storage has no URLs")
            })
        };

        window.auth = mockAuth;
        window.db = mockDB;
        window.storage = mockStorage;

        firebaseState.initialized = true;

        debug.info("Mock services ready");
    }

    /* -------------------------------------------------------------------------
     * USER-FRIENDLY ERROR EVENT
     * ------------------------------------------------------------------------- */
    function showFriendlyErrorMessage() {
        window.dispatchEvent(
            new CustomEvent("firebaseError", {
                detail: {
                    message: "Unable to connect to services. Check your internet and try again."
                }
            })
        );
    }

    /* -------------------------------------------------------------------------
     * MAIN INITIALIZATION FUNCTION
     * ------------------------------------------------------------------------- */
    async function initializeFirebase() {
        try {
            debug.info("Starting Firebase initialization...");

            validateFirebaseConfig(firebaseConfig);
            await checkFirebaseSDK();

            const app = initFirebaseApp();
            const services = initServices(app);

            configureFirestore(services.db);
            configureAuth(services.auth);

            const analytics = initAnalytics(app);

            services.app = app;
            exposeServices(services, analytics);

            firebaseState.initialized = true;
            firebaseState.initializationTime = new Date();

            logPerformance(initStartTime);

            debug.info("Firebase successfully initialized");
        } catch (err) {
            await handleInitError(err);
        }
    }

    /* -------------------------------------------------------------------------
     * API FOR OUTSIDE CODE TO CHECK STATUS
     * ------------------------------------------------------------------------- */
    window.getFirebaseStatus = () => ({
        initialized: firebaseState.initialized,
        timestamp: new Date().toISOString(),
        debugMode: debug.enabled,
        retryCount: firebaseState.retryCount,
        services: firebaseState.services,
        errors: firebaseState.errors
    });

    /* -------------------------------------------------------------------------
     * DEBUG CONTROL CONSOLE API
     * ------------------------------------------------------------------------- */
    window.firebaseDebugControls = {
        enable: () => debug.enable(),
        disable: () => debug.disable(),
        export: () => debug.exportLogs(),
        stats: () => debug.stats,
        status: () => window.getFirebaseStatus()
    };

    /* -------------------------------------------------------------------------
     * START INITIALIZATION WHEN PAGE IS READY
     * ------------------------------------------------------------------------- */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeFirebase);
    } else {
        initializeFirebase();
    }

    debug.info("Firebase initializer script loaded");

})(window);


