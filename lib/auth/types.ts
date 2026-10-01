export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_already_registered"
  | "weak_password"
  | "invalid_email"
  | "session_expired"
  | "network_error"
  | "configuration_error"
  | "unknown_error";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthSession {
  user: AuthUser;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  session: AuthSession | null;
  error: AuthError | null;
}

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly cause?: unknown;
  constructor(code: AuthErrorCode, message: string, options?: {cause?: unknown}) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.cause = options?.cause;
  }
}
