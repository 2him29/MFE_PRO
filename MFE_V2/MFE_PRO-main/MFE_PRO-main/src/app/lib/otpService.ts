import { API_BASE, EMAILJS_SERVICE_ID as SERVICE_ID, EMAILJS_TEMPLATE_ID as TEMPLATE_ID, EMAILJS_PUBLIC_KEY as PUBLIC_KEY } from './env';
const SESSION_KEY   = 'evcharge.otp.email';

export const otpService = {
  /** Request a new OTP for the given email. Returns demoCode when EmailJS is not configured. */
  async request(email: string): Promise<{ demoCode?: string }> {
    const res = await fetch(`${API_BASE}/api/auth/otp/request`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('OTP request failed');
    const data: { demoCode?: string } = await res.json();

    sessionStorage.setItem(SESSION_KEY, email);

    // If EmailJS credentials are configured, send the code via email
    if (SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY && data.demoCode) {
      try {
        const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            service_id:      SERVICE_ID,
            template_id:     TEMPLATE_ID,
            user_id:         PUBLIC_KEY,
            template_params: {
              to_email:        email,
              otp_code:        data.demoCode,
              name:            email,
              expiry_minutes:  '10',
            },
          }),
        });
        if (emailRes.ok) {
          // Code was emailed successfully — don't expose it in the returned object
          return {};
        }
        // Non-2xx from EmailJS (e.g. Service Error) — fall through to show demoCode
      } catch {
        // Network failure — fall through to show demoCode
      }
    }

    return data;
  },

  /** Verify a submitted OTP code. */
  async verify(email: string, code: string): Promise<{ valid: boolean; reason?: string }> {
    const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, code }),
    });
    if (!res.ok) throw new Error('OTP verify failed');
    const data: { valid: boolean; reason?: string } = await res.json();
    if (data.valid) sessionStorage.removeItem(SESSION_KEY);
    return data;
  },

  storedEmail: (): string | null => sessionStorage.getItem(SESSION_KEY),
};
