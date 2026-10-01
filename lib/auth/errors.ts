import {AuthError, type AuthErrorCode} from "./types";

function messageFor(code: AuthErrorCode): string {
  switch (code) {
    case "invalid_credentials": return "Email эсвэл нууц үг буруу байна.";
    case "email_already_registered": return "Энэ email аль хэдийн бүртгэлтэй байна.";
    case "weak_password": return "Нууц үг хангалттай хүчтэй биш байна.";
    case "invalid_email": return "Email хаяг буруу байна.";
    case "session_expired": return "Session дууссан байна. Дахин нэвтэрнэ үү.";
    case "network_error": return "Authentication service-тэй холбогдож чадсангүй.";
    case "configuration_error": return "Authentication configuration дутуу байна.";
    default: return "Authentication үйлдэл амжилтгүй боллоо.";
  }
}

export function normalizeAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const value = error && typeof error === "object" ? error as {message?: unknown; status?: unknown; code?: unknown} : {};
  const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
  const status = typeof value.status === "number" ? value.status : 0;
  let code: AuthErrorCode = "unknown_error";
  if (status === 401 || /invalid login credentials|invalid credentials/.test(message)) code = "invalid_credentials";
  else if (/already registered|already exists|user already registered/.test(message)) code = "email_already_registered";
  else if (/password.*(weak|short)|weak password/.test(message)) code = "weak_password";
  else if (/invalid.*email|email.*invalid/.test(message)) code = "invalid_email";
  else if (/expired|refresh token/.test(message)) code = "session_expired";
  else if (status === 0 || /network|fetch|failed to fetch|timeout/.test(message)) code = "network_error";
  else if (/supabase|configuration|url|apikey|api key/.test(message)) code = "configuration_error";
  return new AuthError(code, messageFor(code), {cause: error});
}
