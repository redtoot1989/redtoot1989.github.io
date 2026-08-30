# RedToot Product Architecture

RedToot should combine:

- YallaFollowers style: clean platform directories, SEO text, FAQ, blog, celebrities, clean URLs.
- S2NP style: dense discovery, countries/cities, many categories, VIP/Royal ranking, views, adds, bump/update.

## Current Static Routes

```text
/
index.html
all-profiles.html
add-profile.html
profile.html?id={profileId}
platforms.html
vip.html
login.html
register.html
forgot-password.html
admin.html
about.html
faq.html
contact.html
privacy.html
terms.html
offline.html
```

## Target Routes

For GitHub Pages, use folders with `index.html` when clean URLs are needed:

```text
/
platforms/
  instagram/
  snapchat/
  tiktok/
  youtube/
  x/
  whatsapp/
  telegram/
  jaco/
  discord/
  threads/
  linkedin/
  twitch/
categories/
  tech/
  entertainment/
  chat/
locations/
  saudi-arabia/
  saudi-arabia/riyadh/
profiles/
  {slug}/
celebrities/
featured/
trending/
most-viewed/
latest/
verified/
blog/
```

## Data Model Direction

Current RedToot uses one profile per platform account:

```text
profiles
  id
  platform
  username
  profileLink
  category
  location
  gender
```

Future enterprise model should support one person/entity with many platforms:

```text
profiles
  id
  ownerId
  displayName
  slug
  description
  profileType: person | celebrity | creator | business | store | community | gamer | podcast | channel | bot
  categoryIds[]
  country
  city
  gender
  status
  membershipLevel: normal | vip | royal
  membershipPriority
  views
  addCount
  favoriteCount
  shareCount
  clicksCount
  redtootScore
  completenessScore
  verified
  isFeatured
  reportCount
  createdAt
  updatedAt
  bumpedAt

profile_platforms
  id
  profileId
  platformId
  username
  profileUrl
  followersCount
  isPrimary
  isVerified
```

## Ranking

Recommended default listing:

```text
ORDER BY membershipPriority DESC
ORDER BY bumpedAt DESC
```

Additional sections:

```text
Royal
VIP
Verified
Featured
Trending by RedToot Score
Latest
Most Viewed
Most Added
Celebrities
Similar Accounts
```

## Backend Required

These features should not be client-only:

- Duplicate detection.
- 3-hour submission rate limit.
- reCAPTCHA/App Check verification.
- VIP/Royal payment approval.
- FCM sending.
- Analytics aggregation.
- Audit logging.
