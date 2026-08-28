# RedToot

RedToot is an Arabic RTL social media directory. Visitors can publish a social account without registration, browse approved profiles, filter by platform, view details, favorite/report profiles when logged in, and view VIP listings.

## Folder Structure

- `*.html`: static pages and shared public flows.
- `css/style.css`: global RTL styles, layout, cards, forms, admin, and utility states.
- `js/config.js`: single source of truth for Firebase, collections, platforms, categories, roles, statuses, VIP plans, and limits.
- `js/firebase-config.js`: Firebase compat initialization.
- `js/database.js`: Firestore data model and CRUD helpers.
- `js/main.js`: shared UI controller, platform grid, profile cards, favorites/reports, back-to-top.
- `js/AuthManager.js` and `js/auth.js`: auth state, login/logout, account helpers.
- `js/AdminPanel.js`: protected admin profile management.
- `js/fcm.js`: FCM token helper and backend-send placeholder.
- `sw.js`, `manifest.json`, `offline.html`: PWA/offline support.
- `Firestore Rules.txt`: deployable Firestore security rules.
- `firestore.indexes.json`: suggested composite indexes.

## Firebase Setup

1. Enable Firebase Authentication with Email/Password and optional Google provider.
2. Enable Firestore.
3. Use the Firebase web app config in `js/config.js`.
4. Deploy `Firestore Rules.txt` to Firestore rules.
5. Deploy `firestore.indexes.json` with Firebase CLI if prompted by query errors.
6. For FCM, add `firebase-messaging-compat.js` on pages that request notifications and save tokens to the user document.

## Public Submission Flow

The add-profile form is intentionally short:

- Required: platform, username.
- Optional: display name, profile link.
- If the link is empty, `js/database.js` builds one from the platform base URL.
- Profiles are created as `status: "approved"` immediately.
- Guest submissions store `submittedBy: "guest"` and `ownerId: null`.

Because profiles publish immediately, keep Firestore rules deployed and monitor reports/admin dashboard.

## Data Model

Profiles include:

- `id`, `platform`, `name`, `username`, `profileLink`, `status`
- `createdAt`, `updatedAt`
- `isVip`, `vipExpiry`
- `category`, `location`, `ageRange`, `gender`, `hobbies`, `description`
- `ownerId`, `userId`, `userEmail`, `submittedBy`
- `views`, `likes`, `shares`, `reports`, `reportCount`, `favoriteCount`

Other collections:

- `users`
- `favorites`
- `reports`
- `vip_subscriptions`
- `notifications`
- `categories`
- `platforms`
- `settings`
- `site_statistics`
- `audit_logs`

## Deployment

Firebase Hosting:

```bash
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

GitHub Pages:

Upload the contents of this folder to the Pages branch/root. Firestore rules still must be deployed separately with Firebase.

## Security Notes

- Client Firebase config is public by design; never expose service account keys or Admin SDK credentials in this folder.
- FCM v1 sending must happen in a trusted backend or Cloud Function. `js/fcm.js` includes a client-side placeholder that deliberately throws if used for sending.
- reCAPTCHA or abuse checks for public profile submission must be verified by a backend or Cloud Function. A client-only token check is not secure.
- Public direct publishing is convenient but higher risk. Use reports, admin blocking, and rate limiting where possible. For production hardening, add App Check and a Cloud Function moderation layer.

## Manual Test Checklist

- Open `index.html`; header/footer render and profile sections load.
- Submit `add-profile.html` with only platform and username.
- Browse `all-profiles.html`, search, and filter by platform.
- Open a profile details page from a card.
- Register, verify password length, login with remember me, logout.
- Trigger password reset from `forgot-password.html`.
- As a logged-in user, favorite and report a profile.
- As admin, open `admin.html`, verify stats, block/unblock/delete a profile.
- Visit `vip.html`; create a pending VIP request as a logged-in user.
- Load once, go offline, and revisit a cached page.

## Known Backend Placeholders

- VIP payment approval is a placeholder and should be connected to payment/webhook logic.
- Admin FCM sending requires a secure Cloud Function.
- Guest profile claiming can be added later by generating and storing a claim code at submission time.
