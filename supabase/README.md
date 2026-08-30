# RedToot Supabase Backend

This folder is an optional backend migration path. The live static app still uses Firebase.

## What This Adds

- Unified `profiles` table for people, creators, stores, communities, channels, and celebrities.
- `social_links` table so one profile can own many platform accounts.
- Discovery data: views, clicks, favorites, shares, reports, completeness, and trend score.
- VIP/Pro/Royal subscription-ready fields.
- RLS policies for public reads, safe public profile creation, owner edits, user favorites, reports, and admin-only moderation.

## Deploy Later

Run this only after creating a Supabase project and reviewing the policies:

```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
```

Admin checks use `app_metadata.role = "admin"`. Do not use user-editable metadata for admin access.

## Next App Step

Build the future add-profile UI around:

- `profiles`: one person/business/community.
- `social_links`: multiple accounts under that profile.

This is the main difference from normal account directory sites.
