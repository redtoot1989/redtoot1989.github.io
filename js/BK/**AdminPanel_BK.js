/**
 * Admin Panel - Enhanced with real-time updates and bulk operations
 * All comments rewritten in clean English
 */

class AdminPanel {
    constructor(options = {}) {
        // Merge default options with provided ones
        this.options = Object.assign({
            recentLimit: 10,
            reportLimit: 10,
            itemsPerPage: 20,
            cacheDuration: 60000 // Cache duration: 1 minute
        }, options);

        // Global project dependencies
        this.auth = window.authManager;
        this.db = window.dbManager;
        this.helpers = window.AppHelpers;

        // Authentication and admin status
        this.currentUser = null;
        this.isAdmin = false;

        // Main admin data containers
        this.data = {
            pendingProfiles: [],
            recentUsers: [],
            reports: [],
            statistics: null
        };

        // Initialize admin panel
        this.init();
    }

    /** Initialize the admin panel */
    async init() {
        try {
            // Step 1: Confirm user is admin
            await this.verifyAdminStatus();

            // Step 2: Set up UI components
            this.initializeUI();

            // Step 3: Register global event listeners
            this.setupEventListeners();

            // Step 4: Attach Firestore real-time listeners
            this.setupRealtimeListeners();

            // Step 5: Load initial dashboard data
            await this.loadAllData();

            console.log('🛠️ Admin panel initialized successfully');

        } catch (error) {
            console.error('Admin panel initialization failed:', error);
            this.handleAdminError(error);
        }
    }

    /** Validate the user's admin privileges */
    async verifyAdminStatus() {
        this.currentUser = this.auth.currentUser;

        // If user not logged in → redirect to login
        if (!this.currentUser) {
            window.location.href = '/pages/auth/login.html';
            throw new Error('Not authenticated');
        }

        // Check if the user has admin permissions
        this.isAdmin = await this.auth.checkAdminStatus();

        if (!this.isAdmin) {
            window.location.href = '/';
            throw new Error('You do not have permission to access the admin panel');
        }

        return true;
    }

    /** Prepare UI components such as tables, charts, and modals */
    initializeUI() {
        this.initializeDataTables();
        this.initializeCharts();
        this.initializeModals();
    }

    /** Register button events, search input, and export triggers */
    setupEventListeners() {
        // Refresh dashboard button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshAllData());

        // Live search for admin content
        const searchInput = document.getElementById('admin-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.helpers.debounce(
                (e) => this.handleSearch(e.target.value),
                300
            ));
        }

        // Export buttons for (users/profiles/reports)
        const exportBtns = document.querySelectorAll('[data-export]');
        exportBtns.forEach(btn => {
            btn.addEventListener('click', () => this.exportData(btn.dataset.export));
        });
    }

    /** Initialize Firestore real-time listeners */
    setupRealtimeListeners() {
        this.setupPendingProfilesListener();
        this.setupReportsListener();
    }

    /** Listen for incoming pending profiles in real-time */
    setupPendingProfilesListener() {
        if (!window.db) return;

        window.db.collection('profiles')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot((snapshot) => {
                this.data.pendingProfiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.renderPendingProfiles();
            });
    }

    /** Listen for unresolved reports in real-time */
    setupReportsListener() {
        if (!window.db) return;

        window.db.collection('reports')
            .where('resolved', '==', false)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot((snapshot) => {
                this.data.reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.renderReports();
            });
    }

    /** Load all dashboard sections simultaneously */
    async loadAllData() {
        try {
            const [stats, pending, users, reports] = await Promise.all([
                this.db.getStatistics(),
                this.loadPendingProfiles(),
                this.loadRecentUsers(),
                this.loadReports()
            ]);

            this.data.statistics = stats;
            this.data.pendingProfiles = pending;
            this.data.recentUsers = users;
            this.data.reports = reports;

            // Render updated sections
            this.updateDashboard();
            this.renderPendingProfiles();
            this.renderRecentUsers();
            this.renderReports();

        } catch (error) {
            console.error('Failed to load admin data:', error);
            this.helpers.showNotification('Failed to load data', 'error');
        }
    }

    /** Reload all dashboard data manually */
    async refreshAllData() {
        this.helpers.showNotification('Refreshing data...', 'info');
        await this.loadAllData();
        this.helpers.showNotification('Data refreshed', 'success');
    }

    /** Fetch pending profiles from Firestore */
    async loadPendingProfiles() {
        try {
            const snapshot = await window.db.collection('profiles')
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {
            console.error('Failed to load pending profiles:', error);
            return [];
        }
    }

    /** Fetch recent users */
    async loadRecentUsers() {
        try {
            const snapshot = await window.db.collection('users')
                .orderBy('createdAt', 'desc')
                .limit(this.options.recentLimit)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {
            console.error('Failed to load recent users:', error);
            return [];
        }
    }

    /** Fetch unresolved reports */
    async loadReports() {
        try {
            const snapshot = await window.db.collection('reports')
                .where('resolved', '==', false)
                .orderBy('createdAt', 'desc')
                .limit(this.options.reportLimit)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {
            console.error('Failed to load reports:', error);
            return [];
        }
    }

    /** Update statistics section */
    updateDashboard() {
        if (!this.data.statistics) return;

        const stats = this.data.statistics;
        const elements = {
            'total-users': stats.totalUsers,
            'total-profiles': stats.totalProfiles,
            'pending-profiles': stats.pendingProfiles,
            'vip-users': stats.vipUsers
        };

        // Inject values into the dashboard cards
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.helpers.formatNumber(value);
        });
    }

    /** Render pending profiles table */
    renderPendingProfiles() {
        const tbody = document.getElementById('pending-profiles-body');
        if (!tbody) return;

        if (this.data.pendingProfiles.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML('No pending profiles');
            return;
        }

        tbody.innerHTML = this.data.pendingProfiles
            .map(profile => this.createPendingProfileRow(profile))
            .join('');

        this.attachProfileActions();
    }

    /** Generate a table row for a pending profile */
    createPendingProfileRow(profile) {
        const platformInfo = this.helpers.getPlatformInfo(profile.platform);

        return `
            <tr data-profile-id="${profile.id}">
                <td>
                    <div class="profile-info-sm">
                        <img src="${this.helpers.optimizeImage(profile.profileImage)}" class="profile-thumb" alt="${profile.name}">
                        <span>${this.helpers.escapeHtml(profile.name)}</span>
                    </div>
                </td>
                <td>
                    <span class="platform-badge-sm" style="background-color: ${platformInfo.color}">
                        <i class="${platformInfo.icon}"></i>
                        ${platformInfo.name}
                    </span>
                </td>
                <td>${this.helpers.escapeHtml(profile.userEmail)}</td>
                <td>${this.helpers.formatDate(profile.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-success btn-sm" data-action="approve" data-profile-id="${profile.id}">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-warning btn-sm" data-action="reject" data-profile-id="${profile.id}">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn-info btn-sm" data-action="view" data-profile-id="${profile.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /** Render recent users table */
    renderRecentUsers() {
        const tbody = document.getElementById('recent-users-body');
        if (!tbody) return;

        if (this.data.recentUsers.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML('No users found');
            return;
        }

        tbody.innerHTML = this.data.recentUsers
            .map(user => this.createUserRow(user))
            .join('');

        this.attachUserActions();
    }

    /** Create a user table row */
    createUserRow(user) {
        return `
            <tr data-user-id="${user.id}">
                <td>${this.helpers.escapeHtml(user.username)}</td>
                <td>${this.helpers.escapeHtml(user.email)}</td>
                <td>
                    ${user.isVip ? '<span class="badge vip-badge">VIP</span>' : ''}
                    ${user.isAdmin ? '<span class="badge admin-badge">Admin</span>' : ''}
                </td>
                <td>${this.helpers.formatDate(user.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-info btn-sm" data-action="view-user" data-user-id="${user.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!user.isAdmin ? `
                            <button class="btn-danger btn-sm" data-action="delete-user" data-user-id="${user.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    /** Render reports table */
    renderReports() {
        const tbody = document.getElementById('reports-body');
        if (!tbody) return;

        if (this.data.reports.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML('No reports found');
            return;
        }

        tbody.innerHTML = this.data.reports
            .map(report => this.createReportRow(report))
            .join('');

        this.attachReportActions();
    }

    /** Create a report table row */
    createReportRow(report) {
        return `
            <tr data-report-id="${report.id}">
                <td>${this.helpers.escapeHtml(report.reporterEmail)}</td>
                <td>${this.helpers.escapeHtml(report.profileId)}</td>
                <td class="truncate">${this.helpers.escapeHtml(report.reason)}</td>
                <td>${this.helpers.formatDate(report.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-info btn-sm" data-action="view-report" data-report-id="${report.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-success btn-sm" data-action="resolve-report" data-report-id="${report.id}">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /** Attach click events for pending profile actions */
    attachProfileActions() {
        const tbody = document.getElementById('pending-profiles-body');
        if (!tbody) return;

        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.profileId;

            if (action === 'approve') this.approveProfile(id);
            if (action === 'reject') this.rejectProfile(id);
            if (action === 'view') this.viewProfile(id);
        });
    }

    /** Attach click events for user actions */
    attachUserActions() {
        const tbody = document.getElementById('recent-users-body');
        if (!tbody) return;

        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.userId;

            if (action === 'view-user') this.viewUser(id);
            if (action === 'delete-user') this.deleteUser(id);
        });
    }

    /** Attach click events for report actions */
    attachReportActions() {
        const tbody = document.getElementById('reports-body');
        if (!tbody) return;

        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.reportId;

            if (action === 'view-report') this.viewReport(id);
            if (action === 'resolve-report') this.resolveReport(id);
        });
    }

    /** Approve a profile with audit logging */
    async approveProfile(profileId) {
        const confirmed = await this.showConfirmation(
            'Approve Profile',
            'Are you sure you want to approve this profile?'
        );

        if (!confirmed) return;

        try {
            await window.db.collection('profiles').doc(profileId).update({
                status: 'approved',
                approvedAt: new Date(),
                approvedBy: this.currentUser.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.helpers.showNotification('Profile approved', 'success');

            // Remove from list
            this.data.pendingProfiles = this.data.pendingProfiles.filter(p => p.id !== profileId);
            this.renderPendingProfiles();

        } catch (error) {
            console.error('Profile approval failed:', error);
            this.helpers.showNotification('Failed to approve profile', 'error');
        }
    }

    /** Reject a profile with a reason */
    async rejectProfile(profileId) {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            await window.db.collection('profiles').doc(profileId).update({
                status: 'rejected',
                rejectionReason: reason,
                rejectedAt: new Date(),
                rejectedBy: this.currentUser.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.helpers.showNotification('Profile rejected', 'success');

            this.data.pendingProfiles = this.data.pendingProfiles.filter(p => p.id !== profileId);
            this.renderPendingProfiles();

        } catch (error) {
            console.error('Profile rejection failed:', error);
            this.helpers.showNotification('Failed to reject profile', 'error');
        }
    }

    /** Delete a user and all associated profiles */
    async deleteUser(userId) {
        const confirmed = await this.showConfirmation(
            'Delete User',
            'Are you sure you want to delete this user? This action cannot be undone.'
        );

        if (!confirmed) return;

        try {
            // Delete all user's profiles first
            const profiles = await this.db.getUserProfiles(userId);
            const batch = window.db.batch();

            profiles.forEach(p => {
                batch.delete(window.db.collection('profiles').doc(p.id));
            });

            await batch.commit();

            // Delete the user document
            await window.db.collection('users').doc(userId).delete();

            this.helpers.showNotification('User deleted successfully', 'success');

            this.data.recentUsers = this.data.recentUsers.filter(u => u.id !== userId);
            this.renderRecentUsers();

        } catch (error) {
            console.error('Failed to delete user:', error);
            this.helpers.showNotification('User deletion failed', 'error');
        }
    }

    /** Mark a report as resolved */
    async resolveReport(reportId) {
        try {
            await window.db.collection('reports').doc(reportId).update({
                resolved: true,
                resolvedAt: new Date(),
                resolvedBy: this.currentUser.uid
            });

            this.helpers.showNotification('Report resolved', 'success');

            this.data.reports = this.data.reports.filter(r => r.id !== reportId);
            this.renderReports();

        } catch (error) {
            console.error('Failed to resolve report:', error);
            this.helpers.showNotification('Failed to resolve report', 'error');
        }
    }

    /** Open a profile view page */
    viewProfile(profileId) {
        window.open(`/pages/profiles/profile.html?id=${profileId}`, '_blank');
    }

    /** Open a modal with user details */
    async viewUser(userId) {
        try {
            const doc = await window.db.collection('users').doc(userId).get();
            if (!doc.exists) return this.helpers.showNotification('User not found', 'error');

            this.showUserModal(doc.data());

        } catch (error) {
            console.error('Failed to view user:', error);
            this.helpers.showNotification('Failed to load user data', 'error');
        }
    }

    /** Open a modal with report details */
    async viewReport(reportId) {
        try {
            const doc = await window.db.collection('reports').doc(reportId).get();
            if (!doc.exists) return this.helpers.showNotification('Report not found', 'error');

            this.showReportModal(doc.data());

        } catch (error) {
            console.error('Failed to view report:', error);
            this.helpers.showNotification('Failed to load report', 'error');
        }
    }

    /** Placeholder for showing user details modal */
    showUserModal(user) {
        console.log('User modal:', user);
    }

    /** Placeholder for showing report details modal */
    showReportModal(report) {
        console.log('Report modal:', report);
    }

    /** Confirmation dialog wrapper */
    async showConfirmation(title, message) {
        return new Promise(resolve => resolve(confirm(`${title}

${message}`)));
    }

    /** Handle admin panel search */
    handleSearch(query) {
        console.log('Search query:', query);
    }

    /** Export data as CSV */
    async exportData(type) {
        try {
            let data, filename;

            switch (type) {
                case 'users':
                    data = this.data.recentUsers;
                    filename = 'users.csv';
                    break;
                case 'profiles':
                    data = this.data.pendingProfiles;
                    filename = 'profiles.csv';
                    break;
                case 'reports':
                    data = this.data.reports;
                    filename = 'reports.csv';
                    break;
                default:
                    throw new Error('Unsupported export type');
            }

            const csv = this.convertToCSV(data);
            this.downloadFile(csv, filename, 'text/csv');

            this.helpers.showNotification('Data exported successfully', 'success');

        } catch (error) {
            console.error('Export failed:', error);
            this.helpers.showNotification('Export failed', 'error');
        }
    }

    /** Convert an array of objects to CSV string */
    convertToCSV(data) {
        if (!data.length) return '';

        const headers = Object.keys(data[0]);
        const rows = data.map(row =>
            headers.map(h => JSON.stringify(row[h] || '')).join(',')
        );

        return [headers.join(','), ...rows].join('
');
    }

    /** Trigger CSV download */
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /** Empty state placeholder HTML */
    getEmptyStateHTML(message) {
        return `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>${message}</p>
                </td>
            </tr>
        `;
    }

    /** Handle errors specifically related to admin panel */
    handleAdminError(error) {
        console.error('Admin error:', error);

        if (error.message.includes('permission')) {
            this.helpers.showNotification('You do not have access to the admin panel', 'error');
        } else {
            this.helpers.showNotification('An error occurred in the admin panel', 'error');
        }
    }

    /** Cleanup method */
    destroy() {
        // Cleanup listeners when leaving the admin page
    }
}

// Auto-initialize admin panel on admin pages
if (window.location.pathname.includes('admin')) {
    window.adminPanel = new AdminPanel();
}

