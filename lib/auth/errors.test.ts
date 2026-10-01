import {describe,expect,it} from "vitest";
import {normalizeAuthError} from "./errors";
describe("auth error normalization",()=>{
 it("maps invalid credentials",()=>expect(normalizeAuthError({status:401,message:"Invalid login credentials"}).code).toBe("invalid_credentials"));
 it("maps duplicate email",()=>expect(normalizeAuthError({message:"User already registered"}).code).toBe("email_already_registered"));
 it("maps weak password",()=>expect(normalizeAuthError({message:"Password is too weak"}).code).toBe("weak_password"));
 it("maps network failures",()=>expect(normalizeAuthError({message:"Failed to fetch"}).code).toBe("network_error"));
 it("does not expose raw provider details in the message",()=>expect(normalizeAuthError({message:"internal secret key xyz"}).message).not.toContain("secret key"));
});
