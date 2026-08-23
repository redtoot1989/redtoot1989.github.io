/**
 * ============================================================
 *  Database Structure Manager
 *  ------------------------------------------------------------
 *  Handles Firestore schema initialization, validation,
 *  default data insertion, statistics updates, and maintenance.
 * ============================================================
 */

class DatabaseStructure {
    constructor() {
        // Global Firestore instance
        this.db = window.db;

        // Helper utilities injected from the app
        this.helpers = window.AppHelpers;

        // Centralized collection names for consistency and easy editing
        this.collections = {
            USERS: 'users',
            PROFILES: 'profiles',
            CATEGORIES: 'categories',
            PLATFORMS: 'platforms',
            VIP_PLANS: 'vip_plans',
            USER_FAVORITES: 'user_favorites',
            USER_REPORTS: 'user_reports',
            SITE_STATISTICS: 'site_statistics',
            AUDIT_LOGS: 'audit_logs',
            SETTINGS: 'settings'
        };

        this.init();
    }

    /**
     * Called when the manager is created.
     */
    init() {
        console.log('🗃️ Database Structure Manager initialized');
    }

    // ============================================================
    //  COLLECTION INITIALIZATION
    // ============================================================

    /**
     * Initializes all collections and inserts default values.
     */
    async initializeAllCollections() {
        try {
            console.log('🔄 Initializing database collections...');

            await Promise.all([
                this.createUsersCollection(),
                this.createProfilesCollection(),
                this.createCategoriesCollection(),
                this.createPlatformsCollection(),
                this.createVipPlansCollection(),
                this.createUserFavoritesCollection(),
                this.createUserReportsCollection(),
                this.createSiteStatisticsCollection(),
                this.createAuditLogsCollection(),
                this.createSettingsCollection()
            ]);

            console.log('✅ All collections initialized successfully');
            return { success: true, message: 'Database initialized successfully' };

        } catch (error) {
            console.error('❌ Error initializing collections:', error);
            return { 
                success: false, 
                error: this.helpers.handleError(error, 'db_initialization') 
            };
        }
    }

    /**
     * Create the Users collection and ensure a default admin user exists.
     */
    async createUsersCollection() {
        const defaultAdmin = {
            userId: 'admin',
            email: 'admin@example.com',
            displayName: 'System Admin',
            photoURL: '',
            isVip: true,
            vipPlan: 'professional',
            vipSince: firebase.firestore.FieldValue.serverTimestamp(),
            vipExpires: null, // Permanent VIP
            isAdmin: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        };

        // Check if admin user already exists
        const adminDoc = await this.db.collection(this.collections.USERS).doc('admin').get();

        if (!adminDoc.exists) {
            await this.db.collection(this.collections.USERS).doc('admin').set(defaultAdmin);
            console.log('✅ Users collection initialized with admin user');
        }

        return true;
    }

    /**
     * Profiles collection is created automatically by Firestore.
     */
    async createProfilesCollection() {
        console.log('✅ Profiles collection structure defined');
        return true;
    }

    /**
     * Inserts default categories.
     */
    async createCategoriesCollection() {
        const defaultCategories = [
            { categoryId: 'art', name: 'Art', nameAr: 'فن', description: 'Art & Drawing', icon: '🎨', isActive: true, sortOrder: 1, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { categoryId: 'sports', name: 'Sports', nameAr: 'رياضة', description: 'Sports & Fitness', icon: '⚽', isActive: true, sortOrder: 2, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { categoryId: 'education', name: 'Education', nameAr: 'تعليم', description: 'Education & Study', icon: '📚', isActive: true, sortOrder: 3, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { categoryId: 'entertainment', name: 'Entertainment', nameAr: 'ترفيه', description: 'Entertainment', icon: '🎭', isActive: true, sortOrder: 4, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { categoryId: 'business', name: 'Business', nameAr: 'أعمال', description: 'Business & Trade', icon: '💼', isActive: true, sortOrder: 5, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { categoryId: 'other', name: 'Other', nameAr: 'أخرى', description: 'Miscellaneous Categories', icon: '🔷', isActive: true, sortOrder: 6, createdAt: firebase.firestore.FieldValue.serverTimestamp() }
        ];

        const batch = this.db.batch();

        defaultCategories.forEach(category => {
            const ref = this.db.collection(this.collections.CATEGORIES).doc(category.categoryId);
            batch.set(ref, category);
        });

        await batch.commit();
        console.log('✅ Categories collection initialized with default data');
        return true;
    }

    /**
     * Inserts default platform definitions.
     */
    async createPlatformsCollection() {
        const defaultPlatforms = [
            { platformId: 'instagram', name: 'Instagram', nameAr: 'انستغرام', icon: '📷', isActive: true, sortOrder: 1, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { platformId: 'tiktok', name: 'TikTok', nameAr: 'تيك توك', icon: '🎵', isActive: true, sortOrder: 2, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { platformId: 'x', name: 'X', nameAr: 'اكس', icon: '🐦', isActive: true, sortOrder: 3, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { platformId: 'snapchat', name: 'Snapchat', nameAr: 'سناب شات', icon: '👻', isActive: true, sortOrder: 4, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { platformId: 'youtube', name: 'YouTube', nameAr: 'يوتيوب', icon: '📺', isActive: true, sortOrder: 5, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
            { platformId: 'other', name: 'Other', nameAr: 'أخرى', icon: '🔶', isActive: true, sortOrder: 6, createdAt: firebase.firestore.FieldValue.serverTimestamp() }
        ];

        const batch = this.db.batch();

        defaultPlatforms.forEach(platform => {
            const ref = this.db.collection(this.collections.PLATFORMS).doc(platform.platformId);
            batch.set(ref, platform);
        });

        await batch.commit();
        console.log('✅ Platforms collection initialized with default data');
        return true;
    }

    /**
     * Inserts default VIP subscription plans.
     */
    async createVipPlansCollection() {
        const defaultPlans = [
            {
                planId: 'basic',
                name: 'Basic VIP',
                nameAr: 'باقة أساسية',
                duration: 30,
                price: 9.99,
                features: ['Profile Highlight', 'Priority Search', 'Basic Stats'],
                featuresAr: ['تمييز الملف الشخصي', 'ظهور في نتائج البحث الأولى', 'إحصائيات أساسية'],
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                planId: 'premium',
                name: 'Premium VIP',
                nameAr: 'باقة مميزة',
                duration: 90,
                price: 24.99,
                features: ['All Basic Features', 'Homepage Visibility', 'Advanced Stats', 'Premium Support'],
                featuresAr: ['كل ميزات الباقة الأساسية', 'ظهور في الصفحة الرئيسية', 'إحصائيات متقدمة', 'دعم فني متميز'],
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                planId: 'professional',
                name: 'Professional VIP',
                nameAr: 'باقة احترافية',
                duration: 365,
                price: 79.99,
                features: ['All Premium Features', 'Highest Visibility', 'Full Stats', 'Instant Support', 'Exclusive Benefits'],
                featuresAr: ['كل ميزات الباقة المميزة', 'أعلى ظهور في النتائج', 'إحصائيات كاملة', 'دعم فني فوري', 'ميزات حصرية'],
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        ];

        const batch = this.db.batch();

        defaultPlans.forEach(plan => {
            const ref = this.db.collection(this.collections.VIP_PLANS).doc(plan.planId);
            batch.set(ref, plan);
        });

        await batch.commit();
        console.log('✅ VIP Plans collection initialized with default data');
        return true;
    }

    /**
     * Firestore auto-creates this collection.
     */
    async createUserFavoritesCollection() {
        console.log('✅ User Favorites collection structure defined');
        return true;
    }

    /**
     * Firestore auto-creates this collection.
     */
    async createUserReportsCollection() {
        console.log('✅ User Reports collection structure defined');
        return true;
    }

    /**
     * Initializes site statistics.
     */
    async createSiteStatisticsCollection() {
        const initialStats = {
            statId: 'current',
            totalUsers: 1,
            totalProfiles: 0,
            activeProfiles: 0,
            vipUsers: 1,
            vipProfiles: 0,
            pendingProfiles: 0,
            totalViews: 0,
            totalLikes: 0,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.db.collection(this.collections.SITE_STATISTICS).doc('current').set(initialStats);
        console.log('✅ Site Statistics collection initialized');
        return true;
    }

    /**
     * Audit logs are stored automatically.
     */
    async createAuditLogsCollection() {
        console.log('✅ Audit Logs collection structure defined');
        return true;
    }

    /**
     * Inserts default site settings.
     */
    async createSettingsCollection() {
        const defaultSettings = [
            {
                settingId: 'site_config',
                key: 'site_config',
                value: {
                    siteName: 'Social Profiles',
                    siteNameAr: 'الملفات الاجتماعية',
                    description: 'Platform to find social media profiles',
                    descriptionAr: 'منصة للعثور على ملفات وسائل التواصل الاجتماعي',
                    maintenanceMode: false,
                    allowRegistrations: true,
                    maxProfilesPerUser: 5,
                    autoApproveProfiles: false
                },
                description: 'General site settings',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'system'
            },
            {
                settingId: 'seo_settings',
                key: 'seo_settings',
                value: {
                    metaTitle: 'Social Profiles Platform',
                    metaDescription: 'Find and connect with social media profiles',
                    keywords: 'social, profiles, media, connect',
                    googleAnalyticsId: ''
                },
                description: 'SEO Settings',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'system'
            },
            {
                settingId: 'email_settings',
                key: 'email_settings',
                value: {
                    adminEmail: 'admin@example.com',
                    supportEmail: 'support@example.com',
                    sendNotifications: true
                },
                description: 'Email Configuration Settings',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'system'
            }
        ];

        const batch = this.db.batch();

        defaultSettings.forEach(setting => {
            const ref = this.db.collection(this.collections.SETTINGS).doc(setting.settingId);
            batch.set(ref, setting);
        });

        await batch.commit();
        console.log('✅ Settings collection initialized with default data');
        return true;
    }

    // ============================================================
    //  VALIDATION & DATA INTEGRITY
    // ============================================================

    /**
     * Validates all collections and repairs missing values.
     */
    async validateAndFixDatabase() {
        try {
            console.log('🔍 Validating database structure...');

            const results = await Promise.all([
                this.validateUsersCollection(),
                this.validateProfilesCollection(),
                this.validateCategoriesCollection(),
                this.validatePlatformsCollection(),
                this.updateStatistics()
            ]);

            console.log('✅ Database validation completed');
            return { success: true, results, message: 'Database validated successfully' };

        } catch (error) {
            console.error('❌ Database validation error:', error);
            return {
                success: false,
                error: this.helpers.handleError(error, 'db_validation')
            };
        }
    }

    /**
     * Ensures all users have required fields.
     */
    async validateUsersCollection() {
        const snapshot = await this.db.collection(this.collections.USERS).get();
        let fixedCount = 0;

        const batch = this.db.batch();

        snapshot.docs.forEach(doc => {
            const user = doc.data();
            const updates = {};

            if (!user.createdAt) updates.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            if (!user.updatedAt) updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            if (!user.status) updates.status = 'active';
            if (user.isVip === undefined) updates.isVip = false;

            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                fixedCount++;
            }
        });

        if (fixedCount > 0) {
            await batch.commit();
            console.log(`⚙️ Fixed ${fixedCount} user records`);
        }

        return { collection: 'users', fixed: fixedCount, total: snapshot.size };
    }

    /**
     * Ensures all profiles have required fields.
     */
    async validateProfilesCollection() {
        const snapshot = await this.db.collection(this.collections.PROFILES).get();
        let fixedCount = 0;

        const batch = this.db.batch();

        snapshot.docs.forEach(doc => {
            const profile = doc.data();
            const updates = {};

            if (!profile.createdAt) updates.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            if (!profile.updatedAt) updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            if (!profile.status) updates.status = 'pending';
            if (profile.isVip === undefined) updates.isVip = false;
            if (profile.views === undefined) updates.views = 0;
            if (profile.likes === undefined) updates.likes = 0;
            if (profile.shares === undefined) updates.shares = 0;
            if (profile.reports === undefined) updates.reports = 0;

            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                fixedCount++;
            }
        });

        if (fixedCount > 0) {
            await batch.commit();
            console.log(`⚙️ Fixed ${fixedCount} profile records`);
        }

        return { collection: 'profiles', fixed: fixedCount, total: snapshot.size };
    }

    /**
     * Ensures categories exist; if missing, recreates them.
     */
    async validateCategoriesCollection() {
        const snapshot = await this.db.collection(this.collections.CATEGORIES).get();

        if (snapshot.size === 0) {
            await this.createCategoriesCollection();
            return { collection: 'categories', fixed: 6, total: 6 };
        }

        return { collection: 'categories', fixed: 0, total: snapshot.size };
    }

    /**
     * Ensures platforms exist; if missing, recreates them.
     */
    async validatePlatformsCollection() {
        const snapshot = await this.db.collection(this.collections.PLATFORMS).get();

        if (snapshot.size === 0) {
            await this.createPlatformsCollection();
            return { collection: 'platforms', fixed: 6, total: 6 };
        }

        return { collection: 'platforms', fixed: 0, total: snapshot.size };
    }

    // ============================================================
    //  STATISTICS MANAGEMENT
    // ============================================================

    /**
     * Recomputes global platform statistics.
     */
    async updateStatistics() {
        try {
            const [
                usersSnapshot,
                profilesSnapshot,
                pendingSnapshot,
                vipUsersSnapshot,
                vipProfilesSnapshot
            ] = await Promise.all([
                this.db.collection(this.collections.USERS).get(),
                this.db.collection(this.collections.PROFILES).get(),
                this.db.collection(this.collections.PROFILES).where('status', '==', 'pending').get(),
                this.db.collection(this.collections.USERS).where('isVip', '==', true).get(),
                this.db.collection(this.collections.PROFILES).where('isVip', '==', true).get()
            ]);

            let totalViews = 0;
            let totalLikes = 0;

            profilesSnapshot.docs.forEach(doc => {
                const profile = doc.data();
                totalViews += profile.views || 0;
                totalLikes += profile.likes || 0;
            });

            const stats = {
                totalUsers: usersSnapshot.size,
                totalProfiles: profilesSnapshot.size,
                activeProfiles: profilesSnapshot.size - pendingSnapshot.size,
                vipUsers: vipUsersSnapshot.size,
                vipProfiles: vipProfilesSnapshot.size,
                pendingProfiles: pendingSnapshot.size,
                totalViews,
                totalLikes,
                date: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection(this.collections.SITE_STATISTICS).doc('current').set(stats);

            console.log('📊 Statistics updated');
            return stats;

        } catch (error) {
            console.error('❌ Error updating statistics:', error);
            throw error;
        }
    }

    /**
     * Retrieves statistics, computing them if missing.
     */
    async getStatistics() {
        try {
            const doc = await this.db.collection(this.collections.SITE_STATISTICS).doc('current').get();

            if (!doc.exists) return await this.updateStatistics();

            return doc.data();
        } catch (error) {
            console.error('❌ Error retrieving statistics:', error);
            throw error;
        }
    }

    // ============================================================
    //  UTILITY METHODS
    // ============================================================

    async getCategories() {
        try {
            const snapshot = await this.db.collection(this.collections.CATEGORIES)
                .where('isActive', '==', true)
                .orderBy('sortOrder', 'asc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('❌ Error getting categories:', error);
            throw error;
        }
    }

    async getPlatforms() {
        try {
            const snapshot = await this.db.collection(this.collections.PLATFORMS)
                .where('isActive', '==', true)
                .orderBy('sortOrder', 'asc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('❌ Error getting platforms:', error);
            throw error;
        }
    }

    async getVipPlans() {
        try {
            const snapshot = await this.db.collection(this.collections.VIP_PLANS)
                .where('isActive', '==', true)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('❌ Error getting VIP plans:', error);
            throw error;
        }
    }

    async getSettings() {
        try {
            const snapshot = await this.db.collection(this.collections.SETTINGS).get();

            const settings = {};
            snapshot.docs.forEach(doc => {
                settings[doc.id] = doc.data();
            });

            return settings;
        } catch (error) {
            console.error('❌ Error getting settings:', error);
            throw error;
        }
    }

    async updateSetting(settingId, updates) {
        try {
            const updateData = {
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: window.authManager?.currentUser?.uid || 'system'
            };

            await this.db.collection(this.collections.SETTINGS).doc(settingId).update(updateData);

            return { success: true, message: 'Settings updated successfully' };
        } catch (error) {
            console.error('❌ Error updating settings:', error);
            return {
                success: false,
                error: this.helpers.handleError(error, 'update_settings')
            };
        }
    }

    /**
     * Deletes audit logs older than X days.
     */
    async cleanupOldData(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const oldLogsSnapshot = await this.db.collection(this.collections.AUDIT_LOGS)
                .where('timestamp', '<', cutoffDate)
                .get();

            const batch = this.db.batch();

            oldLogsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

            await batch.commit();

            console.log(`🧹 Deleted ${oldLogsSnapshot.size} old audit logs`);
            return { success: true, cleaned: oldLogsSnapshot.size };

        } catch (error) {
            console.error('❌ Error cleaning old data:', error);
            return {
                success: false,
                error: this.helpers.handleError(error, 'data_cleanup')
            };
        }
    }

    /**
     * Returns the count and approximate size of all collections.
     */
    async getDatabaseInfo() {
        try {
            const collections = Object.values(this.collections);
            const info = {};

            for (const collection of collections) {
                const snapshot = await this.db.collection(collection).get();
                info[collection] = {
                    count: snapshot.size,
                    size: JSON.stringify(snapshot.docs.map(doc => doc.data())).length
                };
            }

            return info;
        } catch (error) {
            console.error('❌ Error getting database info:', error);
            throw error;
        }
    }
}

// Create global instance
window.dbStructure = new DatabaseStructure();

