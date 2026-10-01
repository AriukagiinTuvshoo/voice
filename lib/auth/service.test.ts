import {describe,expect,it,vi} from "vitest";
import {AuthService} from "./service";
function mockClient(overrides:Record<string,unknown>={}):any{
 const auth:any={
  getSession:vi.fn().mockResolvedValue({data:{session:{user:{id:"user-a",email:"a@example.com"}}}}),
  getUser:vi.fn().mockResolvedValue({data:{user:{id:"user-a",email:"a@example.com"}},error:null}),
  signUp:vi.fn().mockResolvedValue({data:{session:null},error:null}),
  signInWithPassword:vi.fn().mockResolvedValue({data:{session:{user:{id:"user-a",email:"a@example.com"}}},error:null}),
  signOut:vi.fn().mockResolvedValue({error:null}),
  onAuthStateChange:vi.fn().mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}}),
  ...overrides,
 };
 return {auth};
}
describe("AuthService",()=>{
 it("restores a session",async()=>expect(await new AuthService(mockClient()).getSession()).toEqual({user:{id:"user-a",email:"a@example.com"}}));
 it("signs in through Supabase Auth",async()=>{const client=mockClient();const result=await new AuthService(client).signIn("a@example.com","password");expect(result.user.id).toBe("user-a");expect(client.auth.signInWithPassword).toHaveBeenCalledWith({email:"a@example.com",password:"password"})});
 it("signs out",async()=>{const client=mockClient();await new AuthService(client).signOut();expect(client.auth.signOut).toHaveBeenCalled()});
 it("cleans up auth subscriptions",()=>{const unsubscribe=vi.fn();const client=mockClient({onAuthStateChange:vi.fn().mockReturnValue({data:{subscription:{unsubscribe}}})});const stop=new AuthService(client).onAuthStateChange(vi.fn());stop();expect(unsubscribe).toHaveBeenCalled()});
});
