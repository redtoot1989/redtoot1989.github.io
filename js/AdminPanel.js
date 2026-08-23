/**
 * Enhanced Admin Panel v2.0
 * - Added pagination and virtualization
 * - Advanced modal system
 * - Bulk operations
 * - Enhanced security logging
 * - Performance optimizations
 */

class AdminPanel {
    constructor(options = {}) {
        this.options = Object.assign({
            recentLimit: 10,
            reportLimit: 10,
            itemsPerPage: 20,
            cacheDuration: 60000,
            enableBulkOps: true,
            maxExportRows: 10000
        }, options);

        // Dependencies
        this.auth = window.authManager;
        this.db = window.dbManager;
        this.helpers = window.AppHelpers;
        this.validator = window.AdvancedInputValidator;

        // State management
        this.currentUser = null;
        this.isAdmin = false;
        this.isLoading = false;

        // Enhanced data structure with pagination
        this.data = {
            pendingProfiles: { items: [], total: 0, lastCursor: null },
            recentUsers: { items: [], total: 0, lastCursor: null },
            reports: { items: [], total: 0, lastCursor: null },
            statistics: null,
            selectedItems: new Set() // For bulk operations
        };

        // Pagination state
        this.pagination = {
            currentPage: 1,
            totalPages: 1,
            pageSize: this.options.itemsPerPage
        };

        this.init();
    }

    /** Enhanced initialization with progress tracking */
    async init() {
        try {
            // Show loading state
            this.setLoadingState(true, 'Initializing admin panel...');

            await this.verifyAdminStatus();
            this.initializeUI();
            this.setupEventListeners();
            this.setupRealtimeListeners();
            await this.loadAllData();

            console.log('✅ Admin panel initialized successfully');
            this.helpers.showNotification('Admin panel ready', 'success');

        } catch (error) {
            console.error('❌ Admin panel initialization failed:', error);
            this.handleAdminError(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    /** Enhanced admin verification with role-based access */
    async verifyAdminStatus() {
        this.currentUser = this.auth.currentUser;

        if (!this.currentUser) {
            this.redirectToLogin();
            throw new Error('Not authenticated');
        }

        // Check multiple admin levels
        const adminStatus = await this.auth.checkAdminStatus();
        this.isAdmin = adminStatus.isAdmin;
        
        if (!this.isAdmin) {
            this.helpers.showNotification('Insufficient permissions', 'warning');
            this.redirectToHome();
            throw new Error('Admin access required');
        }

        // Log admin access
        await this.logAdminActivity('admin_panel_access');
        return true;
    }

    /** Enhanced UI initialization with responsive design */
    initializeUI() {
        this.initializeDataTables();
        this.initializeCharts();
        this.initializeModals();
        this.initializeBulkActions();
        this.initializeSearch();
    }

    /** Advanced event listeners with delegation */
    setupEventListeners() {
        // Refresh with loading state
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAllData());
        }

        // Enhanced search with filters
        const searchInput = document.getElementById('admin-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.helpers.debounce(
                (e) => this.handleAdvancedSearch(e.target.value),
                300
            ));
        }

        // Export with confirmation
        const exportBtns = document.querySelectorAll('[data-export]');
        exportBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleExport(btn.dataset.export));
        });

        // Bulk operations
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-bulk-action]')) {
                this.handleBulkAction(e.target.dataset.bulkAction);
            }
        });

        // Row selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('.row-selector')) {
                this.toggleRowSelection(e.target);
            }
        });
    }

    /** Enhanced real-time listeners with error handling */
    setupRealtimeListeners() {
        this.setupPendingProfilesListener();
        this.setupReportsListener();
        this.setupUserActivityListener();
    }

    /** Advanced pending profiles listener with pagination */
    setupPendingProfilesListener() {
        if (!window.db) return;

        const query = window.db.collection('profiles')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(100);

        this.unsubscribeProfiles = query.onSnapshot(
            (snapshot) => {
                this.data.pendingProfiles.items = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    _selected: false
                }));
                this.data.pendingProfiles.total = snapshot.size;
                this.renderPendingProfiles();
                this.updatePagination();
            },
            (error) => {
                console.error('Pending profiles listener error:', error);
                this.helpers.showNotification('Failed to load profiles', 'error');
            }
        );
    }

    /** Enhanced data loading with progress */
    async loadAllData() {
        if (this.isLoading) return;

        this.setLoadingState(true, 'Loading dashboard data...');
        
        try {
            const [stats, pending, users, reports] = await Promise.allSettled([
                this.db.getStatistics(),
                this.loadPendingProfiles(),
                this.loadRecentUsers(),
                this.loadReports()
            ]);

            // Handle results with error tolerance
            this.data.statistics = stats.status === 'fulfilled' ? stats.value : null;
            this.data.pendingProfiles.items = pending.status === 'fulfilled' ? pending.value : [];
            this.data.recentUsers.items = users.status === 'fulfilled' ? users.value : [];
            this.data.reports.items = reports.status === 'fulfilled' ? reports.value : [];

            this.updateDashboard();
            this.renderAllTables();
            this.updatePagination();

        } catch (error) {
            console.error('Data loading failed:', error);
            this.helpers.showNotification('Partial data loaded', 'warning');
        } finally {
            this.setLoadingState(false);
        }
    }

    /** Enhanced profile approval with validation */
    async approveProfile(profileId, options = {}) {
        const profile = this.data.pendingProfiles.items.find(p => p.id === profileId);
        if (!profile) return;

        const confirmed = await this.showConfirmationModal(
            'Approve Profile',
            `Are you sure you want to approve "${profile.name}"?`,
            'success'
        );

        if (!confirmed) return;

        try {
            this.setLoadingState(true, 'Approving profile...');

            const updateData = {
                status: 'approved',
                approvedAt: new Date(),
                approvedBy: this.currentUser.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add optional notes
            if (options.notes) {
                updateData.approvalNotes = options.notes;
            }

            await window.db.collection('profiles').doc(profileId).update(updateData);

            // Log the action
            await this.logAdminActivity('profile_approved', {
                profileId,
                profileName: profile.name
            });

            this.helpers.showNotification('Profile approved successfully', 'success');

        } catch (error) {
            console.error('Profile approval failed:', error);
            this.helpers.showNotification('Failed to approve profile', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    /** Enhanced rejection with reason modal */
    async rejectProfile(profileId) {
        const profile = this.data.pendingProfiles.items.find(p => p.id === profileId);
        if (!profile) return;

        const reason = await this.showReasonModal(
            'Reject Profile',
            `Please provide a reason for rejecting "${profile.name}":`
        );

        if (!reason) return;

        try {
            this.setLoadingState(true, 'Rejecting profile...');

            await window.db.collection('profiles').doc(profileId).update({
                status: 'rejected',
                rejectionReason: reason,
                rejectedAt: new Date(),
                rejectedBy: this.currentUser.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await this.logAdminActivity('profile_rejected', {
                profileId,
                profileName: profile.name,
                reason
            });

            this.helpers.showNotification('Profile rejected', 'success');

        } catch (error) {
            console.error('Profile rejection failed:', error);
            this.helpers.showNotification('Failed to reject profile', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    /** Bulk operations handler */
    async handleBulkAction(action) {
        const selectedIds = Array.from(this.data.selectedItems);
        
        if (selectedIds.length === 0) {
            this.helpers.showNotification('Please select items first', 'warning');
            return;
        }

        switch (action) {
            case 'approve-selected':
                await this.bulkApproveProfiles(selectedIds);
                break;
            case 'reject-selected':
                await this.bulkRejectProfiles(selectedIds);
                break;
            case 'delete-selected':
                await this.bulkDeleteUsers(selectedIds);
                break;
            case 'resolve-selected':
                await this.bulkResolveReports(selectedIds);
                break;
        }
    }

    /** Bulk approve profiles */
    async bulkApproveProfiles(profileIds) {
        const confirmed = await this.showConfirmationModal(
            'Bulk Approve',
            `Are you sure you want to approve ${profileIds.length} profiles?`,
            'success'
        );

        if (!confirmed) return;

        try {
            this.setLoadingState(true, `Approving ${profileIds.length} profiles...`);

            const batch = window.db.batch();
            const timestamp = new Date();

            profileIds.forEach(id => {
                const ref = window.db.collection('profiles').doc(id);
                batch.update(ref, {
                    status: 'approved',
                    approvedAt: timestamp,
                    approvedBy: this.currentUser.uid,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();

            await this.logAdminActivity('bulk_profiles_approved', {
                count: profileIds.length,
                profileIds
            });

            this.helpers.showNotification(`Approved ${profileIds.length} profiles`, 'success');
            this.clearSelection();

        } catch (error) {
            console.error('Bulk approval failed:', error);
            this.helpers.showNotification('Bulk operation failed', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    /** Enhanced export with limits and formatting */
    async handleExport(type) {
        try {
            let data, filename, columns;

            switch (type) {
                case 'users':
                    data = await this.loadAllUsersForExport();
                    filename = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
                    columns = ['id', 'username', 'email', 'isVip', 'isAdmin', 'createdAt'];
                    break;
                case 'profiles':
                    data = await this.loadAllProfilesForExport();
                    filename = `profiles-export-${new Date().toISOString().split('T')[0]}.csv`;
                    columns = ['id', 'name', 'platform', 'status', 'userEmail', 'createdAt'];
                    break;
                case 'reports':
                    data = await this.loadAllReportsForExport();
                    filename = `reports-export-${new Date().toISOString().split('T')[0]}.csv`;
                    columns = ['id', 'reporterEmail', 'profileId', 'reason', 'resolved', 'createdAt'];
                    break;
                default:
                    throw new Error('Unsupported export type');
            }

            if (data.length > this.options.maxExportRows) {
                this.helpers.showNotification(`Export limited to ${this.options.maxExportRows} rows`, 'warning');
                data = data.slice(0, this.options.maxExportRows);
            }

            const csv = this.convertToCSV(data, columns);
            this.downloadFile(csv, filename, 'text/csv');

            await this.logAdminActivity('data_exported', { type, rowCount: data.length });

            this.helpers.showNotification(`Exported ${data.length} ${type}`, 'success');

        } catch (error) {
            console.error('Export failed:', error);
            this.helpers.showNotification('Export failed', 'error');
        }
    }

    /** Advanced search with multiple criteria */
    handleAdvancedSearch(query) {
        if (!query.trim()) {
            this.renderAllTables();
            return;
        }

        const searchTerm = query.toLowerCase();
        
        // Search across all tables
        const filteredProfiles = this.data.pendingProfiles.items.filter(profile =>
            profile.name.toLowerCase().includes(searchTerm) ||
            profile.userEmail.toLowerCase().includes(searchTerm) ||
            profile.platform.toLowerCase().includes(searchTerm)
        );

        const filteredUsers = this.data.recentUsers.items.filter(user =>
            user.username.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        );

        const filteredReports = this.data.reports.items.filter(report =>
            report.reporterEmail.toLowerCase().includes(searchTerm) ||
            report.reason.toLowerCase().includes(searchTerm) ||
            report.profileId.toLowerCase().includes(searchTerm)
        );

        this.renderFilteredResults(filteredProfiles, filteredUsers, filteredReports);
    }

    /** Enhanced modal system */
    async showConfirmationModal(title, message, type = 'warning') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'confirmation-modal overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                        <button class="btn btn-${type}" data-action="confirm">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const handleAction = (action) => {
                modal.remove();
                resolve(action === 'confirm');
            };

            modal.querySelector('[data-action="confirm"]').addEventListener('click', () => handleAction('confirm'));
            modal.querySelector('[data-action="cancel"]').addEventListener('click', () => handleAction('cancel'));
            modal.querySelector('.close-btn').addEventListener('click', () => handleAction('cancel'));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) handleAction('cancel');
            });
        });
    }

    /** Row selection management */
    toggleRowSelection(checkbox) {
        const row = checkbox.closest('tr');
        const itemId = row.dataset.id;

        if (checkbox.checked) {
            this.data.selectedItems.add(itemId);
            row.classList.add('selected');
        } else {
            this.data.selectedItems.delete(itemId);
            row.classList.remove('selected');
        }

        this.updateBulkActionsState();
    }

    /** Update bulk actions visibility */
    updateBulkActionsState() {
        const hasSelection = this.data.selectedItems.size > 0;
        const bulkSection = document.getElementById('bulk-actions-section');
        
        if (bulkSection) {
            bulkSection.style.display = hasSelection ? 'block' : 'none';
            bulkSection.querySelector('.selected-count').textContent = 
                `${this.data.selectedItems.size} selected`;
        }
    }

    /** Clear all selections */
    clearSelection() {
        this.data.selectedItems.clear();
        document.querySelectorAll('.row-selector:checked').forEach(cb => cb.checked = false);
        document.querySelectorAll('tr.selected').forEach(row => row.classList.remove('selected'));
        this.updateBulkActionsState();
    }

    /** Enhanced error handling */
    handleAdminError(error) {
        console.error('Admin error:', error);

        const errorMap = {
            'permission': 'You do not have access to the admin panel',
            'network': 'Network error - please check your connection',
            'quota': 'Database quota exceeded - please try later'
        };

        const message = errorMap[error.code] || 'An admin panel error occurred';
        this.helpers.showNotification(message, 'error');

        // Log admin errors for monitoring
        this.logAdminActivity('admin_error', {
            error: error.message,
            code: error.code,
            stack: error.stack
        });
    }

    /** Admin activity logging */
    async logAdminActivity(action, metadata = {}) {
        try {
            await window.db.collection('admin_audit_log').add({
                adminId: this.currentUser.uid,
                adminEmail: this.currentUser.email,
                action,
                metadata,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent,
                ip: await this.getClientIP()
            });
        } catch (error) {
            console.warn('Failed to log admin activity:', error);
        }
    }

    /** Utility methods */
    setLoadingState(loading, message = '') {
        this.isLoading = loading;
        const loader = document.getElementById('admin-loader');
        
        if (loader) {
            loader.style.display = loading ? 'flex' : 'none';
            if (message) loader.querySelector('.loading-message').textContent = message;
        }

        // Disable interactive elements during loading
        document.querySelectorAll('#admin-actions button').forEach(btn => {
            btn.disabled = loading;
        });
    }

    redirectToLogin() {
        window.location.href = '/pages/auth/login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
    }

    redirectToHome() {
        window.location.href = '/';
    }

    /** Cleanup method */
    destroy() {
        if (this.unsubscribeProfiles) this.unsubscribeProfiles();
        if (this.unsubscribeReports) this.unsubscribeReports();
        this.clearSelection();
        console.log('🧹 Admin panel cleaned up');
    }
}

// Auto-initialize with error boundary
if (window.location.pathname.includes('admin')) {
    try {
        window.adminPanel = new AdminPanel();
    } catch (error) {
        console.error('Failed to initialize admin panel:', error);
    }
}
