# Enterprise Roadmap

## Phase 1: Business-Ready Static Release

- Deploy with Firebase Hosting using `firebase.json`.
- Deploy Firestore and Storage rules.
- Enable Email/Password and Google sign-in.
- Configure the admin user in Firestore.
- Verify public profile submission, browsing, login, reporting, favorites, and admin moderation.

## Phase 2: Security Hardening

- Enable Firebase App Check with reCAPTCHA Enterprise.
- Restrict Firebase API key by HTTP referrer in Google Cloud.
- Add Cloud Functions for rate limiting, moderation hooks, VIP approval, and FCM v1 sending.
- Move inline page scripts into external files and remove `'unsafe-inline'` from CSP.
- Add audit logging for admin actions.

## Phase 3: Business Operations

- Add real payment provider integration for VIP plans.
- Add admin reports dashboard and export.
- Add support workflow for account removal and privacy requests.
- Add monitoring with Google Analytics, Firebase Performance, and uptime checks.
- Add automated backups for Firestore.

## Phase 4: Scale

- Add Algolia or Typesense for Arabic search and autocomplete.
- Add pagination indexes for every public/admin listing query.
- Add CDN image optimization.
- Add CI/CD with preview deployments and automated smoke tests.
