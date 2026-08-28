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
