import {describe,expect,it} from "vitest";
import {getDashboardStats} from "./stats";

describe("dashboard stats",()=>{
 const now=Date.parse("2026-09-30T00:00:00.000Z");
 const sessions=[{id:"a",createdAt:"2026-09-29T00:00:00.000Z",updatedAt:"2026-09-29T00:00:00.000Z",language:"en",processingMode:"standard",rawText:"a",processedText:"a",durationMs:61000,source:"browser",title:"A"},{id:"b",createdAt:"2026-09-10T00:00:00.000Z",updatedAt:"2026-09-10T00:00:00.000Z",language:"mn",processingMode:"clean",rawText:"b",processedText:"b",durationMs:30000,source:"browser",title:"B"}];
 it("calculates only local history statistics",()=>expect(getDashboardStats(sessions,now)).toEqual({totalRecordings:2,thisWeek:1,totalDurationMs:91000}));
});
