import type {AuthResponse, AuthChangeEvent, Session, SupabaseClient} from "@supabase/supabase-js";
import {createSupabaseBrowserClient} from "../history/supabase";
import {normalizeAuthError} from "./errors";
import {AuthError, type AuthSession, type AuthUser} from "./types";

function mapUser(user: {id: string; email?: string | null}): AuthUser {
  return {id: user.id, ...(user.email ? {email: user.email} : {})};
}
function mapSession(session: Session | null): AuthSession | null {
  return session ? {user: mapUser(session.user)} : null;
}
export class AuthService {
  constructor(private readonly client?: SupabaseClient) {}
  private getClient(): SupabaseClient { return this.client ?? createSupabaseBrowserClient(); }

  async getSession(): Promise<AuthSession | null> {
    try { return mapSession((await this.getClient().auth.getSession()).data.session); }
    catch (error) { throw normalizeAuthError(error); }
  }

  async getUser(): Promise<AuthUser | null> {
    try {
      const result = await this.getClient().auth.getUser();
      if (result.error) throw result.error;
      return result.data.user ? mapUser(result.data.user) : null;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  async signUp(email: string, password: string): Promise<AuthSession | null> {
    try {
      const response: AuthResponse = await this.getClient().auth.signUp({email: email.trim(), password});
      if (response.error) throw response.error;
      return mapSession(response.data.session);
    } catch (error) { throw normalizeAuthError(error); }
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    try {
      const response = await this.getClient().auth.signInWithPassword({email: email.trim(), password});
      if (response.error) throw response.error;
      if (!response.data.session) throw new AuthError("invalid_credentials", "Нэвтрэх session үүссэнгүй.");
      return mapSession(response.data.session)!;
    } catch (error) { throw normalizeAuthError(error); }
  }

  async signOut(): Promise<void> {
    try {
      const {error} = await this.getClient().auth.signOut();
      if (error) throw error;
    } catch (error) { throw normalizeAuthError(error); }
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: AuthSession | null) => void): () => void {
    const {data} = this.getClient().auth.onAuthStateChange((event, session) => callback(event, mapSession(session)));
    return () => data.subscription.unsubscribe();
  }
}
export function getAuthService(): AuthService {
  return new AuthService();
}
