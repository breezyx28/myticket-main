import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeEmailRequest,
  ChangePasswordRequest,
} from "@/api/types/auth";
import type {
  DeleteAccountRequest,
  DeleteAccountResponse,
  UpdateMeRequest,
  UpdateTalentAvailabilityRequest,
  UpdateUserPreferencesRequest,
  UserMe,
  UserPreferences,
} from "@/api/types/user";
import {
  useChangeEmailMutation,
  useChangePasswordMutation,
  useDeleteMeMutation,
  useForgotPasswordMutation,
  useLazyGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useOauthCallbackMutation,
  useOauthStartMutation,
  useRegisterMutation,
  useResetPasswordMutation,
  useSetTalentAvailabilityMutation,
  useTwoFactorChallengeMutation,
  useUpdateMeMutation,
  useUpdatePreferencesMutation,
} from "@/api/endpoints";
import {
  getRefreshToken,
  getSessionUserFromMeta,
  getStoredAuthMeta,
  getToken,
  persistAuthCookies,
} from "@/api/authToken";
import { logout as logoutAction, setCredentials } from "@/store/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { mapUserMeToMockUser, parseAuthResponse } from "@/lib/authMapper";
import {
  getEffectiveLanguage,
} from "@/lib/language";
import { changeAppLanguage } from "@/i18n";
import i18n from "@/i18n";
import {
  EmailVerificationRequiredError,
  TwoFactorRequiredError,
  toAuthApiError,
} from "@/lib/authErrors";
import type { OnboardingRole, UserRole } from "@/types/domain";

export type SignUpResult =
  | { status: "session_established"; token: string }
  | { status: "verification_required"; message: string; token?: string };

export type MockUser = {
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  city: string;
  region: string;
  bio: string;
  profileImage: string;
  preferences: {
    language: "en" | "ar";
    theme: "system" | "light" | "dark";
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChangedAt: string;
  };
};

/** Map `/me/preferences` payload onto the camelCase `MockUser.preferences` mirror. */
function apiPrefsToMock(p: UserPreferences): MockUser["preferences"] {
  return {
    language: (p.language === "ar"
      ? "ar"
      : "en") as MockUser["preferences"]["language"],
    theme: (["system", "light", "dark"].includes(p.theme as string)
      ? p.theme
      : "system") as MockUser["preferences"]["theme"],
    emailNotifications: Boolean(p.email_notifications),
    pushNotifications: Boolean(p.push_notifications),
    smsNotifications: Boolean(p.sms_notifications),
    marketingEmails: Boolean(p.marketing_emails),
  };
}

function mockPrefsPatchToApi(
  patch: Partial<MockUser["preferences"]>,
): UpdateUserPreferencesRequest {
  const body: UpdateUserPreferencesRequest = {};
  if (patch.language !== undefined) body.language = patch.language;
  if (patch.theme !== undefined) body.theme = patch.theme;
  if (patch.emailNotifications !== undefined)
    body.email_notifications = patch.emailNotifications;
  if (patch.pushNotifications !== undefined)
    body.push_notifications = patch.pushNotifications;
  if (patch.smsNotifications !== undefined)
    body.sms_notifications = patch.smsNotifications;
  if (patch.marketingEmails !== undefined)
    body.marketing_emails = patch.marketingEmails;
  return body;
}

type AuthContextValue = {
  user: MockUser | null;
  isHydrating: boolean;
  signIn: (email: string, password: string) => Promise<MockUser>;
  signInWithOtp: (otp: string, challengeToken: string) => Promise<MockUser>;
  signInGoogle: () => Promise<void>;
  signInWithOAuth: (provider: string) => Promise<void>;
  completeOAuthCallback: (
    provider: string,
    code: string,
    state: string | null,
  ) => Promise<MockUser>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    phone: string | undefined,
    agreeTerms: boolean | undefined,
    role?: OnboardingRole,
  ) => Promise<SignUpResult>;
  updateProfileName: (name: string) => void;
  /** Persists profile fields via `PATCH /me`. Email changes use `requestEmailChange` instead. */
  updateAccountInfo: (
    patch: Partial<
      Pick<
        MockUser,
        "name" | "phone" | "city" | "region" | "bio" | "profileImage"
      >
    > & {
      displayName?: string;
    },
  ) => Promise<void>;
  /** Mirror a hosted profile image URL after `POST /me/profile-image`. */
  applyProfileImageUrl: (url: string) => void;
  /** Persists via `PATCH /me/preferences` and mirrors the response into `MockUser.preferences`. */
  updatePreferences: (patch: Partial<MockUser["preferences"]>) => Promise<void>;
  /** Local mirror for 2FA toggles until profile security wires real endpoints here. */
  updateSecuritySettings: (patch: Partial<MockUser["security"]>) => void;
  changePassword: (body: ChangePasswordRequest) => Promise<void>;
  requestEmailChange: (body: ChangeEmailRequest) => Promise<string>;
  requestAccountDeletion: (
    body: DeleteAccountRequest,
  ) => Promise<DeleteAccountResponse>;
  setTalentAvailabilityStatus: (
    status: UpdateTalentAvailabilityRequest["status"],
  ) => Promise<void>;
  signOut: () => void;
};

const OAUTH_STATE_KEY = "myticket_oauth_state";
const OAUTH_PROVIDER_KEY = "myticket_oauth_provider";
const OAUTH_REDIRECT_KEY = "myticket_oauth_redirect_after";

/**
 * Migration shim: the legacy mirrored-user cache `myticket_mock_auth` was
 * removed in favor of `/me` rehydration. Clear any stale entry that already
 * exists in users' browsers. Safe to remove after a few releases.
 */
try {
  localStorage.removeItem("myticket_mock_auth");
} catch {
  /* ignore SSR / private-mode storage errors */
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readMockUserFromSessionCookies(): MockUser | null {
  if (typeof window === "undefined") return null;
  if (!getToken()) return null;
  const u = getSessionUserFromMeta();
  return u ? mapUserMeToMockUser(u, null) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(() =>
    readMockUserFromSessionCookies(),
  );
  const [isHydrating, setIsHydrating] = useState<boolean>(() =>
    Boolean(getToken()),
  );
  const dispatch = useAppDispatch();
  const userRef = useRef<MockUser | null>(user);
  userRef.current = user;

  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [twoFactorChallengeMutation] = useTwoFactorChallengeMutation();
  const [oauthStartMutation] = useOauthStartMutation();
  const [oauthCallbackMutation] = useOauthCallbackMutation();
  const [forgotPasswordMutation] = useForgotPasswordMutation();
  const [resetPasswordMutation] = useResetPasswordMutation();
  const [logoutMutation] = useLogoutMutation();
  const [triggerGetMe] = useLazyGetMeQuery();
  const [updateMeMutation] = useUpdateMeMutation();
  const [updatePreferencesMutation] = useUpdatePreferencesMutation();
  const [changePasswordMutation] = useChangePasswordMutation();
  const [changeEmailMutation] = useChangeEmailMutation();
  const [deleteMeMutation] = useDeleteMeMutation();
  const [setTalentAvailabilityMutation] = useSetTalentAvailabilityMutation();

  /**
   * Persist credentials into Redux and **secure cookies** (`SameSite=Lax`, `Secure` on HTTPS),
   * then call `GET /me` and refresh the cookie profile snapshot from the live profile.
   */
  const persistCredentialsAndHydrate = useCallback(
    async (
      token: string,
      refreshToken: string | null,
      bootstrapUser?: UserMe | null,
      expiresAt?: string | null,
    ) => {
      dispatch(
        setCredentials({
          token,
          refreshToken: refreshToken ?? null,
          user: null,
          expiresAt: expiresAt ?? null,
          sessionUser: bootstrapUser ?? null,
        }),
      );
      if (bootstrapUser) {
        setUser(mapUserMeToMockUser(bootstrapUser, userRef.current));
      }
      try {
        const me = await triggerGetMe(undefined, false).unwrap();
        const next = mapUserMeToMockUser(me, userRef.current);
        setUser(next);
        const at = getToken();
        if (at) {
          persistAuthCookies({
            accessToken: at,
            refreshToken: getRefreshToken(),
            expiresAt: getStoredAuthMeta()?.expires_at ?? expiresAt ?? null,
            userSnapshot: me,
          });
        }
        return next;
      } catch (error) {
        // Drop optimistic session mirror; token stays until the user signs out or retries.
        setUser(null);
        throw toAuthApiError(error, i18n.t('auth:loadProfileFailed', 'Failed to load your profile.'));
      }
    },
    [dispatch, triggerGetMe],
  );

  /**
   * Hydrate `user` from `/me` on mount when a bearer token exists.
   *
   * If an older `/me` request finishes after a new login has replaced the token,
   * ignore its outcome so we do not clear the fresh session (logout + setUser(null)).
   */
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsHydrating(false);
      return;
    }
    const fromCookie = getSessionUserFromMeta();
    if (fromCookie) {
      setUser(mapUserMeToMockUser(fromCookie, userRef.current));
    }
    const tokenAtStart = token;
    let cancelled = false;
    triggerGetMe(undefined, false)
      .unwrap()
      .then((me) => {
        if (cancelled) return;
        if (getToken() !== tokenAtStart) return;
        const next = mapUserMeToMockUser(me, userRef.current);
        setUser(next);
      })
      .catch(() => {
        if (cancelled) return;
        if (getToken() !== tokenAtStart) return;
        dispatch(logoutAction());
        setUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, triggerGetMe]);

  useEffect(() => {
    const language = getEffectiveLanguage(user?.preferences.language);
    changeAppLanguage(language);
  }, [user?.preferences.language, user]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await loginMutation({ email, password }).unwrap();
        const parsed = parseAuthResponse(response);
        if (parsed.kind === "two_factor") throw parsed.error;
        if (parsed.kind === "verification_required") throw parsed.error;
        return await persistCredentialsAndHydrate(
          parsed.token,
          parsed.refresh_token,
          parsed.user,
          parsed.expires_at,
        );
      } catch (error) {
        if (error instanceof TwoFactorRequiredError) throw error;
        if (error instanceof EmailVerificationRequiredError) throw error;
        throw toAuthApiError(error, i18n.t('auth:signInFailed', 'Sign-in failed.'));
      }
    },
    [loginMutation, persistCredentialsAndHydrate],
  );

  const signInWithOtp = useCallback(
    async (otp: string, challengeToken: string) => {
      try {
        const response = await twoFactorChallengeMutation({
          otp,
          challenge_token: challengeToken,
        }).unwrap();
        const parsed = parseAuthResponse(response);
        if (parsed.kind === "two_factor") throw parsed.error;
        if (parsed.kind === "verification_required") throw parsed.error;
        return await persistCredentialsAndHydrate(
          parsed.token,
          parsed.refresh_token,
          parsed.user,
          parsed.expires_at,
        );
      } catch (error) {
        if (error instanceof TwoFactorRequiredError) throw error;
        if (error instanceof EmailVerificationRequiredError) throw error;
        throw toAuthApiError(error, i18n.t('auth:otpFailed', 'OTP verification failed.'));
      }
    },
    [twoFactorChallengeMutation, persistCredentialsAndHydrate],
  );

  const signInWithOAuth = useCallback(
    async (provider: string) => {
      try {
        const response = await oauthStartMutation({ provider }).unwrap();
        const redirect = response?.redirect_url;
        if (!redirect)
          throw new Error(i18n.t('auth:providerRedirectMissing', 'Provider did not return a redirect URL.'));
        if (response.state)
          sessionStorage.setItem(OAUTH_STATE_KEY, response.state);
        else sessionStorage.removeItem(OAUTH_STATE_KEY);
        sessionStorage.setItem(OAUTH_PROVIDER_KEY, provider);
        const here = `${window.location.pathname}${window.location.search}`;
        sessionStorage.setItem(OAUTH_REDIRECT_KEY, here);
        window.location.href = redirect;
      } catch (error) {
        throw toAuthApiError(error, i18n.t('auth:oauthStartFailed', { provider, defaultValue: `Could not start ${provider} sign-in.` }));
      }
    },
    [oauthStartMutation],
  );

  const signInGoogle = useCallback(
    () => signInWithOAuth("google"),
    [signInWithOAuth],
  );

  const completeOAuthCallback = useCallback(
    async (provider: string, code: string, state: string | null) => {
      try {
        const expected = sessionStorage.getItem(OAUTH_STATE_KEY);
        if (expected && state && expected !== state) {
          throw new Error(i18n.t('auth:oauthStateMismatch'));
        }
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        sessionStorage.removeItem(OAUTH_PROVIDER_KEY);
        const response = await oauthCallbackMutation({
          provider,
          body: { code, state: state ?? undefined },
        }).unwrap();
        const parsed = parseAuthResponse(response);
        if (parsed.kind === "two_factor") throw parsed.error;
        if (parsed.kind === "verification_required") throw parsed.error;
        return await persistCredentialsAndHydrate(
          parsed.token,
          parsed.refresh_token,
          parsed.user,
          parsed.expires_at,
        );
      } catch (error) {
        if (error instanceof TwoFactorRequiredError) throw error;
        if (error instanceof EmailVerificationRequiredError) throw error;
        throw toAuthApiError(error, i18n.t('auth:oauthSignInFailed'));
      }
    },
    [oauthCallbackMutation, persistCredentialsAndHydrate],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      try {
        await forgotPasswordMutation({ email }).unwrap();
      } catch (error) {
        throw toAuthApiError(error, i18n.t('auth:passwordResetStartFailed'));
      }
    },
    [forgotPasswordMutation],
  );

  const confirmPasswordReset = useCallback(
    async (token: string, password: string) => {
      try {
        await resetPasswordMutation({ token, password }).unwrap();
      } catch (error) {
        throw toAuthApiError(error, i18n.t('auth:passwordResetFailed'));
      }
    },
    [resetPasswordMutation],
  );

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      phone: string | undefined,
      agreeTerms: boolean | undefined,
      role?: OnboardingRole,
    ) => {
      try {
        const trimmed =
          name.trim() ||
          (typeof email === "string" && email.includes("@")
            ? email.split("@")[0]
            : undefined) ||
          "User";
        const response = await registerMutation({
          full_name: trimmed,
          email,
          password,
          ...(role ? { role } : {}),
          ...(phone ? { phone } : {}),
          ...(agreeTerms ? { agree_terms: true } : {}),
        }).unwrap();
        const parsed = parseAuthResponse(response);
        if (parsed.kind === "two_factor") throw parsed.error;
        if (parsed.kind === "verification_required") {
          const raw = response as Record<string, unknown>;
          const maybeToken =
            typeof raw.token === "string" && raw.token.length > 0
              ? raw.token
              : undefined;
          return {
            status: "verification_required" as const,
            message: parsed.error.message,
            ...(maybeToken ? { token: maybeToken } : {}),
          };
        }
        await persistCredentialsAndHydrate(
          parsed.token,
          parsed.refresh_token,
          parsed.user,
          parsed.expires_at,
        );
        return { status: "session_established" as const, token: parsed.token };
      } catch (error) {
        if (error instanceof TwoFactorRequiredError) throw error;
        if (error instanceof EmailVerificationRequiredError) {
          return {
            status: "verification_required" as const,
            message: error.message,
          };
        }
        throw toAuthApiError(error, i18n.t('auth:signUpFailed'));
      }
    },
    [registerMutation, persistCredentialsAndHydrate],
  );

  const updateProfileName = useCallback((name: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        name: name.trim() || prev.name,
      };
    });
  }, []);

  const applyProfileImageUrl = useCallback((url: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, profileImage: url.trim() };
    });
  }, []);

  const updateAccountInfo = useCallback(
    async (
      patch: Partial<
        Pick<
          MockUser,
          "name" | "phone" | "city" | "region" | "bio" | "profileImage"
        >
      > & {
        displayName?: string;
      },
    ) => {
      const body: UpdateMeRequest = {};
      if (patch.name !== undefined)
        body.full_name = patch.name.trim() || undefined;
      if (patch.displayName !== undefined)
        body.display_name = patch.displayName.trim() || undefined;
      if (patch.bio !== undefined) body.bio = patch.bio;
      if (patch.profileImage !== undefined) {
        const pic = patch.profileImage.trim();
        if (!pic) {
          body.avatar_url = undefined;
        } else if (pic.startsWith('data:') || pic.startsWith('blob:')) {
          throw toAuthApiError(
            new Error(i18n.t('auth:profilePhotoUploading')),
            i18n.t('auth:updateProfileFailed'),
          );
        } else {
          body.avatar_url = pic;
        }
      }
      if (patch.phone !== undefined) body.phone = patch.phone;
      if (patch.city !== undefined) body.city = patch.city;
      if (patch.region !== undefined) body.region = patch.region;
      try {
        const me = await updateMeMutation(body).unwrap();
        const next = mapUserMeToMockUser(me, userRef.current);
        setUser(next);
      } catch (error) {
        throw toAuthApiError(error, i18n.t('auth:updateProfileFailed'));
      }
    },
    [updateMeMutation],
  );

  const updatePreferences = useCallback(
    async (patch: Partial<MockUser["preferences"]>) => {
      const body = mockPrefsPatchToApi(patch);
      try {
        const prefs = await updatePreferencesMutation(body).unwrap();
        setUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            preferences: apiPrefsToMock(prefs),
          };
        });
      } catch (error) {
        throw toAuthApiError(error, i18n.t('auth:savePreferencesFailed'));
      }
    },
    [updatePreferencesMutation],
  );

  const updateSecuritySettings = useCallback(
    (patch: Partial<MockUser["security"]>) => {
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          security: { ...prev.security, ...patch },
        };
      });
    },
    [],
  );

  const changePassword = useCallback(
    async (body: ChangePasswordRequest) => {
      try {
        const res = await changePasswordMutation(body).unwrap();
        setUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            security: {
              ...prev.security,
              lastPasswordChangedAt: res.password_changed_at,
            },
          };
        });
      } catch (error) {
        throw toAuthApiError(error, i18n.t('auth:changePasswordFailed'));
      }
    },
    [changePasswordMutation],
  );

  const requestEmailChange = useCallback(
    async (body: ChangeEmailRequest) => {
      try {
        const res = await changeEmailMutation(body).unwrap();
        return res.message;
      } catch (error) {
        throw toAuthApiError(error, i18n.t('auth:emailChangeStartFailed'));
      }
    },
    [changeEmailMutation],
  );

  const requestAccountDeletion = useCallback(
    async (body: DeleteAccountRequest) => {
      try {
        return await deleteMeMutation(body).unwrap();
      } catch (error) {
        throw toAuthApiError(error, i18n.t('auth:deleteAccountFailed'));
      }
    },
    [deleteMeMutation],
  );

  const setTalentAvailabilityStatus = useCallback(
    async (status: UpdateTalentAvailabilityRequest["status"]) => {
      try {
        await setTalentAvailabilityMutation({ status }).unwrap();
      } catch (error) {
        throw toAuthApiError(error, i18n.t('auth:updateAvailabilityFailed'));
      }
    },
    [setTalentAvailabilityMutation],
  );

  const signOut = useCallback(() => {
    if (getToken()) {
      logoutMutation()
        .unwrap()
        .catch(() => {
          /* server-side revocation is best-effort. */
        });
    }
    dispatch(logoutAction());
    setUser(null);
  }, [dispatch, logoutMutation]);

  const value = useMemo(
    () => ({
      user,
      isHydrating,
      signIn,
      signInWithOtp,
      signInGoogle,
      signInWithOAuth,
      completeOAuthCallback,
      requestPasswordReset,
      confirmPasswordReset,
      signUp,
      updateProfileName,
      applyProfileImageUrl,
      updateAccountInfo,
      updatePreferences,
      updateSecuritySettings,
      changePassword,
      requestEmailChange,
      requestAccountDeletion,
      setTalentAvailabilityStatus,
      signOut,
    }),
    [
      user,
      isHydrating,
      signIn,
      signInWithOtp,
      signInGoogle,
      signInWithOAuth,
      completeOAuthCallback,
      requestPasswordReset,
      confirmPasswordReset,
      signUp,
      updateProfileName,
      applyProfileImageUrl,
      updateAccountInfo,
      updatePreferences,
      updateSecuritySettings,
      changePassword,
      requestEmailChange,
      requestAccountDeletion,
      setTalentAvailabilityStatus,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
