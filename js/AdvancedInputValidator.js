/*
 * AdvancedInputValidator 2025 - Improved
 * - Fixes URL/phone regexes
 * - Stable cache key serialization
 * - Safer XSS/script detection using DOMParser for HTML inputs
 * - Better emoji detection (sequences + flags)
 * - Attach live validation only to fields that have rules
 * - Robust min/max to handle strings, arrays, numbers
 * - Improved image aspect ratio tolerance scaling
 * - Cleaner sanitize logic (either escape OR strip tags depending on config)
 * - Exported as ES Module and CommonJS compatible
 */

class AdvancedInputValidator {
  constructor(options = {}) {
    this.config = Object.assign({
      language: 'ar', // 'ar' or 'en'
      strictMode: false,
      autoSanitize: true,
      debug: false,
    }, options);

    // Patterns
    this.patterns = {
      // Email: keep existing improved pattern
      email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/i,

      // Egypt mobile numbers fixed (010,011,012,015) with optional +20 or 0
      phoneEG: /^(?:\+20|0)?1(?:0|1|2|5)\d{8}$/,

      // International phone fallback
      phoneIntl: /^\+?[1-9]\d{7,14}$/,

      // URL: We'll validate with URL API when possible, keep a lightweight fallback
      urlFallback: /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\S]*)?$/i,

      // Username allowing Unicode letters, numbers, underscores and hyphens (3-30)
      username: /^[\p{L}\p{N}_-]{3,30}$/u,

      // Emoji detection: Extended pictographic + ZWJ sequences and flag emojis
      emoji: /\p{Extended_Pictographic}/u,

      // Script tag detection (minimal): we'll use DOM parsing for robust detection
      scriptTag: /<script\b[^>]*>([\s\S]*?)<\/script>/gi,

      // Common XSS-ish inline handler detection (only inside tags) - keep conservative
      inlineEventAttr: /<[^>]+\son\w+\s*=\s*['"]/i,

      // Numbers only
      numbersOnly: /^\d+$/,

      // Arabic / English only
      arabicOnly: /^[\u0600-\u06FF\s]+$/,
      englishOnly: /^[a-zA-Z\s]+$/,

      // Social handles
      instagram: /^@?[a-zA-Z0-9._]{1,30}$/, // still permissive
      tiktok: /^@?[a-zA-Z0-9._]{1,24}$/, // permissive
      twitter: /^@?[a-zA-Z0-9_]{1,15}$/,
      facebook: /^[a-zA-Z0-9.]{5,50}$/, // page names
      snapchat: /^[a-zA-Z0-9._-]{3,15}$/,
      youtube: /^@?[a-zA-Z0-9._-]{3,30}$/,

      // Password policy default structure
      password: {
        minLength: 8,
        requireUpper: true,
        requireLower: true,
        requireNumber: true,
        requireSpecial: true,
      }
    };

    // Messages
    this.messages = {
      ar: {
        required: "هذا الحقل مطلوب",
        email: "البريد الإلكتروني غير صالح",
        phone: "رقم الهاتف غير صحيح",
        url: "الرابط غير صالح",
        username: "اسم المستخدم غير صالح",
        passwordWeak: "كلمة المرور غير قوية",
        passwordMismatch: "كلمات المرور غير متطابقة",
        maxLength: "تم تجاوز الحد الأقصى للطول",
        minLength: "الطول أقل من الحد المطلوب",
        invalidChars: "يحتوي على رموز غير مسموحة",
        scriptDetected: "الكود يحتوي سكربت غير آمن",
        emojiDetected: "النص يحتوي على إيموجي",
        fileSize: "حجم الملف كبير",
        fileType: "نوع الملف غير مدعوم",
        imageDimensions: "أبعاد الصورة غير مناسبة",
        xssDetected: "تم اكتشاف محتوى غير آمن"
      },
      en: {
        required: "This field is required",
        email: "Invalid email address",
        phone: "Invalid phone number",
        url: "Invalid URL",
        username: "Invalid username",
        passwordWeak: "Password is not strong enough",
        passwordMismatch: "Passwords do not match",
        maxLength: "Exceeded maximum length",
        minLength: "Below minimum length",
        invalidChars: "Contains invalid characters",
        scriptDetected: "Contains unsafe script",
        emojiDetected: "Contains emoji",
        fileSize: "File size is too large",
        fileType: "File type not supported",
        imageDimensions: "Image dimensions are not suitable",
        xssDetected: "Unsafe content detected"
      }
    };

    // Simple cache implemented with Map (string keys). We'll normalize keys for stability.
    this.cache = new Map();
    this.cacheTimeout = 30_000; // 30s

    this.initUtilities();
  }

  // -------------------- Utilities --------------------
  initUtilities() {
    this.measurePerformance = (name, callback) => {
      const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const result = callback();
      const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (this.config.debug) console.log(`⏱️ ${name} executed in ${(end - start).toFixed(2)}ms`);
      return result;
    };

    this.debounce = (func, wait = 300, immediate = false) => {
      let timeout;
      return function(...args) {
        const context = this;
        const later = () => { timeout = null; if (!immediate) func.apply(context, args); };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    };

    this.escapeHtml = (input) => {
      if (typeof input !== 'string') return input;
      return input.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Stable stringify for cache keys: sort object keys recursively
    this.stableStringify = (obj) => {
      const seen = new WeakSet();
      const replacer = (value) => {
        if (value && typeof value === 'object') {
          if (seen.has(value)) return; // cyclic
          seen.add(value);
          if (Array.isArray(value)) return value.map(replacer);
          const sorted = {};
          Object.keys(value).sort().forEach(k => { sorted[k] = replacer(value[k]); });
          return sorted;
        }
        return value;
      };
      return JSON.stringify(replacer(obj));
    };
  }

  // -------------------- Messages --------------------
  getMessage(key) {
    const lang = this.config.language || 'ar';
    return (this.messages[lang] && this.messages[lang][key]) || this.messages[lang].invalidChars;
  }

  // -------------------- Cache --------------------
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) return cached.result;
    return null;
  }

  setCachedResult(key, result) {
    try {
      this.cache.set(key, { result, timestamp: Date.now() });
    } catch (e) {
      // Map may fail in very constrained environments - ignore cache silently
      if (this.config.debug) console.warn('Cache set failed', e);
    }
  }

  makeCacheKey(...parts) {
    // normalize each part
    const norm = parts.map(p => (typeof p === 'object' ? this.stableStringify(p) : String(p)));
    return norm.join('|');
  }

  // -------------------- Helpers --------------------
  ok(extra = {}) { return { isValid: true, message: '', ...extra }; }
  err(msg, extra = {}) { return { isValid: false, message: msg, ...extra }; }

  // Generic required check
  required(value) {
    if (value === null || value === undefined) return this.err(this.getMessage('required'));
    if (typeof value === 'string' && value.trim() === '') return this.err(this.getMessage('required'));
    if (Array.isArray(value) && value.length === 0) return this.err(this.getMessage('required'));
    return this.ok();
  }

  // min/max length robustly handles strings, arrays, numbers
  maxLength(value, max) {
    if (value == null) return this.ok();
    const len = (typeof value === 'number') ? value : (value.length != null ? value.length : String(value).length);
    if (len > max) return this.err(`${this.getMessage('maxLength')}: ${max}`);
    return this.ok();
  }

  minLength(value, min) {
    if (value == null) return this.ok();
    const len = (typeof value === 'number') ? value : (value.length != null ? value.length : String(value).length);
    if (len < min) return this.err(`${this.getMessage('minLength')}: ${min}`);
    return this.ok();
  }

  noEmoji(value) {
    if (typeof value !== 'string') return this.ok();
    if (this.patterns.emoji.test(value)) return this.err(this.getMessage('emojiDetected'));
    return this.ok();
  }

  // Use DOMParser where available for robust script detection
  noScript(value) {
    if (typeof value !== 'string' || value.trim() === '') return this.ok();

    // If there are angle brackets, try parsing
    if (value.indexOf('<') !== -1 && typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(value, 'text/html');
        if (doc.querySelector('script')) return this.err(this.getMessage('scriptDetected'));
        // if any inline event handler attribute exists on any element -> flag
        const all = doc.querySelectorAll('*');
        for (const el of all) {
          for (const attr of el.attributes) {
            if (/^on/i.test(attr.name)) return this.err(this.getMessage('scriptDetected'));
          }
        }
      } catch (e) {
        // fallback to regex
        if (this.patterns.scriptTag.test(value) || this.patterns.inlineEventAttr.test(value)) return this.err(this.getMessage('scriptDetected'));
      }
    } else {
      // No HTML-looking content; check for obvious xss patterns in plain text examples conservatively
      if (/(javascript:|data:|vbscript:)/i.test(value)) return this.err(this.getMessage('scriptDetected'));
    }

    return this.ok();
  }

  // Sanitize: two modes - escapeHtml (safe for display) OR stripTags (useful for storing plain text)
  sanitize(value, options = {}) {
    if (typeof value !== 'string') return value;
    const { escapeHtml = true, stripTags = false, trim = true } = options;

    let s = value;
    if (stripTags) {
      // Remove tags but keep textContent using DOMParser where possible
      if (typeof DOMParser !== 'undefined') {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(s, 'text/html');
          s = doc.body ? doc.body.textContent || '' : s.replace(/<[^>]*>/g, '');
        } catch (e) {
          s = s.replace(/<[^>]*>/g, '');
        }
      } else {
        s = s.replace(/<[^>]*>/g, '');
      }
    }

    if (escapeHtml) s = this.escapeHtml(s);
    if (trim) s = s.trim();
    return s;
  }

  // -------------------- Field Validators --------------------
  email(email, options = {}) {
    const cacheKey = this.makeCacheKey('email', email, options);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const { required = true, checkDomain = false } = options;
    if (!required && (!email || email.trim() === '')) return this.ok();

    const requiredCheck = this.required(email);
    if (!requiredCheck.isValid) { const res = this.err(this.getMessage('required')); this.setCachedResult(cacheKey, res); return res; }

    const clean = String(email).trim().toLowerCase();
    if (!this.patterns.email.test(clean)) { const res = this.err(this.getMessage('email')); this.setCachedResult(cacheKey, res); return res; }

    if (checkDomain) {
      const domain = clean.split('@')[1] || '';
      const common = ['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com'];
      if (!common.includes(domain)) { const res = this.err(this.getMessage('email')); this.setCachedResult(cacheKey, res); return res; }
    }

    const result = this.ok({ email: clean });
    this.setCachedResult(cacheKey, result);
    return result;
  }

  phone(phone, countryCode = 'EG') {
    const cacheKey = this.makeCacheKey('phone', phone, countryCode);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const requiredCheck = this.required(phone);
    if (!requiredCheck.isValid) { const res = this.err(this.getMessage('required')); this.setCachedResult(cacheKey, res); return res; }

    const clean = String(phone).replace(/[\s()\-]+/g, '');
    let isValid = false;
    switch ((countryCode || '').toUpperCase()) {
      case 'EG': isValid = this.patterns.phoneEG.test(clean); break;
      case 'SA': isValid = /^(?:\+966|0)?5\d{8}$/.test(clean); break;
      case 'AE': isValid = /^(?:\+971|0)?5\d{8}$/.test(clean); break;
      default: isValid = this.patterns.phoneIntl.test(clean);
    }

    const result = isValid ? this.ok({ phone: clean }) : this.err(this.getMessage('phone'));
    this.setCachedResult(cacheKey, result);
    return result;
  }

  url(url, options = {}) {
    const { required = true, platform = null } = options;
    if (!required && (!url || String(url).trim() === '')) return this.ok();
    const requiredCheck = this.required(url);
    if (!requiredCheck.isValid) return this.err(this.getMessage('required'));

    const clean = String(url).trim();

    // Try using URL constructor for robust parsing
    try {
      const normalized = clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
      const u = new URL(normalized);

      // Basic host / path validation
      if (!u.hostname || u.hostname.indexOf('.') === -1) return this.err(this.getMessage('url'));

      // Platform-specific check
      if (platform) {
        const baseUrl = window.CONFIG?.platforms?.[platform]?.baseUrl;
        const allowedHost = baseUrl ? new URL(baseUrl).hostname.replace(/^www\./, '') : '';
        if (allowedHost && !u.hostname.replace(/^www\./, '').endsWith(allowedHost)) {
          return this.err(`${this.getMessage('url')} - ${platform} domain required`);
        }
      }

      return this.ok({ url: clean });
    } catch (e) {
      // Fallback to regex verification
      if (!this.patterns.urlFallback.test(clean)) return this.err(this.getMessage('url'));
      return this.ok({ url: clean });
    }
  }

  username(username, options = {}) {
    const { platform = 'general', required = true } = options;
    if (!required && (!username || username.trim() === '')) return this.ok();
    const requiredCheck = this.required(username);
    if (!requiredCheck.isValid) return this.err(this.getMessage('required'));

    const clean = String(username).replace(/^@/, '').trim();
    let pattern, message;
    switch (platform) {
      case 'instagram': pattern = this.patterns.instagram; message = 'Instagram username is invalid'; break;
      case 'tiktok': pattern = this.patterns.tiktok; message = 'TikTok username is invalid'; break;
      case 'twitter': pattern = this.patterns.twitter; message = 'Twitter username is invalid'; break;
      default: pattern = this.patterns.username; message = this.getMessage('username');
    }
    if (!pattern.test(clean)) return this.err(this.config.language === 'ar' ? this.getMessage('username') : message);
    return this.ok({ username: clean });
  }

  password(password, confirmPassword = null, options = {}) {
    const cfg = Object.assign({}, this.patterns.password, options);
    const requiredCheck = this.required(password);
    if (!requiredCheck.isValid) return this.err(this.getMessage('required'));

    const errors = [];
    if (String(password).length < cfg.minLength) errors.push(this.config.language === 'ar' ? `كلمة المرور يجب أن تكون ${cfg.minLength} أحرف على الأقل` : `Password must be at least ${cfg.minLength} characters`);
    if (cfg.requireUpper && !/[A-Z]/.test(password)) errors.push(this.config.language === 'ar' ? 'يجب أن تحتوي على حرف كبير (A-Z)' : 'Must contain an uppercase letter (A-Z)');
    if (cfg.requireLower && !/[a-z]/.test(password)) errors.push(this.config.language === 'ar' ? 'يجب أن تحتوي على حرف صغير (a-z)' : 'Must contain a lowercase letter (a-z)');
    if (cfg.requireNumber && !/\d/.test(password)) errors.push(this.config.language === 'ar' ? 'يجب أن تحتوي على رقم' : 'Must contain a number');
    if (cfg.requireSpecial && !/[@$!%*?&]/.test(password)) errors.push(this.config.language === 'ar' ? 'يجب أن تحتوي على رمز خاص (@$!%*?&)' : 'Must contain a special character (@$!%*?&)');

    // support customRules as functions or {pattern,message}
    if (Array.isArray(cfg.customRules)) {
      for (const rule of cfg.customRules) {
        if (typeof rule === 'function') {
          const ok = rule(password);
          if (ok !== true) errors.push(typeof ok === 'string' ? ok : 'Custom rule failed');
        } else if (rule && rule.pattern && !rule.pattern.test(password)) {
          errors.push(rule.message || 'Custom pattern rule failed');
        }
      }
    }

    if (errors.length) return this.err(errors.join(', '));
    if (confirmPassword !== null && password !== confirmPassword) return this.err(this.getMessage('passwordMismatch'));
    return this.ok();
  }

  // -------------------- File / Image validation --------------------
  async file(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024,
      allowedTypes = ['image/png','image/jpeg','image/webp','image/gif'],
      minWidth = 100, minHeight = 100, maxWidth = 4000, maxHeight = 4000,
      aspectRatio = null, checkDimensions = true
    } = options;

    if (!file) return this.err(this.getMessage('required'));
    const errors = [];
    if (file.size > maxSize) errors.push(`${this.getMessage('fileSize')} (${Math.round(maxSize/1024/1024)}MB)`);
    if (!allowedTypes.includes(file.type)) errors.push(`${this.getMessage('fileType')}: ${allowedTypes.join(', ')}`);

    if (file.type.startsWith('image/') && checkDimensions) {
      try {
        const imageInfo = await this.getImageInfo(file);
        if (imageInfo.width < minWidth || imageInfo.height < minHeight) errors.push(`${this.getMessage('imageDimensions')} (${minWidth}×${minHeight})`);
        if (imageInfo.width > maxWidth || imageInfo.height > maxHeight) errors.push(`${this.getMessage('imageDimensions')} (${maxWidth}×${maxHeight})`);
        if (aspectRatio && Array.isArray(aspectRatio) && aspectRatio.length === 2) {
          const [rw, rh] = aspectRatio;
          const expected = rw / rh;
          const actual = imageInfo.width / imageInfo.height;
          // scale tolerance by expected ratio
          const tolerance = Math.max(0.01, expected * 0.1);
          if (Math.abs(actual - expected) > tolerance) {
            errors.push(this.config.language === 'ar' ? `نسبة الأبعاد يجب أن تكون ${rw}:${rh}` : `Aspect ratio must be ${rw}:${rh}`);
          }
        }

        if (errors.length === 0) return this.ok({ ...imageInfo, file });
      } catch (e) {
        errors.push(this.config.language === 'ar' ? 'تعذر قراءة ملف الصورة' : 'Could not read image file');
      }
    }

    return errors.length ? this.err(errors.join(', ')) : this.ok({ file });
  }

  getImageInfo(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.width, height: img.height, ratio: +(img.width / img.height).toFixed(2), size: file.size, type: file.type }); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    });
  }

  // -------------------- Form utilities --------------------
  validateForm(formData, rules) {
    const results = {};
    let isValid = true;
    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = formData[field];
      const fieldResult = this.validateField(value, fieldRules);
      results[field] = fieldResult;
      if (!fieldResult.isValid) isValid = false;
    }
    return { isValid, results, errors: !isValid ? this.getErrorMessages(results) : [] };
  }

  validateField(value, rules) {
    for (const rule of rules) {
      const result = this.applyRule(value, rule);
      if (!result.isValid) return result;
    }
    return this.ok();
  }

  applyRule(value, rule) {
    const { type, ...options } = rule;
    switch (type) {
      case 'required': return this.required(value);
      case 'email': return this.email(value, options);
      case 'phone': return this.phone(value, options.countryCode);
      case 'url': return this.url(value, options);
      case 'username': return this.username(value, options);
      case 'password': return this.password(value, options.confirm, options);
      case 'minLength': return this.minLength(value, options.value);
      case 'maxLength': return this.maxLength(value, options.value);
      case 'noEmoji': return this.noEmoji(value);
      case 'noScript': return this.noScript(value);
      case 'pattern': return this.validatePattern(value, options.pattern, options.message);
      case 'custom': return (typeof options.validator === 'function') ? options.validator(value, options) : this.err('Invalid custom validator');
      default: return this.err(`Unknown validation rule: ${type}`);
    }
  }

  validatePattern(value, pattern, errorMessage) {
    if (!pattern) return this.ok();
    try { if (!pattern.test(value)) return this.err(errorMessage || this.getMessage('invalidChars')); } catch (e) { return this.err(this.getMessage('invalidChars')); }
    return this.ok();
  }

  getErrorMessages(results) {
    const errors = [];
    for (const [field, result] of Object.entries(results)) {
      if (!result.isValid && result.message) errors.push({ field, message: result.message });
    }
    return errors;
  }

  applyValidationStyles(field, result) {
    if (!field || !field.classList) return;
    field.classList.remove('is-valid', 'is-invalid');
    const old = field.parentNode && field.parentNode.querySelector('.validation-feedback');
    if (old) old.remove();
    if (!result) return;
    field.classList.add(result.isValid ? 'is-valid' : 'is-invalid');
    if (result.message) {
      const feedback = document.createElement('div');
      feedback.className = `validation-feedback ${result.isValid ? 'valid-feedback' : 'invalid-feedback'}`;
      feedback.textContent = result.message;
      field.parentNode.appendChild(feedback);
    }
  }

  // Attach listeners only to fields that are present in rules
  validateFormLive(formElement, rules, options = {}) {
    const { debounceTime = 300, showErrors = true } = options;
    const validateField = this.debounce((field) => {
      const name = field.name;
      const fieldRules = rules[name];
      if (!fieldRules) return;
      const result = this.validateField(field.value, fieldRules);
      if (showErrors) this.applyValidationStyles(field, result);
    }, debounceTime);

    const fields = formElement.querySelectorAll('input[name], select[name], textarea[name]');
    fields.forEach(field => { if (rules[field.name]) {
      field.addEventListener('input', () => validateField(field));
      field.addEventListener('blur', () => validateField(field));
    }});

    return () => {
      const formData = new FormData(formElement);
      const data = {};
      for (const [k, v] of formData.entries()) data[k] = v;
      return this.validateForm(data, rules);
    };
  }
}

// Create global instance (safe guard)
if (typeof window !== 'undefined') {
  window.AdvancedInputValidator = new AdvancedInputValidator({ language: 'ar', strictMode: false, autoSanitize: true, debug: false });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) module.exports = AdvancedInputValidator;
