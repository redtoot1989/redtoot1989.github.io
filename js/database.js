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
        this.config = window.CONFIG || {};

        // Centralized collection names for consistency and easy editing
        this.collections = {
            USERS: 'users',
            PROFILES: 'profiles',
            CATEGORIES: 'categories',
            PLATFORMS: 'platforms',
            VIP_PLANS: 'vip_plans',
            VIP_SUBSCRIPTIONS: 'vip_subscriptions',
            FAVORITES: 'favorites',
            REPORTS: 'reports',
            NOTIFICATIONS: 'notifications',
            SITE_STATISTICS: 'site_statistics',
            AUDIT_LOGS: 'audit_logs',
            SETTINGS: 'settings'
        };
        this.collections = { ...this.collections, ...(this.config.collections || {}) };

        this.init();
    }

    /**
     * Called when the manager is created.
     */
    init() {
        this.log('Database Structure Manager initialized');
    }

    log(...args) {
        if (this.config.debug) console.log(...args);
    }

    error(...args) {
        if (this.config.debug) console.error(...args);
    }

    // ============================================================
    //  COLLECTION INITIALIZATION
    // ============================================================

    /**
     * Initializes all collections and inserts default values.
     */
    async initializeAllCollections() {
        try {
            this.log('🔄 Initializing database collections...');

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

            this.log('✅ All collections initialized successfully');
            return { success: true, message: 'Database initialized successfully' };

        } catch (error) {
            this.error('❌ Error initializing collections:', error);
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
            email: this.config.app?.supportEmail || 'redtoot1989@gmail.com',
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
            this.log('✅ Users collection initialized with admin user');
        }

        return true;
    }

    /**
     * Profiles collection is created automatically by Firestore.
     */
    async createProfilesCollection() {
        this.log('✅ Profiles collection structure defined');
        return true;
    }

    /**
     * Inserts default categories.
     */
    async createCategoriesCollection() {
        const defaultCategories = (this.config.categories || []).map((category, index) => ({
            categoryId: category.id,
            id: category.id,
            name: category.nameEn || category.id,
            nameAr: category.nameAr,
            description: category.nameAr,
            icon: 'fas fa-folder',
            isActive: true,
            sortOrder: index + 1,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }));

        const batch = this.db.batch();

        defaultCategories.forEach(category => {
            const ref = this.db.collection(this.collections.CATEGORIES).doc(category.categoryId);
            batch.set(ref, category);
        });

        await batch.commit();
        this.log('✅ Categories collection initialized with default data');
        return true;
    }

    /**
     * Inserts default platform definitions.
     */
    async createPlatformsCollection() {
        const defaultPlatforms = Object.values(this.config.platforms || {}).map((platform, index) => ({
            platformId: platform.id,
            id: platform.id,
            name: platform.nameEn,
            nameAr: platform.nameAr,
            icon: platform.icon,
            color: platform.color,
            baseUrl: platform.baseUrl,
            isActive: true,
            sortOrder: index + 1,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }));

        const batch = this.db.batch();

        defaultPlatforms.forEach(platform => {
            const ref = this.db.collection(this.collections.PLATFORMS).doc(platform.platformId);
            batch.set(ref, platform);
        });

        await batch.commit();
        this.log('✅ Platforms collection initialized with default data');
        return true;
    }

    /**
     * Inserts default VIP subscription plans.
     */
    async createVipPlansCollection() {
        const defaultPlans = Object.values(this.config.vipPlans || {}).map((plan) => ({
            planId: plan.id,
            id: plan.id,
            name: plan.nameEn || plan.id,
            nameAr: plan.nameAr,
            duration: plan.durationDays,
            durationDays: plan.durationDays,
            price: plan.price || 0,
            features: ['VIP badge', 'Priority listing'],
            featuresAr: ['شارة VIP', 'أولوية في الظهور'],
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }));

        const batch = this.db.batch();

        defaultPlans.forEach(plan => {
            const ref = this.db.collection(this.collections.VIP_PLANS).doc(plan.planId);
            batch.set(ref, plan);
        });

        await batch.commit();
        this.log('✅ VIP Plans collection initialized with default data');
        return true;
    }

    /**
     * Firestore auto-creates this collection.
     */
    async createUserFavoritesCollection() {
        this.log('✅ User Favorites collection structure defined');
        return true;
    }

    /**
     * Firestore auto-creates this collection.
     */
    async createUserReportsCollection() {
        this.log('✅ User Reports collection structure defined');
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
        this.log('✅ Site Statistics collection initialized');
        return true;
    }

    /**
     * Audit logs are stored automatically.
     */
    async createAuditLogsCollection() {
        this.log('✅ Audit Logs collection structure defined');
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
                    autoApproveProfiles: true
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
                    adminEmail: this.config.app?.supportEmail || 'redtoot1989@gmail.com',
                    supportEmail: this.config.app?.supportEmail || 'redtoot1989@gmail.com',
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
        this.log('✅ Settings collection initialized with default data');
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
            this.log('🔍 Validating database structure...');

            const results = await Promise.all([
                this.validateUsersCollection(),
                this.validateProfilesCollection(),
                this.validateCategoriesCollection(),
                this.validatePlatformsCollection(),
                this.updateStatistics()
            ]);

            this.log('✅ Database validation completed');
            return { success: true, results, message: 'Database validated successfully' };

        } catch (error) {
            this.error('❌ Database validation error:', error);
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
            this.log(`⚙️ Fixed ${fixedCount} user records`);
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
            if (profile.isRoyal === undefined) updates.isRoyal = false;
            if (profile.verified === undefined) updates.verified = false;
            if (!profile.profileType) updates.profileType = 'person';
            if (profile.isFeatured === undefined) updates.isFeatured = false;
            if (profile.views === undefined) updates.views = 0;
            if (profile.likes === undefined) updates.likes = 0;
            if (profile.shares === undefined) updates.shares = 0;
            if (profile.reports === undefined) updates.reports = 0;
            if (profile.clicksCount === undefined) updates.clicksCount = 0;
            if (profile.shareCount === undefined) updates.shareCount = 0;
            if (profile.redtootScore === undefined) updates.redtootScore = this.calculateRedTootScore(profile);
            if (profile.completenessScore === undefined) updates.completenessScore = this.calculateCompletenessScore(profile);

            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                fixedCount++;
            }
        });

        if (fixedCount > 0) {
            await batch.commit();
            this.log(`⚙️ Fixed ${fixedCount} profile records`);
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

    calculateCompletenessScore(profile = {}) {
        const checks = [
            !!profile.name,
            !!profile.username,
            !!profile.platform,
            !!profile.profileLink,
            !!profile.category,
            !!profile.location,
            !!profile.gender,
            !!profile.description,
            Array.isArray(profile.socialLinks) && profile.socialLinks.length > 0
        ];
        return Math.round((checks.filter(Boolean).length / checks.length) * 100);
    }

    calculateRedTootScore(profile = {}) {
        const weights = this.config.scoreWeights || {};
        return Math.round(
            Number(profile.views || 0) * (weights.view || 1) +
            Number(profile.clicksCount || profile.addCount || profile.adds || 0) * (weights.click || 3) +
            Number(profile.favoriteCount || profile.likes || 0) * (weights.favorite || 5) +
            Number(profile.shareCount || profile.shares || 0) * (weights.share || 4) +
            (profile.isVip ? (weights.vip || 15) : 0) +
            (profile.isRoyal ? (weights.royal || 30) : 0) +
            (profile.verified ? (weights.verified || 20) : 0) +
            Number(profile.completenessScore || this.calculateCompletenessScore(profile)) * (weights.completeness || 0.5)
        );
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

            this.log('📊 Statistics updated');
            return stats;

        } catch (error) {
            this.error('❌ Error updating statistics:', error);
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
            this.error('❌ Error retrieving statistics:', error);
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
            this.error('❌ Error getting categories:', error);
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
            this.error('❌ Error getting platforms:', error);
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
            this.error('❌ Error getting VIP plans:', error);
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
            this.error('❌ Error getting settings:', error);
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
            this.error('❌ Error updating settings:', error);
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

            this.log(`🧹 Deleted ${oldLogsSnapshot.size} old audit logs`);
            return { success: true, cleaned: oldLogsSnapshot.size };

        } catch (error) {
            this.error('❌ Error cleaning old data:', error);
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
            this.error('❌ Error getting database info:', error);
            throw error;
        }
    }
}

class DatabaseManager {
    constructor() {
        this.db = window.db;
        this.helpers = window.AppHelpers;
        this.config = window.CONFIG || {};
        this.collections = this.config.collections || {
            USERS: 'users',
            PROFILES: 'profiles',
            REPORTS: 'reports',
            FAVORITES: 'favorites',
            VIP_PLANS: 'vip_plans',
            VIP_SUBSCRIPTIONS: 'vip_subscriptions',
            NOTIFICATIONS: 'notifications',
            SITE_STATISTICS: 'site_statistics'
        };
    }

    async addProfile(profileData) {
        if (!this.db) throw new Error('Firestore is not ready');
        const user = window.authManager?.currentUser || window.auth?.currentUser || null;

        const validation = window.FormValidators?.validateProfile?.(profileData);
        if (validation && !validation.isValid) throw new Error(validation.message);

        const cleanProfile = this.sanitizeProfile(profileData);
        const ref = this.db.collection(this.collections.PROFILES).doc();
        const completenessScore = this.calculateCompletenessScore(cleanProfile);
        const hexId = await this.helpers?.generateUniqueHexId?.(this.collections.PROFILES, 'hexId') || ref.id.slice(0, 8).toUpperCase();
        const payload = {
            ...cleanProfile,
            id: ref.id,
            hexId,
            ownerId: user?.uid || null,
            userId: user?.uid || null,
            userEmail: user?.email || '',
            submittedBy: user ? 'registered' : 'guest',
            status: 'approved',
            membershipLevel: 'normal',
            membershipPriority: 0,
            isVip: false,
            isRoyal: false,
            verified: false,
            isFeatured: false,
            featuredUntil: null,
            vipExpiry: null,
            isBlocked: false,
            views: 0,
            likes: 0,
            adds: 0,
            addCount: 0,
            clicksCount: 0,
            shares: 0,
            shareCount: 0,
            reports: 0,
            reportCount: 0,
            favoriteCount: 0,
            redtootScore: Math.round(completenessScore * (this.config.scoreWeights?.completeness || 0.5)),
            completenessScore,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            bumpedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await ref.set(payload);
        return { success: true, profileId: ref.id, profile: { id: ref.id, ...payload } };
    }

    async getProfiles(filters = {}, options = {}) {
        if (!this.db) throw new Error('Firestore is not ready');
        const limit = Math.min(Number(options.limit) || this.config.limits?.pageSize || 24, 100);
        let query = this.db.collection(this.collections.PROFILES);

        if (filters.status) query = query.where('status', '==', filters.status);
        if (filters.platform) query = query.where('platform', '==', filters.platform);
        if (filters.isVip === true) query = query.where('isVip', '==', true);
        if (filters.verified === true) query = query.where('verified', '==', true);
        if (filters.isFeatured === true) query = query.where('isFeatured', '==', true);
        if (filters.profileType) query = query.where('profileType', '==', filters.profileType);
        if (filters.category) query = query.where('category', '==', filters.category);
        if (filters.ownerId || filters.userId) query = query.where('ownerId', '==', filters.ownerId || filters.userId);

        if (options.sort === 'oldest') query = query.orderBy('createdAt', 'asc');
        else if (options.sort === 'favorites') query = query.orderBy('favoriteCount', 'desc');
        else if (options.sort === 'popular') query = query.orderBy('views', 'desc');
        else if (options.sort === 'score') query = query.orderBy('redtootScore', 'desc');
        else if (options.sort === 'bumped') query = query.orderBy('bumpedAt', 'desc');
        else if (options.sort === 'vip') query = query.orderBy('isVip', 'desc').orderBy('createdAt', 'desc');
        else query = query.orderBy('membershipPriority', 'desc').orderBy('bumpedAt', 'desc');

        if (options.cursor) query = query.startAfter(options.cursor);
        query = query.limit(limit + 1);
        const snap = await query.get();
        const docs = snap.docs.slice(0, limit);
        return {
            profiles: docs.map(doc => ({ id: doc.id, ...doc.data() })),
            hasMore: snap.docs.length > limit,
            nextCursor: docs.length ? docs[docs.length - 1] : null
        };
    }

    async getProfileById(profileId) {
        if (!profileId) return null;
        const doc = await this.db.collection(this.collections.PROFILES).doc(profileId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    async getRecentProfiles(limit = 8) {
        const result = await this.getProfiles({ status: 'approved' }, { limit });
        return result.profiles;
    }

    async getVipProfiles(limit = 8) {
        const result = await this.getProfiles({ status: 'approved', isVip: true }, { limit });
        return result.profiles;
    }

    async searchProfiles(searchText = '', filters = {}) {
        const result = await this.getProfiles({ status: 'approved', ...filters }, { limit: 100 });
        const term = String(searchText || '').trim().toLowerCase();
        if (!term) return result.profiles;
        return result.profiles.filter(profile => {
            const haystack = [
                profile.name,
                profile.username,
                profile.platform,
                profile.location,
                profile.description
            ].join(' ').toLowerCase();
            return haystack.includes(term);
        });
    }

    async incrementField(profileId, field, amount = 1) {
        if (!profileId || !field) throw new Error('Missing profile id or field');
        await this.db.collection(this.collections.PROFILES).doc(profileId).set({
            [field]: firebase.firestore.FieldValue.increment(amount),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    async bumpProfile(profileId) {
        if (!profileId) throw new Error('Missing profile id');
        await this.db.collection(this.collections.PROFILES).doc(profileId).set({
            bumpedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { success: true };
    }

    async incrementAddCount(profileId) {
        await this.db.collection(this.collections.PROFILES).doc(profileId).set({
            adds: firebase.firestore.FieldValue.increment(1),
            addCount: firebase.firestore.FieldValue.increment(1),
            clicksCount: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { success: true };
    }

    async incrementShareCount(profileId) {
        await this.db.collection(this.collections.PROFILES).doc(profileId).set({
            shares: firebase.firestore.FieldValue.increment(1),
            shareCount: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { success: true };
    }

    async toggleFavorite(profileId) {
        const user = window.authManager?.currentUser || window.auth?.currentUser;
        if (!user) throw new Error('سجل الدخول لاستخدام المفضلة');
        const key = `${user.uid}_${profileId}`;
        const favoriteRef = this.db.collection(this.collections.FAVORITES).doc(key);
        const favorite = await favoriteRef.get();
        const profileRef = this.db.collection(this.collections.PROFILES).doc(profileId);
        const nextState = !favorite.exists;

        window.dispatchEvent(new CustomEvent('favoriteToggled', {
            detail: { profileId, favorited: nextState, optimistic: true }
        }));

        try {
            await this.retry(async () => {
                const freshFavorite = await favoriteRef.get();
                const batch = this.db.batch();

                if (freshFavorite.exists) {
                    batch.delete(favoriteRef);
                    batch.set(profileRef, {
                        favoriteCount: firebase.firestore.FieldValue.increment(-1),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                } else {
                    batch.set(favoriteRef, {
                        id: key,
                        userId: user.uid,
                        profileId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    batch.set(profileRef, {
                        favoriteCount: firebase.firestore.FieldValue.increment(1),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                await batch.commit();
            });
            return { favorited: nextState };
        } catch (error) {
            window.dispatchEvent(new CustomEvent('favoriteToggled', {
                detail: { profileId, favorited: !nextState, reverted: true }
            }));
            throw error;
        }
    }

    async retry(operation, retries = 3, delay = 500) {
        let lastError;
        for (let attempt = 0; attempt < retries; attempt += 1) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (attempt < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
                }
            }
        }
        throw lastError;
    }

    async createReport(profileId, reason) {
        const user = window.authManager?.currentUser || window.auth?.currentUser;
        if (!user) throw new Error('سجل الدخول لإرسال بلاغ');
        if (!reason || reason.trim().length < 3) throw new Error('اكتب سبب البلاغ');
        const ref = this.db.collection(this.collections.REPORTS).doc();
        await ref.set({
            id: ref.id,
            profileId,
            userId: user.uid,
            reason: reason.trim().slice(0, 500),
            status: 'open',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await this.incrementField(profileId, 'reportCount', 1);
        return { success: true, reportId: ref.id };
    }

    async upgradeToVip(userId, planId) {
        const user = window.authManager?.currentUser || window.auth?.currentUser;
        if (!user) throw new Error('سجل الدخول أولا');
        const plan = this.config.vipPlans?.[planId] || this.config.vipPlans?.monthly;
        const request = {
            userId,
            planId,
            status: 'pending',
            amount: plan?.price || 0,
            durationDays: plan?.durationDays || 30,
            requestedAt: new Date().toISOString()
        };
        localStorage.setItem(`redtoot_vip_request_${userId}`, JSON.stringify(request));
        return { success: true, pendingManualApproval: true, request };
    }

    sanitizeProfile(profileData) {
        const sanitize = (value, max = 500) => String(value || '').trim().slice(0, max);
        const username = sanitize(profileData.username, 80).replace(/^@+/, '');
        const platform = sanitize(profileData.platform, 40);
        const profileLink = sanitize(profileData.profileLink || profileData.url, 500) || this.buildProfileLink(platform, username);
        return {
            platform,
            name: sanitize(profileData.name, 80) || username,
            username,
            profileType: this.normalizeProfileType(profileData.profileType),
            category: sanitize(profileData.category, 40) || 'general',
            location: sanitize(profileData.location, 80),
            ageRange: sanitize(profileData.ageRange || profileData.age, 20),
            age: sanitize(profileData.ageRange || profileData.age, 20),
            gender: sanitize(profileData.gender, 20),
            hobbies: Array.isArray(profileData.hobbies) ? profileData.hobbies.map(item => sanitize(item, 40)) : [],
            socialLinks: [],
            profileLink,
            description: sanitize(profileData.description, 500)
        };
    }

    normalizeProfileType(type) {
        const id = String(type || 'person').trim();
        return this.config.profileTypes?.[id] ? id : 'person';
    }

    calculateCompletenessScore(profile = {}) {
        const checks = [
            !!profile.name,
            !!profile.username,
            !!profile.platform,
            !!profile.profileLink,
            !!profile.category,
            !!profile.location,
            !!profile.gender,
            !!profile.description,
            Array.isArray(profile.socialLinks) && profile.socialLinks.length > 0
        ];
        const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
        return Math.max(0, Math.min(score, 100));
    }

    calculateRedTootScore(profile = {}) {
        const weights = this.config.scoreWeights || {};
        const views = Number(profile.views || 0) * (weights.view || 1);
        const clicks = Number(profile.clicksCount || profile.addCount || profile.adds || 0) * (weights.click || 3);
        const favorites = Number(profile.favoriteCount || profile.likes || 0) * (weights.favorite || 5);
        const shares = Number(profile.shareCount || profile.shares || 0) * (weights.share || 4);
        const vip = profile.isVip ? (weights.vip || 15) : 0;
        const royal = profile.isRoyal ? (weights.royal || 30) : 0;
        const verified = profile.verified ? (weights.verified || 20) : 0;
        const completeness = Number(profile.completenessScore || this.calculateCompletenessScore(profile)) * (weights.completeness || 0.5);
        return Math.round(views + clicks + favorites + shares + vip + royal + verified + completeness);
    }

    buildProfileLink(platform, username) {
        const bases = Object.fromEntries(Object.values(this.config.platforms || {}).map(platformConfig => [platformConfig.id, platformConfig.baseUrl]));
        return username && bases[platform] ? `${bases[platform]}${encodeURIComponent(username)}` : '';
    }
}

function createDatabaseServices() {
    if (!window.db) return;
    if (!window.dbStructure) window.dbStructure = new DatabaseStructure();
    if (!window.dbManager) window.dbManager = new DatabaseManager();
    window.dispatchEvent(new CustomEvent('databaseReady', { detail: { dbManager: window.dbManager } }));
}

if (window.db) {
    createDatabaseServices();
} else {
    window.addEventListener('firebaseInitialized', createDatabaseServices, { once: true });
}
