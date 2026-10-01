import type {SupabaseClient} from "@supabase/supabase-js";
import type {TranscriptRepository} from "./repository";
import type {TranscriptSession,UpdateTranscriptSessionInput} from "./types";
import {isTranscriptSession} from "./validation";
import {createSupabaseBrowserClient} from "./supabase";
import {fromSupabaseRow,toSupabaseRow} from "./supabase-mapping";
import {normalizePersistenceError,PersistenceError} from "./persistence-error";

const TABLE = "transcript_sessions";

export class SupabaseTranscriptRepository implements TranscriptRepository {
  private readonly client?: SupabaseClient;
  constructor(client?: SupabaseClient) { this.client = client; }
  private getClient() { return this.client ?? createSupabaseBrowserClient(); }

  private async requireUserId(): Promise<string> {
    try {
      const {data,error} = await this.getClient().auth.getUser();
      if (error) throw error;
      if (!data.user?.id) throw new PersistenceError("permission_error","Cloud history requires an authenticated user.");
      return data.user.id;
    } catch (error) {
      if (error instanceof PersistenceError) throw error;
      throw normalizePersistenceError(error);
    }
  }

  async save(session:TranscriptSession) {
    if (!isTranscriptSession(session)) throw new PersistenceError("validation_error","Invalid transcript session.");
    try {
      const ownerId = await this.requireUserId();
      const current = await this.getById(session.id);
      if (current && session.updatedAt < current.updatedAt) throw new PersistenceError("conflict_error","A newer cloud transcript already exists.");
      const ownedSession = {...session, ownerId};
      const {data,error} = await this.getClient().from(TABLE).upsert(toSupabaseRow(ownedSession),{onConflict:"id"}).select("*").single();
      if (error) throw error;
      if (!data) throw new PersistenceError("unknown_error","Cloud history save returned no data.");
      return fromSupabaseRow(data);
    } catch (error) {
      throw normalizePersistenceError(error);
    }
  }

  async list() {
    try {
      await this.requireUserId();
      const {data,error} = await this.getClient().from(TABLE).select("*").order("updated_at",{ascending:false}).order("id",{ascending:false});
      if (error) throw error;
      const sessions:TranscriptSession[] = [];
      for (const row of data ?? []) {
        try { sessions.push(fromSupabaseRow(row)); }
        catch (error) {
          if (error instanceof PersistenceError && error.code === "validation_error") continue;
          throw error;
        }
      }
      return sessions;
    } catch (error) {
      throw normalizePersistenceError(error);
    }
  }

  async getById(id:string) {
    if (!id.trim()) return null;
    try {
      await this.requireUserId();
      const {data,error} = await this.getClient().from(TABLE).select("*").eq("id",id).maybeSingle();
      if (error) throw error;
      return data ? fromSupabaseRow(data) : null;
    } catch (error) {
      throw normalizePersistenceError(error);
    }
  }

  async update(id:string,input:UpdateTranscriptSessionInput) {
    const current = await this.getById(id);
    if (!current) throw new PersistenceError("not_found","Transcript session not found.");
    const updated:TranscriptSession = {
      ...current,
      ...(input.title !== undefined ? {title:input.title.trim() || "Untitled transcript"} : {}),
      ...(input.processedText !== undefined ? {processedText:input.processedText} : {}),
      updatedAt:input.updatedAt ?? new Date().toISOString(),
    };
    if (!isTranscriptSession(updated)) throw new PersistenceError("validation_error","Invalid transcript update.");
    if (updated.updatedAt < current.updatedAt) throw new PersistenceError("conflict_error","A newer cloud transcript already exists.");
    try {
      await this.requireUserId();
      const {data,error} = await this.getClient().from(TABLE).update({
        created_at:updated.createdAt,
        updated_at:updated.updatedAt,
        language:updated.language,
        processing_mode:updated.processingMode,
        raw_text:updated.rawText,
        processed_text:updated.processedText,
        duration:updated.durationMs ?? null,
        source:updated.source,
        title:updated.title,
      }).eq("id",id).select("*").maybeSingle();
      if (error) throw error;
      if (!data) throw new PersistenceError("not_found","Transcript session not found.");
      return fromSupabaseRow(data);
    } catch (error) {
      throw normalizePersistenceError(error);
    }
  }

  async delete(id:string) {
    if (!id.trim()) return;
    try {
      await this.requireUserId();
      const {data,error} = await this.getClient().from(TABLE).delete().eq("id",id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new PersistenceError("not_found","Transcript session not found.");
    } catch (error) {
      throw normalizePersistenceError(error);
    }
  }

  async clearHistory() {
    try {
      await this.requireUserId();
      const {error} = await this.getClient().from(TABLE).delete().neq("id","");
      if (error) throw error;
    } catch (error) {
      throw normalizePersistenceError(error);
    }
  }
}
