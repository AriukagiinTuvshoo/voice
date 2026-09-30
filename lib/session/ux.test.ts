import {describe,expect,it} from "vitest";
import {getSessionUxState} from "./ux";

describe("session UX lifecycle",()=>{
 it("maps idle to idle",()=>expect(getSessionUxState({speechState:"idle",hasFinalText:false,saving:false,saved:false,hasError:false})).toBe("idle"));
 it("maps recording states to recording",()=>expect(getSessionUxState({speechState:"recording",hasFinalText:false,saving:false,saved:false,hasError:false})).toBe("recording"));
 it("maps processing to processing",()=>expect(getSessionUxState({speechState:"processing",hasFinalText:true,saving:false,saved:false,hasError:false})).toBe("processing"));
 it("maps finalized transcript to ready",()=>expect(getSessionUxState({speechState:"idle",hasFinalText:true,saving:false,saved:false,hasError:false})).toBe("ready"));
 it("maps saving and saved deterministically",()=>{expect(getSessionUxState({speechState:"processing",hasFinalText:true,saving:true,saved:false,hasError:false})).toBe("saving");expect(getSessionUxState({speechState:"processing",hasFinalText:true,saving:false,saved:true,hasError:false})).toBe("saved")});
 it("maps errors to error",()=>expect(getSessionUxState({speechState:"error",hasFinalText:true,saving:false,saved:false,hasError:true})).toBe("error"));
});
