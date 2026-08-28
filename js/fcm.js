/* Firebase Cloud Messaging helper. Requires firebase-messaging-compat.js when enabled. */
(function (window) {
    "use strict";

    async function requestNotificationToken() {
        const vapidKey = window.CONFIG?.firebase?.vapidKey;
        if (!window.firebase?.messaging || !vapidKey) return null;
        if (!("Notification" in window)) return null;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return null;

        const messaging = window.firebase.messaging();
        return messaging.getToken({ vapidKey });
    }

    async function sendNotificationFromClient() {
        throw new Error("FCM v1 sending must be done from a secure backend or Cloud Function, not client-side JavaScript.");
    }

    window.RedTootFCM = { requestNotificationToken, sendNotificationFromClient };
})(window);
