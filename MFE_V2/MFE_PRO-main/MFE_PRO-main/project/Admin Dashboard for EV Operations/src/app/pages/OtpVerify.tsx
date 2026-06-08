import { useState, useEffect, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';
import { otpService } from '../services/otpService';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ShieldCheck, Mail, RefreshCw, AlertTriangle, Clock, CheckCircle2, Lock } from 'lucide-react';
import loginBg from '../../assets/evcharge.png';
import { motion, AnimatePresence } from 'motion/react';

const CODE_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60; // must match otpService OTP_TTL_MS
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_RESENDS = 3;

export default function OtpVerify() {
  const { pendingAuth, setPendingAuth: _set, clearPendingAuth, setCurrentUser, setCurrentTenant } = useTenant();
  const navigate = useNavigate();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [ttl, setTtl] = useState(OTP_TTL_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendCount, setResendCount] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no pending auth (direct navigation or page refresh)
  useEffect(() => {
    if (!pendingAuth) navigate('/', { replace: true });
  }, [pendingAuth, navigate]);

  // Request OTP on mount
  useEffect(() => {
    if (!pendingAuth) return;
    otpService.requestOtp(pendingAuth.user.email).then(({ demoCode }) => {
      setDemoCode(demoCode);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main countdown (OTP TTL)
  useEffect(() => {
    if (locked || success) return;
    if (ttl <= 0) return;
    const id = setInterval(() => setTtl((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [locked, success, ttl]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const focusInput = (index: number) => {
    inputRefs.current[Math.min(Math.max(index, 0), CODE_LENGTH - 1)]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError(null);
    if (value && index < CODE_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) focusInput(index - 1);
    if (e.key === 'ArrowLeft' && index > 0) focusInput(index - 1);
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) focusInput(index + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setError(null);
    focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
  };

  const handleVerify = useCallback(async () => {
    if (!pendingAuth) return;
    const code = digits.join('');
    if (code.length < CODE_LENGTH) { setError('Please enter all 6 digits.'); return; }
    setVerifying(true);
    setError(null);
    const result = await otpService.verifyOtp(pendingAuth.user.email, code);
    setVerifying(false);
    if (result.valid) {
      setSuccess(true);
      setCurrentTenant(pendingAuth.tenant);
      setCurrentUser(pendingAuth.user);
      clearPendingAuth();
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } else if (result.reason === 'locked') {
      setLocked(true);
      setError('Too many failed attempts. Please go back and log in again.');
    } else if (result.reason === 'expired') {
      setError('Code expired. Please request a new one.');
    } else {
      setError('Incorrect code. Please try again.');
      setDigits(Array(CODE_LENGTH).fill(''));
      focusInput(0);
    }
  }, [pendingAuth, digits, setCurrentTenant, setCurrentUser, clearPendingAuth, navigate]);

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (digits.every((d) => d !== '') && !verifying && !locked && !success) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleResend = async () => {
    if (!pendingAuth || resendCooldown > 0 || resendCount >= MAX_RESENDS) return;
    setDigits(Array(CODE_LENGTH).fill(''));
    setError(null);
    setTtl(OTP_TTL_SECONDS);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setResendCount((c) => c + 1);
    const { demoCode } = await otpService.requestOtp(pendingAuth.user.email);
    setDemoCode(demoCode);
    focusInput(0);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const expired = ttl <= 0 && !success;
  const canResend = resendCooldown === 0 && resendCount < MAX_RESENDS && !locked && !success;

  if (!pendingAuth) return null;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${loginBg})` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-slate-900/85" />

      <Card className="relative z-10 w-full max-w-md bg-white/85 backdrop-blur-xl border border-white/40 shadow-[0_24px_70px_rgba(15,23,42,0.55)]">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              success ? 'bg-green-500' : locked ? 'bg-red-100' : 'bg-blue-600'
            }`}>
              {success
                ? <CheckCircle2 className="h-7 w-7 text-white" />
                : locked
                ? <Lock className="h-7 w-7 text-red-500" />
                : <ShieldCheck className="h-7 w-7 text-white" />
              }
            </div>
          </div>
          <CardTitle className="text-xl">
            {success ? 'Access Granted' : locked ? 'Account Locked' : '2-Factor Verification'}
          </CardTitle>
          <CardDescription>
            {success
              ? 'Redirecting to your dashboard…'
              : locked
              ? 'Too many failed attempts.'
              : (
                <span className="flex items-center justify-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Code sent to <strong>{pendingAuth.user.email}</strong>
                </span>
              )
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Demo badge */}
          {demoCode && !success && !locked && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="text-xs text-amber-600 font-medium">Demo mode — your code</span>
              <span className="font-mono font-bold text-amber-700 tracking-[0.25em] text-base select-all">
                {demoCode}
              </span>
            </div>
          )}

          {/* 6-digit input grid */}
          {!success && !locked && (
            <div className="flex gap-2 justify-center">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  disabled={verifying || expired}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  onFocus={(e) => e.target.select()}
                  className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all bg-white
                    ${error ? 'border-red-400 ring-2 ring-red-100'
                      : d ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}
                    ${verifying || expired ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                />
              ))}
            </div>
          )}

          {/* Timer */}
          {!success && !locked && (
            <div className="flex items-center justify-center gap-1.5 text-sm">
              <Clock className={`h-3.5 w-3.5 ${expired ? 'text-red-500' : 'text-gray-400'}`} />
              {expired
                ? <span className="text-red-500 font-medium">Code expired</span>
                : <span className="text-gray-500">Expires in <span className={`font-mono font-semibold ${ttl < 60 ? 'text-red-500' : 'text-gray-700'}`}>{fmtTime(ttl)}</span></span>
              }
            </div>
          )}

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Verify button */}
          {!success && !locked && (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={verifying || expired || digits.some((d) => !d)}
              onClick={handleVerify}
            >
              {verifying ? 'Verifying…' : 'Verify Code'}
            </Button>
          )}

          {/* Resend / Back row */}
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { clearPendingAuth(); navigate('/', { replace: true }); }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back to login
            </button>
            {!locked && !success && (
              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend}
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  canResend ? 'text-blue-600 hover:text-blue-700' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : resendCount >= MAX_RESENDS
                  ? 'No more resends'
                  : 'Resend code'}
              </button>
            )}
            {locked && (
              <button
                type="button"
                onClick={() => { clearPendingAuth(); navigate('/', { replace: true }); }}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Try again
              </button>
            )}
          </div>

          {resendCount > 0 && !locked && (
            <p className="text-center text-xs text-gray-400">
              {MAX_RESENDS - resendCount} resend{MAX_RESENDS - resendCount !== 1 ? 's' : ''} remaining
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
