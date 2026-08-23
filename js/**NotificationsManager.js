// NotificationsManager.js
export class NotificationsManager {
    constructor({ db, authManager, helpers }) {
        this.db = db;
        this.authManager = authManager;
        this.helpers = helpers;

        // State
        this.notifications = [];
        this.unsubscribe = null;

        // DOM
        this.container = document.getElementById('notifications-container');
        this.unreadCountEl = document.getElementById('notifications-count');

        this.init();
    }

    // ----------------------------
    // INIT
    // ----------------------------
    init() {
        if (!this.container) {
            console.warn('[NotificationsManager] No notifications container found.');
            return;
        }

        this.setupAuthListener();
    }

    setupAuthListener() {
        window.addEventListener('authStateChanged', (e) => {
            const { user } = e.detail;
            user ? this.startListening(user.uid) : this.reset();
        });
    }

    // ----------------------------
    // LISTENING
    // ----------------------------
    startListening(userId) {
        if (!this.db) return;

        // Clean previous listeners
        this.stopListening();

        console.log('[NotificationsManager] Listening for notifications…');

        this.unsubscribe = this.db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot(
                (snapshot) => this.handleSnapshot(snapshot),
                (err) => console.error('Notification listener error:', err)
            );
    }

    handleSnapshot(snapshot) {
        let hasNew = false;
        const newItems = [];

        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                newItems.push({ id: change.doc.id, ...change.doc.data() });
                hasNew = true;
            }
            if (change.type === 'modified') {
                this.updateLocalNotification(change.doc.id, change.doc.data());
            }
        });

        if (newItems.length > 0) {
            // Avoid duplicates
            const ids = new Set(this.notifications.map(n => n.id));
            const filtered = newItems.filter(n => !ids.has(n.id));

            this.notifications = [...filtered, ...this.notifications];
        }

        if (hasNew) {
            this.renderNotifications();
            this.updateUnreadCount();
        }
    }

    stopListening() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    reset() {
        this.stopListening();
        this.clearNotifications();
    }

    // ----------------------------
    // RENDER
    // ----------------------------
    renderNotifications() {
        if (!this.container) return;

        // Faster to use DocumentFragment
        const frag = document.createDocumentFragment();

        this.notifications.forEach(notification => {
            frag.appendChild(this.createNotificationElement(notification));
        });

        this.container.innerHTML = '';
        this.container.appendChild(frag);
    }

    createNotificationElement(notification) {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        item.dataset.id = notification.id;

        const createdAt = notification.createdAt?.toDate?.()
            ? notification.createdAt.toDate().toLocaleString()
            : '';

        item.innerHTML = `
            <div class="notification-content">${this.escapeHTML(notification.message)}</div>
            <div class="notification-time">${createdAt}</div>
        `;

        item.addEventListener('click', () => this.markAsRead(notification.id));

        return item;
    }

    // Prevent XSS from Firestore text
    escapeHTML(str) {
        return str
            ?.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;") || "";
    }

    // ----------------------------
    // UNREAD COUNT
    // ----------------------------
    updateUnreadCount() {
        if (!this.unreadCountEl) return;

        const unread = this.getUnreadCount();
        this.unreadCountEl.textContent = unread > 0 ? unread : '';
    }

    // ----------------------------
    // MARK AS READ
    // ----------------------------
    async markAsRead(notificationId) {
        const notif = this.notifications.find(n => n.id === notificationId);
        if (!notif || notif.read) return;

        try {
            notif.read = true;
            this.renderNotifications();
            this.updateUnreadCount();

            await this.db.collection('notifications')
                .doc(notificationId)
                .update({ read: true });

        } catch (err) {
            console.error('Failed to mark notification as read:', err);
            // revert UI if failed
            notif.read = false;
            this.renderNotifications();
            this.updateUnreadCount();
        }
    }

    updateLocalNotification(id, data) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications[index] = { ...this.notifications[index], ...data };
        }
    }

    // ----------------------------
    // CLEAR
    // ----------------------------
    clearNotifications() {
        this.notifications = [];
        if (this.container) this.container.innerHTML = '';
        if (this.unreadCountEl) this.unreadCountEl.textContent = '';
    }

    // ----------------------------
    // PUBLIC API
    // ----------------------------
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    destroy() {
        this.reset();
    }
}

