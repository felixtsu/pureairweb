/**
 * Captcha System Configuration
 * 
 * Toggle: Add ?captcha=1 to URL to force captcha, ?captcha=0 to disable
 * Without param: Uses captchaEnabled below as master switch
 * 
 * Demo scenarios:
 * - Login page: reCAPTCHA v3 (silent, based on score)
 * - Order submission: Random slider captcha (30% chance by default)
 */

export interface CaptchaConfig {
  enabled: boolean;        // Master switch: true = captcha system active
  triggerRate: number;    // 0.0 - 1.0, probability of triggering per action
  mode: 'math' | 'slider'; // Captcha type
  cooldownMinutes: number; // Minutes before same user is challenged again
}

export const captchaConfig: CaptchaConfig = {
  enabled: true,
  triggerRate: 0.3,       // 30% chance to trigger on order submission
  mode: 'math',
  cooldownMinutes: 5,      // Don't re-challenge same browser for 5 min
};

export const CAPTCHA_COOKIE = 'captcha_verified';
export const CAPTCHA_TIMESTAMP_COOKIE = 'captcha_verified_at';
