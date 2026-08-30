# RedToot Master Feature Matrix

حالة الميزة:

- `موجود`: مطبق في الملفات الحالية.
- `جزئي`: يوجد أساس الميزة وتحتاج Backend أو تحسين UI.
- `نضيفه`: غير موجود ويستحق التنفيذ.
- `لاحقاً`: مهم لكن ليس ضرورياً للإطلاق الأول.

| Feature | YallaFollowers | S2NP | RedToot | Priority | Notes |
| --- | --- | --- | --- | --- | --- |
| الصفحة الرئيسية كدليل حسابات | موجود | موجود | موجود | High | تم تحويل `index.html` لنمط Directory. |
| نشر حساب مجاني | موجود | موجود | موجود | High | `add-profile.html` يدعم نشر مباشر بدون تسجيل. |
| مراجعة قبل النشر | موجود | جزئي | غير مفعّل | Medium | RedToot حالياً ينشر `approved` حسب الطلب السابق. |
| بحث عام | موجود | موجود | موجود | High | مدعوم في `all-profiles.html`. |
| تصفح حسب المنصة | موجود | موجود | موجود | High | من `CONFIG.platforms`. |
| صفحات SEO لكل منصة | موجود | جزئي | نضيفه | High | تحتاج صفحات static/templated مثل `/platforms/instagram/`. |
| جميع الحسابات | موجود | موجود | موجود | High | `all-profiles.html`. |
| تصنيفات كثيرة | جزئي | موجود | موجود | High | أضيفت تصنيفات S2NP-style في `config.js`. |
| تصفح حسب الدولة/المدينة | جزئي | موجود | جزئي | High | روابط وفلترة محلية، الأفضل فصل country/city لاحقاً. |
| الجنس | غير واضح | موجود | موجود | Medium | حقل اختياري في النشر. |
| VIP | موجود | موجود | موجود | High | موجود كطلب يدوي. |
| Royal / ملكي | غير موجود | موجود | جزئي | High | أضيفت حقول `membershipLevel` و`royalMonthly`. |
| Featured placements | موجود | موجود | نضيفه | High | يحتاج collection `featured_slots`. |
| مشاهير | موجود | موجود | نضيفه | Medium | يحتاج `profileType: celebrity`. |
| Discord communities | موجود | غير موجود | نضيفه | Medium | يحتاج منصة Discord ونوع community. |
| Jaco | غير موجود | موجود | موجود | Medium | موجود في `CONFIG.platforms`. |
| WhatsApp | غير موجود | موجود | موجود | High | موجود. |
| Profile detail | موجود | موجود | موجود | High | `profile.html`. |
| رابط profile SEO | جيد | Legacy | جزئي | High | الحالي `profile.html?id=...`; الأفضل `/profiles/{slug}` لاحقاً. |
| Views count | جزئي | موجود | موجود | High | `views`. |
| External add/click count | غير واضح | موجود | موجود | High | `adds` و`addCount`. |
| Update/Bump | غير واضح | موجود | موجود | High | `bumpedAt` وbutton في البطاقة. |
| Most viewed | جزئي | موجود | جزئي | Medium | `getProfiles(sort: popular)` جاهز، صفحة مستقلة لاحقاً. |
| Latest | موجود | موجود | موجود | High | الصفحة الرئيسية وجميع الحسابات. |
| Similar accounts | جزئي | موجود | موجود | Medium | موجود في `profile.html`. |
| Favorites | غير واضح | غير واضح | موجود | Medium | للمستخدمين المسجلين. |
| Reports | موجود | جزئي | موجود | High | للمستخدمين المسجلين، إدارة فقط للقراءة. |
| Duplicate protection | غير واضح | موجود | نضيفه | High | يحتاج Cloud Function أو query قبل submit. |
| 3-hour submission rate limit | غير واضح | موجود | نضيفه | High | يحتاج backend/App Check. |
| Profile claim | غير واضح | غير واضح | لاحقاً | Medium | مفيد للضيوف. |
| Analytics للـVIP | مذكور | جزئي | لاحقاً | Medium | يحتاج aggregation backend. |
| Blog | موجود | موجود | نضيفه | Medium | مهم SEO. |
| FAQ لكل منصة | موجود | جزئي | نضيفه | Medium | مهم SEO. |
| Admin moderation | موجود | جزئي | موجود | High | لوحة الإدارة موجودة وتحتاج توسعة. |
| Admin audit logs | غير واضح | غير واضح | جزئي | Medium | collection موجودة، logging يحتاج تنفيذ. |
| FCM notifications | غير واضح | غير واضح | جزئي | Low | client token موجود، الإرسال يحتاج Cloud Function. |
| App Check | غير واضح | غير واضح | نضيفه | High | مطلوب قبل ترافيك حقيقي. |

## Recommended Next Build Order

1. Platform SEO pages.
2. Duplicate/rate-limit Cloud Function.
3. Featured/Royal admin controls.
4. Blog + FAQ pages.
5. Profile slug URLs.
6. Analytics aggregation.
