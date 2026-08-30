# Security Policy

## Production Controls

- Use Firebase Authentication for all privileged actions.
- Keep admin access controlled through `users/{uid}.isAdmin` and `role`.
- Deploy `firestore.rules`, `storage.rules`, and `firestore.indexes.json` with Firebase CLI.
- Enable Firebase App Check for Web with reCAPTCHA Enterprise before serious public traffic.
- Add Cloud Functions for rate limiting public profile submissions, report abuse handling, VIP payments, and FCM sending.
- Never place service account JSON or Admin SDK credentials in this static folder.

## Admin Account

The admin account must be created in Firebase Authentication first. Then set the matching Firestore document:

```json
{
  "isAdmin": true,
  "role": "admin",
  "status": "active"
}
```

Password reset is handled only through Firebase Console > Authentication > Users.

## Incident Response

1. Disable suspicious users in Firebase Authentication.
2. Block abusive profiles in `profiles` by setting `status: "blocked"` and `isBlocked: true`.
3. Review `reports` and `audit_logs`.
4. Rotate Firebase Web API restrictions in Google Cloud if abuse is detected.
5. Deploy stricter rules or Cloud Function moderation if public submissions are abused.
