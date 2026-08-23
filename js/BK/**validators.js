/**
 * Enhanced Form Validators (Improved Version)
 * مدقق النماذج المحسن - نسخة محسنة
 */

class FormValidators {
    constructor() {
        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i,

            username: /^[\u0600-\u06FFa-zA-Z0-9_-]{3,30}$/,

            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/,

            phone: /^(\+20|0)?1[0-25][0-9]{8}$/,

            url: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/i,

            text: /^[\u0600-\u06FFa-zA-Z\s]{2,}$/,

            numeric: /^\d+$/,

            instagram: /^@?[a-zA-Z0-9._]{1,30}$/,

            tiktok: /^@?[a-zA-Z0-9._]{1,24}$/,

            twitter: /^@?[a-zA-Z0-9_]{1,15}$/
        };

        this.messages = {
            required: 'هذا الحقل مطلوب',
            email: 'صيغة البريد الإلكتروني غير صحيحة',
            passwordWeak: 'كلمة المرور ضعيفة',
            passwordMismatch: 'كلمات المرور غير متطابقة',
            username: 'اسم المستخدم غير صالح',
            phone: 'رقم الهاتف غير صحيح',
            url: 'الرابط غير صالح',
            text: 'يجب إدخال نص صحيح',
            numeric: 'يجب إدخال أرقام فقط',
            fileSize: 'حجم الملف كبير جداً',
            fileType: 'نوع الملف غير مدعوم',
            imageDimensions: 'أبعاد الصورة غير مناسبة',
            maxLength: 'تم تجاوز الحد الأقصى للأحرف'
        };
    }

    // Unified error result generator
    result(isValid, message = '', extra = {}) {
        return { isValid, message, ...extra };
    }

    validateRequired(value, fieldName = 'الحقل') {
        return (!value || value.toString().trim() === '')
            ? this.result(false, `${fieldName} ${this.messages.required}`)
            : this.result(true);
    }

    validatePattern(value, pattern, errorMessage) {
        return pattern.test(value)
            ? this.result(true)
            : this.result(false, errorMessage);
    }

    validateEmail(email, options = {}) {
        const { required = true, checkDomain = false } = options;

        if (!email && !required) return this.result(true);

        const requiredCheck = this.validateRequired(email, 'البريد الإلكتروني');
        if (!requiredCheck.isValid) return requiredCheck;

        const patternCheck = this.validatePattern(email, this.patterns.email, this.messages.email);
        if (!patternCheck.isValid) return patternCheck;

        if (checkDomain) {
            const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
            const domain = email.split('@')[1].toLowerCase();
            if (!commonDomains.includes(domain)) {
                return this.result(false, 'النطاق غير معروف');
            }
        }

        return this.result(true);
    }

    validatePassword(password, options = {}) {
        const {
            confirmPassword = null,
            minLength = 8,
            requireSpecial = true,
            requireNumber = true,
            requireUpper = true
        } = options;

        const requiredCheck = this.validateRequired(password, 'كلمة المرور');
        if (!requiredCheck.isValid) return requiredCheck;

        if (password.length < minLength)
            return this.result(false, `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`);

        const errors = [];

        if (requireUpper && !/[A-Z]/.test(password)) errors.push('حرف كبير');
        if (requireNumber && !/\d/.test(password)) errors.push('رقم');
        if (requireSpecial && !/[@$!%*?&]/.test(password)) errors.push('رمز خاص (@$!%*?&)');

        if (errors.length > 0)
            return this.result(false, `كلمة المرور يجب أن تحتوي على: ${errors.join('، ')}`);

        if (confirmPassword !== null && password !== confirmPassword)
            return this.result(false, this.messages.passwordMismatch);

        return this.result(true);
    }

    validateUsername(username, { platform = 'general' } = {}) {
        const requiredCheck = this.validateRequired(username, 'اسم المستخدم');
        if (!requiredCheck.isValid) return requiredCheck;

        const cleanUser = username.replace('@', '');

        const pattern = this.patterns[platform] || this.patterns.username;
        const message =
            platform === 'instagram'
                ? 'اسم مستخدم انستغرام غير صالح'
                : platform === 'tiktok'
                ? 'اسم مستخدم تيك توك غير صالح'
                : platform === 'twitter'
                ? 'اسم مستخدم تويتر غير صالح'
                : this.messages.username;

        return this.validatePattern(cleanUser, pattern, message);
    }

    validatePhone(phone) {
        const requiredCheck = this.validateRequired(phone, 'رقم الهاتف');
        if (!requiredCheck.isValid) return requiredCheck;

        const clean = phone.replace(/[\s()-]+/g, '');

        return this.validatePattern(clean, this.patterns.phone, this.messages.phone);
    }

    validateURL(url, platform = null) {
        const requiredCheck = this.validateRequired(url, 'الرابط');
        if (!requiredCheck.isValid) return requiredCheck;

        const patternCheck = this.validatePattern(url, this.patterns.url, this.messages.url);
        if (!patternCheck.isValid) return patternCheck;

        if (platform) {
            let domain = '';
            try {
                domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
            } catch {
                return this.result(false, this.messages.url);
            }

            const platformDomains = {
                instagram: ['instagram.com'],
                tiktok: ['tiktok.com'],
                twitter: ['twitter.com', 'x.com'],
                youtube: ['youtube.com'],
                snapchat: ['snapchat.com']
            };

            if (platformDomains[platform] && !platformDomains[platform].some(d => domain.includes(d))) {
                return this.result(false, `الرابط لا ينتمي إلى ${platform}`);
            }
        }

        return this.result(true);
    }

    // Improved image validation
    async validateFile(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024,
            allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
            maxWidth = 4096,
            maxHeight = 4096,
            minWidth = 100,
            minHeight = 100,
            aspectRatio = null
        } = options;

        if (!file) return this.result(false, this.messages.required);

        const errors = [];

        if (file.size > maxSize)
            errors.push(`${this.messages.fileSize} (الأقصى ${Math.round(maxSize / 1e6)}MB)`);

        if (!allowedTypes.includes(file.type))
            errors.push(`${this.messages.fileType}: ${allowedTypes.join(', ')}`);

        if (file.type.startsWith('image/')) {
            try {
                const info = await this.getImageInfo(file);

                if (info.width > maxWidth || info.height > maxHeight)
                    errors.push(`${this.messages.imageDimensions} (الأقصى ${maxWidth}x${maxHeight})`);

                if (info.width < minWidth || info.height < minHeight)
                    errors.push(`أبعاد الصورة صغيرة جداً (الأدنى ${minWidth}x${minHeight})`);

                if (aspectRatio) {
                    const ratioOk =
                        Math.abs(info.width / info.height - aspectRatio[0] / aspectRatio[1]) < 0.1;
                    if (!ratioOk)
                        errors.push(`نسبة الأبعاد يجب أن تكون ${aspectRatio[0]}:${aspectRatio[1]}`);
                }

                return this.result(errors.length === 0, errors.join('، '), { info });
            } catch {
                errors.push('تعذر قراءة أبعاد الصورة');
            }
        }

        return this.result(errors.length === 0, errors.join('، '));
    }

    getImageInfo(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve({
                    width: img.width,
                    height: img.height,
                    ratio: +(img.width / img.height).toFixed(2)
                });
            };

            img.onerror = () => reject('error loading image');

            img.src = url;
        });
    }

    // Form utilities (unchanged but improved structure)
    applyValidationStyles(field, result) {
        field.classList.remove('is-valid', 'is-invalid');

        if (!result) return;

        field.classList.add(result.isValid ? 'is-valid' : 'is-invalid');

        const old = field.parentNode.querySelector('.validation-feedback');
        if (old) old.remove();

        if (result.message) {
            const feedback = document.createElement('div');
            feedback.className = `validation-feedback ${result.isValid ? 'valid-feedback' : 'invalid-feedback'}`;
            feedback.textContent = result.message;
            field.parentNode.appendChild(feedback);
        }
    }
}

// Global instance
window.FormValidators = new FormValidators();

