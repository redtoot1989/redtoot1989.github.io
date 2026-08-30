# Changelog

## 2026-08-23

- Cleaned the deployable project structure.
- Centralized constants in `js/config.js`.
- Added a shared profile card renderer and common UI behavior in `js/main.js`.
- Shortened public profile submission to platform and username, with optional display name and link.
- Direct public submissions now create approved profiles immediately.
- Expanded profile data defaults to include owner, VIP, category, location, age range, report and favorite counts.
- Added favorites, reports, profile lookup, and VIP subscription placeholder methods.
- Rewrote Firestore rules for public approved profile creation, public approved reads, user-owned updates, favorites, reports, VIP, notifications, and admin-only collections.
- Added support pages: privacy, terms, contact, about, FAQ, forgot password, and offline fallback.
- Added PWA files: `manifest.json`, `robots.txt`, `sitemap.xml`, and improved `sw.js`.
- Improved RTL UI, focus states, tap targets, back-to-top button, legal pages, and profile card styles.
- Added Firestore composite index suggestions.

## 2026-08-28

- Added Firebase Hosting enterprise config with security headers and cache policy.
- Added `.firebaserc`, `firestore.rules`, and `storage.rules` for Firebase CLI deployment.
- Added `.env.example` for runtime config override documentation.
- Added `SECURITY.md` and `ENTERPRISE_ROADMAP.md`.
- Documented GitHub Pages production URL and `main1` branch workflow.
- Reworked homepage toward an Arabic social directory model with search, platform/category/country browsing, compact account cards, add counters, bump ranking, and VIP/Royal-ready membership fields.
- Added Social Discovery direction: profile types, verified/featured fields, RedToot Score, completeness score, share/click counters, and discovery pages for trending/latest/most-viewed/featured/verified/celebrities.
- Added platform support for Threads, LinkedIn, and Twitch in the central config and public submission form.
- Updated Firestore rules and indexes for new public-safe fields and discovery queries.
- Added optional Supabase schema and backend notes for the future unified-profile architecture.
- Fixed quick review items: centralized `VIP_PLANS`, added Firestore rules for VIP plans, removed conflicting homepage CSP meta tag, hardened external profile links, improved password reset feedback, added observer cleanup, and expanded PWA manifest/service-worker coverage.
- Added RedToot PIN support: every signed-in user receives a unique 8-character hexadecimal public ID stored as `redtootPin`.
- Added guest profile `hexId` support, WhatsApp number normalization, Arabic-character stripping for usernames, and `lookup.html` search by profile ID.
