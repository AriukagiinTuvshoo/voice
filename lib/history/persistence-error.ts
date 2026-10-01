export type PersistenceErrorCode = "configuration_error"|"connection_error"|"permission_error"|"not_found"|"validation_error"|"conflict_error"|"unknown_error";
export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;
  readonly cause?: unknown;
  constructor(code: PersistenceErrorCode,message:string,options?:{cause?:unknown}){super(message);this.name="PersistenceError";this.code=code;this.cause=options?.cause;}
}
export function normalizePersistenceError(error:unknown):PersistenceError{
  if(error instanceof PersistenceError)return error;
  const value=error&&typeof error==="object"?error as {code?:unknown;status?:unknown}:{};
  const code=typeof value.code==="string"?value.code:""; const status=typeof value.status==="number"?value.status:0;
  if(code==="23505"||code==="23503")return new PersistenceError("conflict_error","Cloud history update conflicted with existing data.",{cause:error});
  if(code==="42501"||code==="PGRST301"||code==="PGRST302"||status===401||status===403)return new PersistenceError("permission_error","Cloud history access is not permitted.",{cause:error});
  if(code.startsWith("08")||code==="PGRST000"||code==="PGRST001"||code==="PGRST002"||code==="PGRST003")return new PersistenceError("connection_error","Cloud history is temporarily unavailable.",{cause:error});
  if(code==="42P01"||code==="PGRST205")return new PersistenceError("configuration_error","The Supabase history table is not available.",{cause:error});
  return new PersistenceError("unknown_error","Cloud history operation failed.",{cause:error});
}
