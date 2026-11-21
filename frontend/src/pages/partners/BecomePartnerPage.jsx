import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import Alert from '../../components/common/Alert.jsx';
import leadService from '../../services/leadService.js';
import api from '../../services/api.js';
import { categories as fallbackCategories } from '../../data/categories.js';
import { getCategoryVisual, heroCommercialImg } from '../../assets/categories/index.js';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  Upload,
  X,
  PhoneCall,
  LayoutDashboard,
  Building2,
  PlusCircle,
  FileCheck2,
  User,
  LogOut,
  Edit3,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Image as ImageIcon,
  Mail,
  KeyRound,
  Store,
  Briefcase,
  Warehouse as WarehouseIcon,
  Package,
} from 'lucide-react';

const STATUS_BADGES = {
  SUBMITTED: {
    label: 'Pending Admin Review',
    classes: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Approved (Ready to Publish)',
    classes: 'bg-blue-50 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },
  PUBLISHED: {
    label: 'Published Live',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  UNPUBLISHED: {
    label: 'Unpublished (Draft)',
    classes: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
  },
  REJECTED: {
    label: 'Rejected',
    classes: 'bg-rose-50 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
  },
  SUSPENDED: {
    label: 'Suspended',
    classes: 'bg-red-100 text-red-900 border-red-300',
    dot: 'bg-red-600',
  },
};

const EMPTY_FORM = {
  businessName: '',
  contactPerson: '',
  phone: '',
  email: '',
  category: '',
  customCategoryName: '',
  servicesOffered: '',
  city: '',
  state: '',
  address: '',
  pinCode: '',
  serviceAreas: '',
  website: '',
  businessDescription: '',
  consentToContact: true,
  consentToDisplayPhone: true,
};

// Public OAuth 2.0 Web Client ID (not a secret). Must equal backend GOOGLE_CLIENT_ID.
const GOOGLE_CLIENT_ID = String(import.meta.env?.VITE_GOOGLE_CLIENT_ID || '')
  .trim()
  .replace(/^['"]+|['"]+$/g, '')
  .trim();
const IS_GOOGLE_CLIENT_CONFIGURED = /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(
  GOOGLE_CLIENT_ID
);
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function describeGoogleNonceFailure(errInfo) {
  const status = errInfo?.status ?? 0;
  const msg = String(errInfo?.message || '').trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'this site';

  if (status === 503) {
    if (/not configured/i.test(msg)) {
      return {
        title: 'Google Sign-In Not Configured on Server',
        message:
          'Google Sign-In is enabled in the frontend build, but GOOGLE_CLIENT_ID is not configured on the backend server. Please verify backend environment variables or continue with Email OTP below.',
      };
    }
    return {
      title: 'Authentication Service Temporarily Unavailable',
      message:
        msg ||
        'The WARERENT authentication service is temporarily unavailable. Please try again shortly or continue with Email OTP below.',
    };
  }

  if (status === 403) {
    return {
      title: 'Origin Not Authorized by Backend',
      message: `The backend server rejected the Google Sign-In initialization request from ${origin}. Please ensure CORS_ORIGIN on the backend includes ${origin}, or continue with Email OTP below.`,
    };
  }

  if (status === 404) {
    return {
      title: 'Google Sign-In Service Unavailable',
      message:
        'The backend Google Sign-In nonce endpoint (/api/v1/provider-auth/google/nonce) returned 404 Not Found. Please ensure the backend service is running the latest deployment, or continue with Email OTP below.',
    };
  }

  if (status === 429) {
    return {
      title: 'Too Many Google Sign-In Attempts',
      message:
        msg ||
        'Too many Google Sign-In initialization requests. Please wait a few minutes or continue with Email OTP below.',
    };
  }

  if (status === 0) {
    return {
      title: 'Network Connection Error',
      message:
        msg ||
        'Unable to reach the WARERENT server to initialize Google Sign-In. Please check your internet connection or continue with Email OTP below.',
    };
  }

  return {
    title: 'Google Sign-In Initialization Failed',
    message:
      msg ||
      'Unable to initialize a secure Google Sign-In session right now. Please try again or continue with Email OTP below.',
  };
}

function describeGooglePromptNotification(notification, hasRenderedButton) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'this site';

  if (notification?.isNotDisplayed?.()) {
    const reason =
      typeof notification.getNotDisplayedReason === 'function'
        ? String(notification.getNotDisplayedReason() || '')
        : 'unknown_reason';

    if (reason === 'unregistered_origin') {
      return {
        title: 'Unauthorized JavaScript Origin',
        message: `Google rejected Sign-In for ${origin} (unregistered_origin). Please add ${origin} to Authorized JavaScript Origins for this OAuth 2.0 Web Client ID in Google Cloud Console, or continue with Email OTP below.`,
      };
    }

    if (reason === 'invalid_client' || reason === 'missing_client_id') {
      return {
        title: 'Invalid Google Client Configuration',
        message: `Google rejected the configured OAuth 2.0 Client ID (${reason}). Please verify VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID match a valid Web Client ID, or continue with Email OTP below.`,
      };
    }

    if (reason === 'secure_http_required' || reason === 'browser_not_supported') {
      return {
        title: 'Browser or HTTPS Requirement',
        message: `Google Sign-In prompt cannot run in this browser context (${reason}). Please use HTTPS or continue with Email OTP below.`,
      };
    }

    if (reason === 'opt_out_or_no_session' || reason === 'suppressed_by_user') {
      if (hasRenderedButton) {
        return null;
      }
      return {
        title: 'No Active Google Session Detected',
        message:
          'Google One Tap could not detect an active Google session in this browser (or third-party sign-in cookies are disabled). Please click the Google Sign-In button directly or continue with Email OTP below.',
      };
    }

    if (hasRenderedButton) {
      return null;
    }

    return {
      title: 'Google Sign-In Prompt Unavailable',
      message: `Google Sign-In prompt could not be displayed (${reason}). Please verify that ${origin} is listed in Google Cloud Console Authorized JavaScript Origins and that popups/third-party sign-in are permitted, or continue with Email OTP below.`,
    };
  }

  if (notification?.isSkippedMoment?.()) {
    const reason =
      typeof notification.getSkippedReason === 'function'
        ? String(notification.getSkippedReason() || '')
        : '';

    if (reason === 'user_cancel' || reason === 'tap_outside' || reason === 'auto_cancel') {
      return {
        title: 'Google Sign-In Dismissed',
        message:
          'Google Sign-In prompt was closed before completing authentication. You can try again or continue with Email OTP below.',
      };
    }

    if (reason === 'issuing_failed') {
      return {
        title: 'Google Token Issuance Failed',
        message:
          'Google could not issue an authentication token for this session. Please try again or continue with Email OTP below.',
      };
    }
  }

  return null;
}

export default function BecomePartnerPage() {
  usePageMeta({
    title: 'Provider Portal — List & Manage Commercial Properties | WARERENT',
    description:
      'Authenticate with your email address via Email OTP to submit and manage commercial shop, office, warehouse, and godown listings on WARERENT.',
    canonical: 'https://wareshop.in/become-a-partner',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';

  // Provider session & dashboard state
  const [checkingSession, setCheckingSession] = useState(true);
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    approved: 0,
    published: 0,
    unpublished: 0,
    rejected: 0,
    suspended: 0,
  });
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editingListingId, setEditingListingId] = useState(null);

  // Email OTP Authentication state
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authPhase, setAuthPhase] = useState('idle'); // idle | sending | verifying
  const [authError, setAuthError] = useState('');
  const [authErrorTitle, setAuthErrorTitle] = useState('Authentication Error');
  const [authNotice, setAuthNotice] = useState('');
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [otpRemainingSeconds, setOtpRemainingSeconds] = useState(0);
  const [verifiedEmailToken, setVerifiedEmailToken] = useState('');
  const [emailVerifiedSuccess, setEmailVerifiedSuccess] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const googleButtonContainerRef = useRef(null);
  // Server-issued single-use nonce + attempt token, held in memory only (never persisted)
  const googleAttemptRef = useRef(null);
  const googleNonceErrorRef = useRef(null);
  const googleScriptLoadErrorRef = useRef(false);
  const googleCallbackRef = useRef(null);

  // Categories
  const [availableCategories, setAvailableCategories] = useState(fallbackCategories);

  // Listing submission / edit form state
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [shopImageFile, setShopImageFile] = useState(null);
  const [shopImagePreview, setShopImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Resend cooldown and OTP expiry countdown timer
  useEffect(() => {
    if (resendCooldownSeconds <= 0 && otpRemainingSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setOtpRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldownSeconds, otpRemainingSeconds]);

  // Load active categories from backend
  useEffect(() => {
    api
      .get('/categories')
      .then((result) => {
        if (Array.isArray(result?.data) && result.data.length > 0) {
          setAvailableCategories(result.data);
        }
      })
      .catch(() => {});
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const res = await leadService.getDashboard();
      if (res?.success && res?.data?.account) {
        const acct = res.data.account;
        setAccount(acct);
        setStats(
          res.data.stats || {
            total: 0,
            submitted: 0,
            approved: 0,
            published: 0,
            unpublished: 0,
            rejected: 0,
            suspended: 0,
          }
        );
        setListings(Array.isArray(res.data.listings) ? res.data.listings : []);
        setProfileForm({
          name: acct.name || '',
          phone: acct.phone || '',
        });
        setFormData((prev) => ({
          ...prev,
          contactPerson: prev.contactPerson || acct.name || '',
          phone: prev.phone || acct.phone || '',
          email: prev.email || acct.email || '',
        }));
        return true;
      }
    } catch {
      setAccount(null);
    }
    return false;
  }, []);

  useEffect(() => {
    let isMounted = true;
    setCheckingSession(true);
    loadDashboardData().finally(() => {
      if (isMounted) setCheckingSession(false);
    });
    return () => {
      isMounted = false;
    };
  }, [loadDashboardData]);

  // Synchronize URL tab query parameter
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && ['overview', 'listings', 'submit', 'status', 'profile'].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const switchTab = (tabName) => {
    setActiveTab(tabName);
    setSubmitError('');
    setSubmissionSuccess(null);
    if (tabName !== 'edit') {
      setEditingListingId(null);
      setSearchParams({ tab: tabName });
    }
  };

  // --- EMAIL OTP AUTHENTICATION HANDLERS ---
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthErrorTitle('Authentication Error');
    setAuthNotice('');

    const cleanEmail = authEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setAuthError('Business mobile number must be a valid 10-digit Indian mobile number (starting with 6–9).');
      return;
    }

    setAuthLoading(true);
    setAuthPhase('sending');
    try {
      const res = await leadService.sendOtp(cleanEmail);
      setOtpSent(true);
      setAuthOtp('');
      setVerifiedEmailToken('');
      setEmailVerifiedSuccess(false);
      setOtpRemainingSeconds(res?.data?.expiresInSeconds || 300);
      setResendCooldownSeconds(res?.data?.cooldownSeconds || 60);
      setAuthNotice(
        res?.message || `A 6-digit verification OTP has been sent to ${cleanEmail}.`
      );
    } catch (err) {
      const msg = err?.message || 'Unable to send Email OTP right now. Please try again.';
      if (err?.status === 429) {
        setAuthErrorTitle('Resend Cooldown Active');
        const waitMatch = msg.match(/wait\s+(\d+)\s+seconds/i);
        if (waitMatch) {
          setResendCooldownSeconds(parseInt(waitMatch[1], 10));
        }
      } else {
        setAuthErrorTitle('Email Delivery Failed');
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
      setAuthPhase('idle');
    }
  };

  const handleVerifyAndLogin = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthErrorTitle('Verification Error');
    setAuthNotice('');

    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPhone = authPhone.replace(/\D/g, '');
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setAuthError('Business mobile number must be a valid 10-digit Indian mobile number.');
      return;
    }

    const cleanOtp = authOtp.replace(/\D/g, '');
    if (!verifiedEmailToken) {
      if (otpSent && otpRemainingSeconds <= 0) {
        setAuthErrorTitle('Expired OTP');
        setAuthError('Your 6-digit Email OTP has expired. Please request a new OTP.');
        return;
      }
      if (!/^\d{6}$/.test(cleanOtp)) {
        setAuthError('Please enter the 6-digit OTP sent to your email address.');
        return;
      }
    }

    setAuthLoading(true);
    setAuthPhase('verifying');
    try {
      let tokenToUse = verifiedEmailToken;
      if (!tokenToUse) {
        const verifyRes = await leadService.verifyOtp(cleanEmail, cleanOtp);
        tokenToUse = verifyRes?.data?.verificationToken;
        if (!tokenToUse) {
          throw new Error('Email OTP verification did not return a valid session token.');
        }
        setVerifiedEmailToken(tokenToUse);
        setEmailVerifiedSuccess(true);
        setAuthNotice('Email Verified! Signing you in to the Provider Dashboard...');
      }

      await leadService.registerOrLogin({
        email: cleanEmail,
        verificationToken: tokenToUse,
        phone: cleanPhone || undefined,
        name: authName.trim() || undefined,
      });

      await loadDashboardData();
      const targetTab = searchParams.get('tab') || 'overview';
      setActiveTab(targetTab);
    } catch (err) {
      const msg = err?.message || 'OTP verification failed. Please check the code and try again.';
      if (/expired/i.test(msg)) {
        setAuthErrorTitle('Expired OTP');
        setOtpRemainingSeconds(0);
      } else if (/incorrect/i.test(msg)) {
        setAuthErrorTitle('Incorrect OTP');
      } else if (/maximum|attempts/i.test(msg)) {
        setAuthErrorTitle('OTP Locked');
      } else {
        setAuthErrorTitle('Verification Error');
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
      setAuthPhase('idle');
    }
  };

  const handleLogout = async () => {
    await leadService.logoutProvider();
    setAccount(null);
    setListings([]);
    setOtpSent(false);
    setAuthOtp('');
    setAuthNotice('');
    setAuthError('');
    setVerifiedEmailToken('');
    setEmailVerifiedSuccess(false);
    setResendCooldownSeconds(0);
    setOtpRemainingSeconds(0);
    googleAttemptRef.current = null;
    googleNonceErrorRef.current = null;
    setGoogleScriptReady(false);
  };

  // --- GOOGLE OAUTH AUTHENTICATION HANDLERS ---
  const fetchFreshGoogleNonce = useCallback(async () => {
    if (!IS_GOOGLE_CLIENT_CONFIGURED) return null;
    try {
      const res = await leadService.getGoogleNonce();
      if (res?.success && res?.data?.nonce && res?.data?.attemptToken) {
        const issued = {
          nonce: res.data.nonce,
          attemptToken: res.data.attemptToken,
        };
        googleAttemptRef.current = issued;
        googleNonceErrorRef.current = null;
        return issued;
      }
      googleAttemptRef.current = null;
      googleNonceErrorRef.current = {
        status: 500,
        message: res?.message || 'Unable to issue Google sign-in security nonce.',
      };
    } catch (err) {
      googleAttemptRef.current = null;
      googleNonceErrorRef.current = {
        status: typeof err?.status === 'number' ? err.status : 0,
        message: err?.message || 'Unable to connect to the WARERENT authentication server.',
      };
    }
    return null;
  }, []);

  const initializeAndRenderGoogleButton = useCallback(
    async ({ forceNewNonce = false } = {}) => {
      if (!IS_GOOGLE_CLIENT_CONFIGURED || !window.google?.accounts?.id) {
        setGoogleScriptReady(false);
        return { ok: false, reason: 'script_unavailable' };
      }

      const issued =
        (!forceNewNonce && googleAttemptRef.current) || (await fetchFreshGoogleNonce());
      if (!issued?.nonce || !window.google?.accounts?.id) {
        setGoogleScriptReady(false);
        return {
          ok: false,
          reason: 'nonce_failed',
          error: googleNonceErrorRef.current,
        };
      }

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => googleCallbackRef.current?.(resp),
          nonce: issued.nonce,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
        });

        const container = googleButtonContainerRef.current;
        if (!container) {
          setGoogleScriptReady(false);
          return { ok: false, reason: 'container_unmounted' };
        }

        container.innerHTML = '';
        const parentWidth = container.parentElement?.clientWidth || container.offsetWidth || 360;
        const targetWidth = Math.max(240, Math.min(400, Math.floor(parentWidth)));

        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: targetWidth,
        });

        const hasRenderedButton =
          Boolean(container.querySelector('[role="button"], iframe')) ||
          container.childElementCount > 0;
        setGoogleScriptReady(hasRenderedButton);
        return {
          ok: hasRenderedButton,
          reason: hasRenderedButton ? 'ready' : 'render_failed',
        };
      } catch (err) {
        setGoogleScriptReady(false);
        return {
          ok: false,
          reason: 'init_exception',
          error: { status: 0, message: err?.message || 'Failed to initialize Google Identity Services.' },
        };
      }
    },
    [fetchFreshGoogleNonce]
  );

  const handleGoogleCredentialResponse = useCallback(
    async (response) => {
      const idToken = response?.credential;
      if (!idToken) {
        setAuthErrorTitle('Google Sign-In Cancelled');
        setAuthError(
          'Google Sign-In did not return an authentication token. Please try again or continue with Email OTP.'
        );
        return;
      }

      const cleanPhone = authPhone.replace(/\D/g, '');
      if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
        setAuthErrorTitle('Validation Error');
        setAuthError(
          'Business mobile number must be a valid 10-digit Indian mobile number (starting with 6–9).'
        );
        return;
      }

      const activeAttempt = googleAttemptRef.current;
      if (!activeAttempt?.nonce || !activeAttempt?.attemptToken) {
        setAuthErrorTitle('Google Session Expired');
        setAuthError(
          'Your Google sign-in security nonce expired. Please click Continue with Google again.'
        );
        await initializeAndRenderGoogleButton({ forceNewNonce: true });
        return;
      }

      setAuthError('');
      setAuthErrorTitle('Google Authentication Error');
      setAuthNotice('Verifying your Google account...');
      setAuthLoading(true);
      setAuthPhase('google');

      try {
        // Consume the single-use attempt reference immediately in memory
        googleAttemptRef.current = null;
        await leadService.googleLogin({
          idToken,
          nonce: activeAttempt.nonce,
          attemptToken: activeAttempt.attemptToken,
          phone: cleanPhone || undefined,
        });

        await loadDashboardData();
        const targetTab = searchParams.get('tab') || 'overview';
        setActiveTab(targetTab);
      } catch (err) {
        setAuthNotice('');
        const status = err?.status ?? 0;
        const msg =
          err?.message ||
          'Unable to sign in with Google right now. Please try again or continue with Email OTP.';

        if (status === 0) {
          setAuthErrorTitle('Network Connection Error');
        } else if (status === 503) {
          setAuthErrorTitle('Google Sign-In Unavailable');
        } else if (status === 409) {
          setAuthErrorTitle('Account Conflict');
        } else if (status === 429) {
          setAuthErrorTitle('Too Many Attempts');
        } else if (status === 401 && /audience|client/i.test(msg)) {
          setAuthErrorTitle('Google Client ID Mismatch');
        } else if (status === 401 && /nonce|expired/i.test(msg)) {
          setAuthErrorTitle('Google Session Expired');
        } else {
          setAuthErrorTitle('Google Sign-In Failed');
        }
        setAuthError(msg);
        await initializeAndRenderGoogleButton({ forceNewNonce: true });
      } finally {
        setAuthLoading(false);
        setAuthPhase('idle');
      }
    },
    [authPhone, initializeAndRenderGoogleButton, loadDashboardData, searchParams]
  );

  useEffect(() => {
    googleCallbackRef.current = handleGoogleCredentialResponse;
  }, [handleGoogleCredentialResponse]);

  useEffect(() => {
    if (checkingSession || account || !IS_GOOGLE_CLIENT_CONFIGURED) return undefined;
    let cancelled = false;

    const initGoogleIdentity = async () => {
      if (cancelled || !window.google?.accounts?.id) return;
      googleScriptLoadErrorRef.current = false;
      await initializeAndRenderGoogleButton({ forceNewNonce: false });
    };

    if (window.google?.accounts?.id) {
      initGoogleIdentity();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector(`script[src="${GOOGLE_GSI_SCRIPT_SRC}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', initGoogleIdentity);
      return () => {
        cancelled = true;
        existingScript.removeEventListener('load', initGoogleIdentity);
      };
    }

    const script = document.createElement('script');
    script.src = GOOGLE_GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initGoogleIdentity;
    script.onerror = () => {
      googleScriptLoadErrorRef.current = true;
      setGoogleScriptReady(false);
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.onload = null;
    };
  }, [checkingSession, account, initializeAndRenderGoogleButton]);

  const handleFallbackGoogleClick = async () => {
    setAuthError('');
    setAuthNotice('');

    if (!IS_GOOGLE_CLIENT_CONFIGURED) {
      setAuthErrorTitle('Google Sign-In Configuration Error');
      setAuthError(
        'Google Sign-In is not configured for this frontend deployment (VITE_GOOGLE_CLIENT_ID is missing or invalid). Please continue with Email OTP below.'
      );
      return;
    }

    if (!window.google?.accounts?.id) {
      setAuthErrorTitle(
        googleScriptLoadErrorRef.current
          ? 'Google Sign-In Script Blocked'
          : 'Google Sign-In Script Unavailable'
      );
      setAuthError(
        'Google Identity Services (https://accounts.google.com/gsi/client) could not be loaded. Please check your network connection, Content-Security-Policy headers, or browser ad/privacy blocker, or continue with Email OTP below.'
      );
      return;
    }

    const initResult = await initializeAndRenderGoogleButton({
      forceNewNonce: !googleAttemptRef.current,
    });

    if (!initResult.ok) {
      if (initResult.reason === 'nonce_failed') {
        const described = describeGoogleNonceFailure(initResult.error);
        setAuthErrorTitle(described.title);
        setAuthError(described.message);
        return;
      }
      setAuthErrorTitle('Google Sign-In Initialization Error');
      setAuthError(
        initResult.error?.message ||
          'Unable to initialize Google Identity Services in this browser. Please continue with Email OTP below.'
      );
      return;
    }

    const hasRenderedButton = Boolean(
      googleButtonContainerRef.current?.querySelector('[role="button"], iframe')
    );
    window.google.accounts.id.prompt((notification) => {
      const promptIssue = describeGooglePromptNotification(notification, hasRenderedButton);
      if (promptIssue) {
        setAuthErrorTitle(promptIssue.title);
        setAuthError(promptIssue.message);
      }
    });
  };

  // --- LISTING FORM HANDLERS ---
  const startNewListing = () => {
    setEditingListingId(null);
    setSubmissionSuccess(null);
    setSubmitError('');
    setErrors({});
    setShopImageFile(null);
    setShopImagePreview(null);
    setFormData({
      ...EMPTY_FORM,
      contactPerson: account?.name || '',
      phone: account?.phone || '',
      email: account?.email || '',
    });
    switchTab('submit');
  };

  const startEditListing = (item) => {
    setEditingListingId(item.listingId || item.applicationId || item.id);
    setSubmissionSuccess(null);
    setSubmitError('');
    setErrors({});
    setShopImageFile(null);
    setShopImagePreview(item.shopImage?.url || null);

    const catValue =
      item.categorySlug === 'other' || item.category === 'Other'
        ? 'other'
        : item.categorySlug || item.category || '';

    setFormData({
      businessName: item.businessName || '',
      contactPerson: item.contactPerson || account?.name || '',
      phone: item.phone || account?.phone || '',
      email: item.email || account?.email || '',
      category: catValue,
      customCategoryName: item.customCategoryName || item.customCategoryRequest?.requestedName || '',
      servicesOffered: Array.isArray(item.servicesOffered)
        ? item.servicesOffered.join(', ')
        : item.servicesOffered || '',
      city: item.city || '',
      state: item.state || '',
      address: item.address || '',
      pinCode: item.pinCode || '',
      serviceAreas: Array.isArray(item.serviceAreas)
        ? item.serviceAreas.join(', ')
        : item.serviceAreas || '',
      website: item.website || '',
      businessDescription: item.businessDescription || item.description || '',
      consentToContact: true,
      consentToDisplayPhone: item.consentToDisplayPhone !== false,
    });
    setActiveTab('edit');
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        shopImage: 'Only JPEG, PNG, and WebP images are allowed.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        shopImage: 'Image size exceeds 5MB. Please select a smaller photograph.',
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.shopImage;
      return next;
    });

    setShopImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setShopImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setShopImageFile(null);
    setShopImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateListingForm = () => {
    const errs = {};
    if (!formData.businessName.trim() || formData.businessName.trim().length < 2) {
      errs.businessName = 'Business or property name is required (min 2 characters).';
    }
    if (!formData.contactPerson.trim() || formData.contactPerson.trim().length < 2) {
      errs.contactPerson = 'Contact person name is required.';
    }
    const cleanListingPhone = (account?.phoneVerified ? account.phone : formData.phone || '').replace(
      /\D/g,
      ''
    );
    if (!/^[6-9]\d{9}$/.test(cleanListingPhone)) {
      errs.phone = 'A valid 10-digit Indian business mobile number is required.';
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address or leave it blank.';
    }
    if (!formData.category.trim()) {
      errs.category = 'Please select a property/business category.';
    }
    if (
      formData.category === 'other' &&
      (!formData.customCategoryName.trim() || formData.customCategoryName.trim().length < 2)
    ) {
      errs.customCategoryName = 'Please specify the requested custom category name.';
    }
    if (!formData.servicesOffered.trim()) {
      errs.servicesOffered = 'Please list at least one service or facility offered.';
    }
    if (!formData.city.trim()) {
      errs.city = 'City is required.';
    }
    if (!formData.state.trim()) {
      errs.state = 'State is required.';
    }
    if (!formData.address.trim()) {
      errs.address = 'Property/business address is required.';
    }
    if (!formData.pinCode.trim() || !/^\d{6}$/.test(formData.pinCode.trim())) {
      errs.pinCode = 'Valid 6-digit Indian PIN code is required.';
    }
    if (
      formData.website.trim() &&
      !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(formData.website.trim())
    ) {
      errs.website = 'Website must be a valid URL starting with http:// or https://';
    }
    if (!formData.businessDescription.trim() || formData.businessDescription.trim().length < 15) {
      errs.businessDescription = 'Please provide a description of at least 15 characters.';
    }
    if (!formData.consentToContact) {
      errs.consentToContact = 'Please confirm that you are the authorized owner/representative.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleListingSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateListingForm()) return;

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      const listingPhone = account?.phoneVerified
        ? account.phone
        : formData.phone.replace(/\D/g, '');
      payload.append('businessName', formData.businessName.trim());
      payload.append('contactPerson', formData.contactPerson.trim());
      payload.append('phone', listingPhone);
      payload.append('email', formData.email.trim() || account?.email || '');
      payload.append('category', formData.category.trim());
      if (formData.category === 'other') {
        payload.append('customCategoryName', formData.customCategoryName.trim());
      }
      payload.append('servicesOffered', formData.servicesOffered.trim());
      payload.append('city', formData.city.trim());
      payload.append('state', formData.state.trim());
      payload.append('address', formData.address.trim());
      payload.append('pinCode', formData.pinCode.trim());
      payload.append('serviceAreas', formData.serviceAreas.trim() || formData.city.trim());
      payload.append('website', formData.website.trim());
      payload.append('businessDescription', formData.businessDescription.trim());
      payload.append('consentToContact', formData.consentToContact ? 'true' : 'false');
      payload.append('consentToDisplayPhone', formData.consentToDisplayPhone ? 'true' : 'false');

      if (shopImageFile) {
        payload.append('shopImage', shopImageFile);
      }

      let response;
      if (editingListingId) {
        response = await leadService.updateOwnListing(editingListingId, payload);
      } else {
        response = await leadService.submitListing(payload);
      }

      if (response?.success) {
        await loadDashboardData();
        setSubmissionSuccess({
          isEdit: Boolean(editingListingId),
          referenceId: response.data?.referenceId || 'WSH-SUBMITTED',
          businessName: formData.businessName.trim(),
          city: formData.city.trim(),
          message:
            response.message ||
            'Your listing has been submitted and is now pending administrator review.',
        });
        setEditingListingId(null);
      } else {
        setSubmitError(response?.message || 'Unable to save listing. Please try again.');
      }
    } catch (err) {
      setSubmitError(err.message || 'Unable to submit listing. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- PROFILE UPDATE HANDLER ---
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMessage('');
    setProfileError('');
    const cleanPhone = (profileForm.phone || '').replace(/\D/g, '');
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setProfileError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setProfileSaving(true);
    try {
      const payload = {
        name: profileForm.name.trim(),
      };
      if (!account?.phoneVerified && cleanPhone) {
        payload.phone = cleanPhone;
      }
      const res = await leadService.updateProviderProfile(payload);
      if (res?.success) {
        setProfileMessage('Account profile updated successfully.');
        await loadDashboardData();
      }
    } catch (err) {
      setProfileError(err.message || 'Unable to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="bg-[#F7F8FA] min-h-[70vh] flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-3 border-[#F36B21] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs sm:text-sm text-slate-600 font-semibold">
          Loading WARERENT Provider Portal...
        </p>
      </div>
    );
  }

  // ============================================================================
  // UNAUTHENTICATED VIEW: EMAIL OTP REGISTRATION & LOGIN
  // ============================================================================
  if (!account) {
    const formatCountdown = (totalSeconds) => {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}:${String(secs).padStart(2, '0')}`;
    };
    const isOtpExpired = otpSent && otpRemainingSeconds <= 0 && !verifiedEmailToken;

    return (
      <div className="bg-[#F7F8FA] min-h-screen pb-16">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
            <Breadcrumb items={[{ label: 'Provider Portal' }]} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Column: Value Proposition & Visual Showcase */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF5EF] border border-[#FFE6D5] text-[#D95513] text-xs font-extrabold uppercase tracking-wider mb-3">
                  <ShieldCheck className="w-4 h-4 text-[#F36B21]" />
                  <span>Provider Portal & Email OTP Authentication</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight leading-tight">
                  List Your Commercial Property or Business on WARERENT
                </h1>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
                  Register or sign in with your email address via Email OTP. Once
                  authenticated, you can submit new listings for{' '}
                  <strong className="text-slate-900">
                    Shops, Offices, Warehouses, and Godowns
                  </strong>
                  , track approval status, and manage your published profiles.
                </p>
              </div>

              {/* Supported Categories Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Shop', sub: 'Retail & Showrooms', icon: Store },
                  { name: 'Office', sub: 'Business Suites', icon: Briefcase },
                  { name: 'Warehouse', sub: 'Logistics Hubs', icon: WarehouseIcon },
                  { name: 'Godown', sub: 'Bulk Storage', icon: Package },
                ].map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.name}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FFF5EF] text-[#F36B21] flex items-center justify-center mb-2">
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-extrabold text-slate-950">{cat.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{cat.sub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Why List Card */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="relative h-36 bg-slate-900 overflow-hidden">
                  <img
                    src={heroCommercialImg}
                    alt="WARERENT Commercial Properties"
                    loading="lazy"
                    className="w-full h-full object-cover opacity-55"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                  <div className="absolute bottom-3.5 left-5 right-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F36B21]">
                        Direct Commercial Discovery
                      </span>
                      <h2 className="text-sm sm:text-base font-black text-white">
                        Why Property Owners Choose WARERENT
                      </h2>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-white/10 backdrop-blur-xs text-[11px] font-bold text-white border border-white/15">
                      Zero Commission
                    </span>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-900">Direct Customer Calls:</strong>{' '}
                        Interested commercial buyers and tenants call you directly on your business
                        phone number without middlemen.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-900">Email-Verified Ownership:</strong> Your
                        provider portal account is protected with single-use Email OTP verification
                        and administrator listing review.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-900">Full Lifecycle Control:</strong> Track
                        pending applications, view moderation feedback, and update published
                        listings anytime.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column: Email OTP Login / Registration Card */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-card">
                {/* Step Indicator */}
                <div className="flex items-center gap-2 pb-5 mb-6 border-b border-slate-100">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
                      !otpSent
                        ? 'bg-[#FFF5EF] text-[#D95513] border border-[#FFE6D5]'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>1. Email Address</span>
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
                      emailVerifiedSuccess
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : otpSent
                        ? 'bg-[#FFF5EF] text-[#D95513] border border-[#FFE6D5]'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{emailVerifiedSuccess ? '2. Email Verified' : '2. Verify Email OTP'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <span className="w-11 h-11 rounded-xl bg-[#FFF5EF] border border-[#FFE6D5] text-[#F36B21] flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Provider Sign In / Register
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Continue with Google or verify your email address using Email OTP
                    </p>
                  </div>
                </div>

                {authError && (
                  <Alert
                    type="error"
                    title={authErrorTitle}
                    message={authError}
                    className="mt-4"
                  />
                )}
                {authNotice && (
                  <div className="mt-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{authNotice}</span>
                  </div>
                )}

                {/* Option 1: Continue with Google */}
                <div className="mt-6">
                  <div className="relative w-full">
                    {IS_GOOGLE_CLIENT_CONFIGURED && (
                      <div
                        ref={googleButtonContainerRef}
                        data-testid="google-gsi-button-container"
                        className={
                          googleScriptReady && !authLoading
                            ? 'flex items-center justify-center w-full min-h-[44px]'
                            : 'hidden'
                        }
                      />
                    )}
                    <button
                      type="button"
                      id="provider-google-signin-btn"
                      disabled={authLoading}
                      onClick={handleFallbackGoogleClick}
                      className={
                        googleScriptReady && !authLoading
                          ? 'hidden'
                          : 'w-full py-3 px-5 rounded-lg bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 border border-slate-300 text-slate-800 text-sm font-bold flex items-center justify-center gap-3 shadow-2xs transition-colors cursor-pointer'
                      }
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                        />
                      </svg>
                      <span>
                        {authPhase === 'google'
                          ? 'Signing in with Google...'
                          : 'Continue with Google'}
                      </span>
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500 text-center">
                    Instant sign-in with your verified Google account — no separate Email OTP required
                  </p>
                </div>

                {/* Auth Option Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Or Continue with Email OTP
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <form
                  onSubmit={otpSent ? handleVerifyAndLogin : handleSendOtp}
                  className="space-y-5"
                >
                  <div>
                    <label
                      htmlFor="provider-auth-email"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="provider-auth-email"
                      type="email"
                      value={authEmail}
                      disabled={otpSent && authLoading}
                      onChange={(e) => {
                        setAuthEmail(e.target.value);
                        if (otpSent) {
                          setOtpSent(false);
                          setAuthOtp('');
                          setVerifiedEmailToken('');
                          setEmailVerifiedSuccess(false);
                          setOtpRemainingSeconds(0);
                        }
                      }}
                      placeholder="owner@business.com"
                      className="w-full px-3.5 py-3 text-sm sm:text-base font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:ring-2 focus:ring-[#F36B21]/15 focus:bg-white transition-all"
                      required
                    />
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      We will send a 6-digit verification code to this email address.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="provider-auth-phone"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Business Mobile Number (Optional for Returning Providers)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-sm font-extrabold text-slate-500 select-none">
                        +91
                      </span>
                      <input
                        id="provider-auth-phone"
                        type="tel"
                        maxLength={10}
                        value={authPhone}
                        disabled={authLoading}
                        onChange={(e) => {
                          setAuthPhone(e.target.value.replace(/\D/g, ''));
                        }}
                        placeholder="98XXXXXXXX"
                        className="w-full pl-12 pr-4 py-3 text-sm sm:text-base font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:ring-2 focus:ring-[#F36B21]/15 focus:bg-white transition-all"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Used for direct customer calls on your published listings. You can also enter
                      or update this inside your listing form.
                    </p>
                  </div>

                  {!otpSent ? (
                    <>
                      <div>
                        <label
                          htmlFor="provider-auth-name"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                        >
                          Your Name (Optional for Returning Providers)
                        </label>
                        <input
                          id="provider-auth-name"
                          type="text"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          placeholder="e.g. Rajesh Sharma"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:ring-2 focus:ring-[#F36B21]/15 focus:bg-white transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading || resendCooldownSeconds > 0}
                        className="w-full py-3.5 px-6 rounded-lg bg-[#F36B21] hover:bg-[#D95513] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <span>
                          {authPhase === 'sending'
                            ? 'Sending OTP via Email...'
                            : resendCooldownSeconds > 0
                            ? `Wait ${resendCooldownSeconds}s to Request OTP`
                            : 'Request Email OTP'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="provider-auth-otp"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                          >
                            Enter 6-Digit Email OTP <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-3">
                            {!verifiedEmailToken && (
                              <span
                                className={`text-[11px] font-bold ${
                                  isOtpExpired ? 'text-rose-600' : 'text-slate-500'
                                }`}
                              >
                                {isOtpExpired
                                  ? 'Code expired'
                                  : `Expires in ${formatCountdown(otpRemainingSeconds)}`}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setOtpSent(false);
                                setAuthOtp('');
                                setAuthNotice('');
                                setAuthError('');
                                setVerifiedEmailToken('');
                                setEmailVerifiedSuccess(false);
                                setOtpRemainingSeconds(0);
                              }}
                              className="text-[11px] font-bold text-[#F36B21] hover:underline cursor-pointer"
                            >
                              Change Email
                            </button>
                          </div>
                        </div>
                        <input
                          id="provider-auth-otp"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={authOtp}
                          disabled={Boolean(verifiedEmailToken)}
                          onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••••"
                          className="w-full px-4 py-3 text-center tracking-[0.45em] text-lg font-black bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:ring-2 focus:ring-[#F36B21]/15 focus:bg-white disabled:opacity-60"
                          required={!verifiedEmailToken}
                        />
                        {isOtpExpired && (
                          <p className="mt-1.5 text-xs font-semibold text-rose-600">
                            This verification code has expired. Please request a new Email OTP.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="submit"
                          disabled={authLoading || isOtpExpired}
                          className="flex-1 py-3.5 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                        >
                          <span>
                            {authPhase === 'verifying'
                              ? 'Verifying Email OTP...'
                              : verifiedEmailToken
                              ? 'Email Verified — Complete Sign In'
                              : 'Verify Email OTP & Enter Dashboard'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={authLoading || resendCooldownSeconds > 0}
                          onClick={handleSendOtp}
                          className="py-3 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          {resendCooldownSeconds > 0
                            ? `Resend OTP (${resendCooldownSeconds}s)`
                            : 'Resend OTP'}
                        </button>
                      </div>
                    </>
                  )}
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Looking for commercial spaces instead?</span>
                  <Link
                    to="/providers"
                    className="font-bold text-[#F36B21] hover:text-[#D95513] inline-flex items-center gap-1"
                  >
                    <span>Browse Directory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED VIEW: PROVIDER PORTAL DASHBOARD
  // ============================================================================
  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'listings', label: `My Listings (${listings.length})`, icon: Building2 },
    { id: 'submit', label: 'Add New Listing', icon: PlusCircle },
    { id: 'status', label: 'Application Status', icon: FileCheck2 },
    { id: 'profile', label: 'Account Profile', icon: User },
  ];

  return (
    <div className="bg-[#F7F8FA] min-h-screen pb-16">
      {/* Top Portal Bar */}
      <div className="bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {account.emailVerified
                  ? `Email Verified (${account.email})`
                  : `Authenticated Provider (+91 ${account.phone})`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {account.name ? `Welcome, ${account.name}` : 'WARERENT Provider Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={startNewListing}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Listing</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Suspension Notice if Account is Suspended */}
      {account.status === 'SUSPENDED' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <strong className="font-bold block">Provider Account Suspended</strong>
              Your provider account and listings are currently suspended.
              {account.suspensionReason ? ` Reason: ${account.suspensionReason}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Main Portal Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-1">
              <div className="px-3.5 py-2.5 mb-1 border-b border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                  {account.emailVerified ? 'Email Verified Account' : 'Verified Provider Account'}
                </span>
                <span className="text-xs font-extrabold text-slate-900 block mt-0.5 truncate">
                  {account.email || (account.phone ? `+91 ${account.phone}` : 'Provider Account')}
                </span>
                {account.email && account.phone && (
                  <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                    +91 {account.phone}
                  </span>
                )}
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeTab === item.id || (activeTab === 'edit' && item.id === 'listings');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => (item.id === 'submit' ? startNewListing() : switchTab(item.id))}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#FFF5EF] text-[#D95513] border border-[#FFE6D5]'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#F36B21]' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-2 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Tab Content */}
          <div className="lg:col-span-9">
            {/* TAB 1: DASHBOARD OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Total Listings
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-950 mt-1">
                      {stats.total}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      All submitted properties
                    </span>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
                      Published Live
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                      {stats.published}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Visible in directory
                    </span>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">
                      Pending Review
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
                      {stats.submitted}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Awaiting moderation
                    </span>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                      Approved
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                      {stats.approved}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Verified by admin
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-950">
                        Your Recent Commercial Listings
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage your properties and monitor administrator review status.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={loadDashboardData}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 hover:text-[#F36B21] cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {listings.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2.5" />
                      <h3 className="text-sm font-bold text-slate-900">
                        You haven’t submitted any listings yet
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 mb-5 max-w-md mx-auto">
                        Submit your first Shop, Office, Warehouse, or Godown listing for review.
                      </p>
                      <button
                        type="button"
                        onClick={startNewListing}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Submit First Listing</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {listings.slice(0, 5).map((item) => {
                        const badge = STATUS_BADGES[item.status] || STATUS_BADGES.SUBMITTED;
                        const hasOwnerPhoto = Boolean(item.shopImage?.url);
                        const thumbUrl = hasOwnerPhoto
                          ? item.shopImage.url
                          : getCategoryVisual(item.categorySlug || item.category);
                        return (
                          <div
                            key={item.id}
                            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                          >
                            <div className="flex items-start gap-3.5">
                              <img
                                src={thumbUrl}
                                alt={item.businessName}
                                loading="lazy"
                                className="w-16 h-14 rounded-lg object-cover border border-slate-200 shrink-0 hidden sm:block"
                              />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                                    {item.businessName}
                                  </h3>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.classes}`}
                                  >
                                    {badge.label}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  <span className="font-semibold text-slate-700">
                                    {item.category}
                                  </span>{' '}
                                  • {item.city}
                                  {item.referenceId ? ` • Ref: ${item.referenceId}` : ''}
                                </p>
                                {item.rejectionReason && (
                                  <p className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                                    <strong>Rejection Reason:</strong> {item.rejectionReason}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.status === 'PUBLISHED' && item.slug && (
                                <Link
                                  to={`/providers/${item.slug}`}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  <span>View Live</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}
                              {item.status !== 'SUSPENDED' && (
                                <button
                                  type="button"
                                  onClick={() => startEditListing(item)}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#FFF5EF] text-[#D95513] border border-[#FFE6D5] hover:bg-[#FFE6D5]/60 text-xs font-bold cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MY LISTINGS */}
            {activeTab === 'listings' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-950">
                      My Commercial Listings
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      View and edit your submitted, approved, and published listings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startNewListing}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add New Listing</span>
                  </button>
                </div>

                {listings.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800 mb-2">No listings found</p>
                    <button
                      type="button"
                      onClick={startNewListing}
                      className="px-4 py-2 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold cursor-pointer"
                    >
                      Add Your First Listing
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listings.map((item) => {
                      const badge = STATUS_BADGES[item.status] || STATUS_BADGES.SUBMITTED;
                      const hasOwnerPhoto = Boolean(item.shopImage?.url);
                      const thumbUrl = hasOwnerPhoto
                        ? item.shopImage.url
                        : getCategoryVisual(item.categorySlug || item.category);
                      return (
                        <div
                          key={item.id}
                          className="p-5 rounded-xl border border-slate-200 hover:border-slate-300 flex flex-col md:flex-row justify-between gap-5 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 min-w-0">
                            <div className="relative w-full sm:w-36 h-28 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                              <img
                                src={thumbUrl}
                                alt={item.businessName}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[9px] font-bold">
                                {hasOwnerPhoto ? 'Owner Photo' : 'Category Visual'}
                              </span>
                            </div>

                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#D95513] bg-[#FFF5EF] border border-[#FFE6D5] px-2.5 py-0.5 rounded">
                                  {item.category}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.classes}`}
                                >
                                  {badge.label}
                                </span>
                                {item.referenceId && (
                                  <span className="text-xs font-mono text-slate-400">
                                    {item.referenceId}
                                  </span>
                                )}
                              </div>

                              <h3 className="text-lg font-extrabold text-slate-900">
                                {item.businessName}
                              </h3>
                              <p className="text-xs text-slate-600 line-clamp-2">
                                {item.description}
                              </p>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#F36B21] shrink-0" />
                                <span className="truncate">
                                  {[item.address, item.city, item.state, item.pinCode]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              </p>

                              {item.customCategoryRequest && (
                                <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg inline-block">
                                  Custom Category Request (
                                  {item.customCategoryRequest.requestedName}):{' '}
                                  <strong>{item.customCategoryRequest.status}</strong>
                                </p>
                              )}

                              {item.rejectionReason && (
                                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                                  <strong>Administrator Rejection Note:</strong>{' '}
                                  {item.rejectionReason}
                                </div>
                              )}

                              {item.suspensionReason && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                                  <strong>Suspension Note:</strong> {item.suspensionReason}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex md:flex-col justify-end gap-2 shrink-0">
                            {item.status === 'PUBLISHED' && item.slug && (
                              <Link
                                to={`/providers/${item.slug}`}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800"
                              >
                                <span>Public Profile</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            {item.status !== 'SUSPENDED' && (
                              <button
                                type="button"
                                onClick={() => startEditListing(item)}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Listing</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ADD / EDIT LISTING FORM */}
            {(activeTab === 'submit' || activeTab === 'edit') && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                {submissionSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-950 mb-2">
                      {submissionSuccess.isEdit
                        ? 'Listing Updated & Sent for Review'
                        : 'Listing Application Submitted'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mb-6">
                      {submissionSuccess.message}
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2 mb-6">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Reference ID:</span>
                        <span className="font-mono font-bold text-[#F36B21]">
                          {submissionSuccess.referenceId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Business / Property:</span>
                        <span className="font-bold text-slate-900">
                          {submissionSuccess.businessName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Lifecycle Status:</span>
                        <span className="font-bold text-amber-700">SUBMITTED (Pending Review)</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => switchTab('listings')}
                        className="px-5 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold cursor-pointer"
                      >
                        View My Listings
                      </button>
                      <button
                        type="button"
                        onClick={startNewListing}
                        className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        Add Another Listing
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 pb-4 border-b border-slate-100">
                      <h2 className="text-xl font-black text-slate-950">
                        {editingListingId
                          ? 'Edit Commercial Listing'
                          : 'Add New Commercial Listing'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {editingListingId
                          ? 'Updating a listing submits the changes for administrator verification before appearing publicly.'
                          : 'Complete the form below to submit your Shop, Office, Warehouse, or Godown for administrator review.'}
                      </p>
                    </div>

                    {submitError && (
                      <Alert
                        type="error"
                        title="Submission Error"
                        message={submitError}
                        className="mb-6"
                      />
                    )}

                    <form onSubmit={handleListingSubmit} className="space-y-6" noValidate>
                      {/* Section 1: Property & Category */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <label
                            htmlFor="listing-businessName"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            Business / Property Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="listing-businessName"
                            name="businessName"
                            type="text"
                            value={formData.businessName}
                            onChange={handleFormChange}
                            placeholder="e.g. Apex Industrial Warehouse & Logistics Park"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                          {errors.businessName && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {errors.businessName}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="listing-category"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            Category <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="listing-category"
                            name="category"
                            value={formData.category}
                            onChange={handleFormChange}
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white cursor-pointer"
                          >
                            <option value="">Select Category</option>
                            {availableCategories.map((c) => (
                              <option key={c._id || c.slug} value={c.slug}>
                                {c.name}
                              </option>
                            ))}
                            <option value="other">Other — Request Custom Category</option>
                          </select>
                          {errors.category && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {errors.category}
                            </p>
                          )}
                        </div>

                        {formData.category === 'other' && (
                          <div>
                            <label
                              htmlFor="listing-customCategoryName"
                              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                            >
                              Requested Custom Category <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="listing-customCategoryName"
                              name="customCategoryName"
                              type="text"
                              value={formData.customCategoryName}
                              onChange={handleFormChange}
                              placeholder="e.g. Cold Storage Facility"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                            />
                            {errors.customCategoryName && (
                              <p className="mt-1 text-xs font-medium text-red-600">
                                {errors.customCategoryName}
                              </p>
                            )}
                          </div>
                        )}

                        <div className={formData.category === 'other' ? 'sm:col-span-2' : ''}>
                          <label
                            htmlFor="listing-servicesOffered"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            Services / Facilities Offered <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="listing-servicesOffered"
                            name="servicesOffered"
                            type="text"
                            value={formData.servicesOffered}
                            onChange={handleFormChange}
                            placeholder="e.g. Retail Frontage, Loading Dock, 24x7 Security"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                          {errors.servicesOffered && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {errors.servicesOffered}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label
                          htmlFor="listing-businessDescription"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                        >
                          Property / Business Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="listing-businessDescription"
                          name="businessDescription"
                          rows={4}
                          value={formData.businessDescription}
                          onChange={handleFormChange}
                          placeholder="Describe the commercial property or business, access roads, suitability, and key highlights..."
                          className="w-full p-3.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                        />
                        {errors.businessDescription && (
                          <p className="mt-1 text-xs font-medium text-red-600">
                            {errors.businessDescription}
                          </p>
                        )}
                      </div>

                      {/* Contact Person, Locked Verified Phone, Optional Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                          <label
                            htmlFor="listing-contactPerson"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            Contact Person <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="listing-contactPerson"
                            name="contactPerson"
                            type="text"
                            value={formData.contactPerson}
                            onChange={handleFormChange}
                            placeholder="Full Name"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                          {errors.contactPerson && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {errors.contactPerson}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="listing-phone"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            {account.phoneVerified ? (
                              'Verified Mobile (Locked)'
                            ) : (
                              <>
                                Business Mobile Number <span className="text-red-500">*</span>
                              </>
                            )}
                          </label>
                          {account.phoneVerified ? (
                            <div className="w-full px-3.5 py-2.5 text-sm bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-bold flex items-center justify-between">
                              <span>+91 {account.phone}</span>
                              <Lock className="w-3.5 h-3.5 text-emerald-700" />
                            </div>
                          ) : (
                            <>
                              <div className="relative flex items-center">
                                <span className="absolute left-3.5 text-sm font-extrabold text-slate-500 select-none">
                                  +91
                                </span>
                                <input
                                  id="listing-phone"
                                  name="phone"
                                  type="tel"
                                  maxLength={10}
                                  value={formData.phone}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '');
                                    setFormData((prev) => ({ ...prev, phone: digits }));
                                    if (errors.phone) {
                                      setErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.phone;
                                        return next;
                                      });
                                    }
                                  }}
                                  placeholder="98XXXXXXXX"
                                  className="w-full pl-12 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-[#F36B21] focus:bg-white"
                                />
                              </div>
                              {errors.phone && (
                                <p className="mt-1 text-xs font-medium text-red-600">
                                  {errors.phone}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="listing-email"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            Email (Optional)
                          </label>
                          <input
                            id="listing-email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleFormChange}
                            placeholder="owner@business.com"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs font-medium text-red-600">{errors.email}</p>
                          )}
                        </div>
                      </div>

                      {/* Address, City, State, PIN, Website */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div className="sm:col-span-3">
                          <label
                            htmlFor="listing-address"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            Street Address / Landmark <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="listing-address"
                            name="address"
                            type="text"
                            value={formData.address}
                            onChange={handleFormChange}
                            placeholder="Plot / Shop No., Industrial Area or Commercial Complex"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                          {errors.address && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {errors.address}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="listing-city"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="listing-city"
                            name="city"
                            type="text"
                            value={formData.city}
                            onChange={handleFormChange}
                            placeholder="e.g. Mumbai"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                          {errors.city && (
                            <p className="mt-1 text-xs font-medium text-red-600">{errors.city}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="listing-state"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            State <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="listing-state"
                            name="state"
                            type="text"
                            value={formData.state}
                            onChange={handleFormChange}
                            placeholder="e.g. Maharashtra"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                          {errors.state && (
                            <p className="mt-1 text-xs font-medium text-red-600">{errors.state}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="listing-pinCode"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            PIN Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="listing-pinCode"
                            name="pinCode"
                            type="text"
                            maxLength={6}
                            value={formData.pinCode}
                            onChange={handleFormChange}
                            placeholder="400001"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                          {errors.pinCode && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {errors.pinCode}
                            </p>
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="listing-website"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            Website URL (Optional)
                          </label>
                          <input
                            id="listing-website"
                            name="website"
                            type="url"
                            value={formData.website}
                            onChange={handleFormChange}
                            placeholder="https://www.yourbusiness.in"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                          {errors.website && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {errors.website}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="listing-serviceAreas"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                          >
                            Nearby Localities
                          </label>
                          <input
                            id="listing-serviceAreas"
                            name="serviceAreas"
                            type="text"
                            value={formData.serviceAreas}
                            onChange={handleFormChange}
                            placeholder="Andheri, Bhiwandi, Navi Mumbai"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Image Upload */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Property / Business Photograph (JPEG, PNG, WebP — Max 5MB)
                        </label>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50 text-center">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                          />
                          {shopImagePreview ? (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                              <div className="relative">
                                <img
                                  src={shopImagePreview}
                                  alt="Preview"
                                  className="w-40 h-28 object-cover rounded-lg border border-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={handleRemoveImage}
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-bold text-[#F36B21] hover:underline cursor-pointer"
                              >
                                Choose a different photo
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex flex-col items-center gap-1.5 cursor-pointer py-2"
                            >
                              <Upload className="w-6 h-6 text-[#F36B21]" />
                              <span className="text-xs font-bold text-[#F36B21]">
                                Click to upload property or business image
                              </span>
                              <span className="text-[11px] text-slate-500">
                                If no photo is uploaded, a clearly labeled category illustration
                                will be shown.
                              </span>
                            </button>
                          )}
                        </div>
                        {errors.shopImage && (
                          <p className="mt-1 text-xs font-medium text-red-600">
                            {errors.shopImage}
                          </p>
                        )}
                      </div>

                      {/* Consents */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            name="consentToDisplayPhone"
                            checked={formData.consentToDisplayPhone}
                            onChange={handleFormChange}
                            className="mt-0.5 rounded border-slate-300 text-[#F36B21] focus:ring-[#F36B21]"
                          />
                          <span className="text-slate-700">
                            <strong className="text-slate-900">
                              Display my{' '}
                              {account.phoneVerified ? 'verified' : 'business'} phone number
                              {formData.phone || account.phone
                                ? ` (+91 ${formData.phone || account.phone})`
                                : ''}{' '}
                              publicly
                            </strong>{' '}
                            on this listing once approved and published so customers can call me
                            directly.
                          </span>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            name="consentToContact"
                            checked={formData.consentToContact}
                            onChange={handleFormChange}
                            className="mt-0.5 rounded border-slate-300 text-[#F36B21] focus:ring-[#F36B21]"
                          />
                          <span className="text-slate-700">
                            I confirm that I am the authorized owner or representative of this
                            property/business and the details submitted are accurate.
                          </span>
                        </label>
                        {errors.consentToContact && (
                          <p className="text-xs font-medium text-red-600">
                            {errors.consentToContact}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        {editingListingId && (
                          <button
                            type="button"
                            onClick={() => switchTab('listings')}
                            className="px-5 py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-6 py-3 rounded-lg bg-[#F36B21] hover:bg-[#D95513] disabled:opacity-60 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          <span>
                            {isSubmitting
                              ? 'Submitting...'
                              : editingListingId
                                ? 'Save Changes & Submit for Review'
                                : 'Submit Listing for Review'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* TAB 4: APPLICATION STATUS */}
            {activeTab === 'status' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="mb-6 pb-4 border-b border-slate-100">
                  <h2 className="text-xl font-extrabold text-slate-950 mb-1">
                    Application & Review Status
                  </h2>
                  <p className="text-xs text-slate-500">
                    Track every listing application through WARERENT’s verification lifecycle (
                    SUBMITTED → APPROVED → PUBLISHED).
                  </p>
                </div>

                {listings.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">
                    No applications submitted yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {listings.map((item) => {
                      const badge = STATUS_BADGES[item.status] || STATUS_BADGES.SUBMITTED;
                      const stepIndex =
                        item.status === 'PUBLISHED'
                          ? 3
                          : item.status === 'APPROVED'
                            ? 2
                            : item.status === 'SUBMITTED'
                              ? 1
                              : 0;
                      return (
                        <div
                          key={item.id}
                          className="p-5 rounded-xl border border-slate-200 space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-mono text-slate-400 block">
                                Reference: {item.referenceId || item.applicationId}
                              </span>
                              <h3 className="text-base font-extrabold text-slate-900">
                                {item.businessName} ({item.category})
                              </h3>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.classes}`}
                            >
                              {item.status}: {badge.label}
                            </span>
                          </div>

                          {/* Visual Step Tracker for standard pipeline */}
                          {stepIndex > 0 && (
                            <div className="grid grid-cols-3 gap-2 pt-1">
                              {[
                                { step: 1, label: '1. Submitted' },
                                { step: 2, label: '2. Approved' },
                                { step: 3, label: '3. Published Live' },
                              ].map((st) => (
                                <div
                                  key={st.step}
                                  className={`px-3 py-2 rounded-lg text-center text-xs font-bold border ${
                                    stepIndex >= st.step
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : 'bg-slate-50 border-slate-200 text-slate-400'
                                  }`}
                                >
                                  {st.label}
                                </div>
                              ))}
                            </div>
                          )}

                          {item.rejectionReason && (
                            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                              <strong>Reason for Rejection:</strong> {item.rejectionReason}
                            </div>
                          )}

                          {item.suspensionReason && (
                            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                              <strong>Reason for Suspension:</strong> {item.suspensionReason}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Submitted: {new Date(item.createdAt).toLocaleDateString('en-IN')}
                            </span>
                            {item.status !== 'SUSPENDED' && (
                              <button
                                type="button"
                                onClick={() => startEditListing(item)}
                                className="font-bold text-[#F36B21] hover:underline cursor-pointer"
                              >
                                Edit & Resubmit →
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: ACCOUNT PROFILE */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <div className="mb-6 pb-4 border-b border-slate-100">
                  <h2 className="text-xl font-extrabold text-slate-950 mb-1">
                    Provider Account Profile
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your email address is verified via Email OTP and bound to your provider
                    account.
                  </p>
                </div>

                {profileMessage && (
                  <div className="mb-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    {profileMessage}
                  </div>
                )}
                {profileError && (
                  <Alert type="error" title="Error" message={profileError} className="mb-4" />
                )}

                <form onSubmit={handleProfileSave} className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Email Address
                    </label>
                    <div className="px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-800 flex items-center justify-between gap-2">
                      <span className="truncate">{account.email || 'Not set'}</span>
                      {account.emailVerified && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          Email Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-name"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Account Holder / Owner Name
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#F36B21] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Business Mobile Number
                    </label>
                    {account.phoneVerified ? (
                      <div className="px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-800 flex items-center justify-between">
                        <span>+91 {account.phone}</span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Mobile Verified
                        </span>
                      </div>
                    ) : (
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-sm font-extrabold text-slate-500 select-none">
                          +91
                        </span>
                        <input
                          id="profile-phone"
                          type="tel"
                          maxLength={10}
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm((p) => ({
                              ...p,
                              phone: e.target.value.replace(/\D/g, ''),
                            }))
                          }
                          placeholder="98XXXXXXXX"
                          className="w-full pl-12 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-[#F36B21] focus:bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-6 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] disabled:opacity-60 text-white text-xs sm:text-sm font-bold cursor-pointer shadow-xs"
                  >
                    {profileSaving ? 'Saving...' : 'Save Account Profile'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
