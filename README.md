# RedToot

RedToot is an Arabic RTL social media directory. Visitors can publish a social account without registration, browse approved profiles, filter by platform, view details, favorite/report profiles when logged in, and view VIP listings.

The product direction is now broader than a username directory: RedToot is an Arabic social discovery platform for people, creators, businesses, stores, communities, channels, and social accounts across multiple platforms.

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
- `FEATURE_MATRIX.md`: comparison-driven product backlog against similar directory sites.
- `PRODUCT_ARCHITECTURE.md`: target architecture for SEO routes, ranking, and multi-platform profiles.
- `platforms/*/index.html`: lightweight SEO landing pages for major platforms.
- `trending.html`, `latest.html`, `most-viewed.html`, `featured.html`, `verified.html`, `celebrities.html`: discovery entry pages backed by `all-profiles.html` filters.
- `supabase/schema.sql`: optional future PostgreSQL/Supabase backend for unified profiles and multi-platform social links.

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

- `id`, `hexId`, `platform`, `name`, `username`, `profileLink`, `status`
- `createdAt`, `updatedAt`
- `isVip`, `isRoyal`, `vipExpiry`, `membershipLevel`, `membershipPriority`
- `profileType`, `verified`, `isFeatured`, `featuredUntil`
- `category`, `location`, `ageRange`, `gender`, `hobbies`, `description`
- `ownerId`, `userId`, `userEmail`, `submittedBy`
- `views`, `adds`, `addCount`, `clicksCount`, `likes`, `shares`, `shareCount`, `reports`, `reportCount`, `favoriteCount`
- `redtootScore`, `completenessScore`
- `bumpedAt` for update/bump ranking.

Guest profile submissions receive `hexId`, an 8-character public hexadecimal reference number. Users can search it from `lookup.html`.

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

User documents include `redtootPin`, an 8-character public hexadecimal identifier such as `A1B2C3D4`. It is generated with browser crypto and collision-checked in Firestore. Do not use it for authorization; Firebase Auth UID remains the security identity.

## Deployment

GitHub Pages production:

- Production URL: `https://redtoot1989.github.io/index.html`
- Source branch: `main1`
- Upload/copy the contents of this folder to the GitHub Pages root on `main1`.
- Firestore rules and indexes are not deployed by GitHub Pages; deploy them from Firebase Console or Firebase CLI.

Firebase Hosting:

```bash
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

GitHub Pages:

Upload the contents of this folder to the Pages branch/root. Firestore rules still must be deployed separately with Firebase.

Enterprise Firebase CLI deployment from this folder:

```bash
firebase use production
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only hosting
```

## Security Notes

- Client Firebase config is public by design; never expose service account keys or Admin SDK credentials in this folder.
- The business/enterprise config files are `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, `SECURITY.md`, and `ENTERPRISE_ROADMAP.md`.
- FCM v1 sending must happen in a trusted backend or Cloud Function. `js/fcm.js` includes a client-side placeholder that deliberately throws if used for sending.
- reCAPTCHA or abuse checks for public profile submission must be verified by a backend or Cloud Function. A client-only token check is not secure.
- Public direct publishing is convenient but higher risk. Use reports, admin blocking, and rate limiting where possible. For production hardening, add App Check and a Cloud Function moderation layer.

## Manual Test Checklist

- Open `index.html`; header/footer render and profile sections load.
- Open `trending.html`, `verified.html`, `celebrities.html`, and `most-viewed.html`; each should route to filtered discovery.
- Submit `add-profile.html` with only platform and username.
- Browse `all-profiles.html`, search, and filter by platform.
- Open a profile details page from a card.
- Register, verify password length, login with remember me, logout.
- Trigger password reset from `forgot-password.html`.
- As a logged-in user, favorite and report a profile.
- As admin, open `admin.html`, verify stats, block/unblock/delete a profile.
- Visit `vip.html`; create a pending VIP request as a logged-in user.
- Use the update/bump button on a profile card and confirm it rises by `bumpedAt`.
- Load once, go offline, and revisit a cached page.

## Known Backend Placeholders

- VIP payment approval is a placeholder and should be connected to payment/webhook logic.
- Admin FCM sending requires a secure Cloud Function.
- Guest profile claiming can be added later by generating and storing a claim code at submission time.
- Duplicate protection and 3-hour submission limits should be enforced with App Check and Cloud Functions.
