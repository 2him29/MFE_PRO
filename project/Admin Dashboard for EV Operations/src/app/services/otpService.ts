export interface OtpRequestResult {
  /** Non-null only when EmailJS is not configured — shows the code in the UI for demo purposes. */
  demoCode: string | null;
}

export interface OtpVerifyResult {
  valid: boolean;
  reason?: 'invalid' | 'expired' | 'locked';
}

export interface OtpService {
  requestOtp(email: string): Promise<OtpRequestResult>;
  verifyOtp(email: string, code: string): Promise<OtpVerifyResult>;
}

// ── Backend-driven OTP (used when VITE_API_BASE_URL is set) ──────────────────

class ApiOtpService implements OtpService {
  private readonly base = import.meta.env.VITE_API_BASE_URL as string;

  async requestOtp(email: string): Promise<OtpRequestResult> {
    const res = await fetch(`${this.base}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return { demoCode: data.demoCode ?? null };
  }

  async verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
    const res = await fetch(`${this.base}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    return { valid: data.valid, reason: data.reason };
  }
}

// ── Local OTP with EmailJS email delivery (used when no backend is configured) ─

interface OtpRecord {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

const OTP_STORAGE_KEY = 'evcharge.otp';
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

class LocalOtpService implements OtpService {
  private readonly serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined;
  private readonly templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
  private readonly publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined;

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async sendEmail(email: string, code: string): Promise<void> {
    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      this.serviceId,
        template_id:     this.templateId,
        user_id:         this.publicKey,
        template_params: {
          to_email: email,
          otp_code: code,
          app_name: 'EV Charge DZ',
          expiry_minutes: '5',
        },
      }),
    });
  }

  async requestOtp(email: string): Promise<OtpRequestResult> {
    const code = this.generateCode();
    const record: OtpRecord = {
      code,
      email,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    };
    sessionStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(record));

    const emailJsConfigured =
      this.serviceId && this.templateId && this.publicKey;

    if (emailJsConfigured) {
      await this.sendEmail(email, code);
      return { demoCode: null };
    }

    // EmailJS not yet configured — show code in UI (demo fallback)
    return { demoCode: code };
  }

  async verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
    const raw = sessionStorage.getItem(OTP_STORAGE_KEY);
    if (!raw) return { valid: false, reason: 'expired' };

    const record: OtpRecord = JSON.parse(raw);

    if (record.email !== email) return { valid: false, reason: 'invalid' };

    if (Date.now() > record.expiresAt) {
      sessionStorage.removeItem(OTP_STORAGE_KEY);
      return { valid: false, reason: 'expired' };
    }

    record.attempts += 1;

    if (record.attempts > MAX_ATTEMPTS) {
      sessionStorage.removeItem(OTP_STORAGE_KEY);
      return { valid: false, reason: 'locked' };
    }

    if (record.code === code) {
      sessionStorage.removeItem(OTP_STORAGE_KEY);
      return { valid: true };
    }

    sessionStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(record));
    return { valid: false, reason: 'invalid' };
  }
}

// Use EmailJS local service when credentials are present, backend otherwise
export const otpService: OtpService =
  (import.meta.env.VITE_EMAILJS_SERVICE_ID &&
   import.meta.env.VITE_EMAILJS_TEMPLATE_ID &&
   import.meta.env.VITE_EMAILJS_PUBLIC_KEY)
    ? new LocalOtpService()
    : new ApiOtpService();
