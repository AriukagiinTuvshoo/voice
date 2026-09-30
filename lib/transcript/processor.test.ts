import {describe,expect,it} from "vitest";
import {processTranscript,type TranscriptProcessingOptions} from "./processor";

const options=(overrides:Partial<TranscriptProcessingOptions>={}):TranscriptProcessingOptions=>({
  language:"en",mode:"standard",autoPunctuation:true,autoCorrection:false,removeFillers:false,...overrides
});

describe("processTranscript",()=>{
  it("keeps raw mode unchanged",()=>{
    const input="  um   hello   world  ";
    expect(processTranscript(input,options({mode:"raw",removeFillers:true}))).toEqual({rawText:input,processedText:input,changed:false});
  });
  it("normalizes whitespace",()=>{
    expect(processTranscript("hello   world",options({autoPunctuation:false})).processedText).toBe("hello world");
  });
  it("adds conservative terminal punctuation when enabled",()=>{
    expect(processTranscript("hello world",options()).processedText).toBe("hello world.");
  });
  it("does not insert punctuation when disabled",()=>{
    expect(processTranscript("hello world",options({autoPunctuation:false})).processedText).toBe("hello world");
  });
  it("removes explicit English fillers only when enabled",()=>{
    expect(processTranscript("um hello uh world",options({mode:"clean",removeFillers:true,autoPunctuation:false})).processedText).toBe("hello world");
    expect(processTranscript("um hello world",options({mode:"clean",removeFillers:false,autoPunctuation:false})).processedText).toBe("um hello world");
  });
  it("uses language-aware filler rules and preserves meaningful words",()=>{
    expect(processTranscript("ээ сайн байна аа",options({language:"mn",mode:"clean",removeFillers:true,autoPunctuation:false})).processedText).toBe("сайн байна");
    expect(processTranscript("えっと こんにちは えー 元気です",options({language:"ja",mode:"clean",removeFillers:true,autoPunctuation:false})).processedText).toBe("こんにちは 元気です");
    expect(processTranscript("like I said",options({mode:"clean",removeFillers:true,autoPunctuation:false})).processedText).toBe("like I said");
    expect(processTranscript("нөгөө хүн",options({language:"mn",mode:"clean",removeFillers:true,autoPunctuation:false})).processedText).toBe("нөгөө хүн");
    expect(processTranscript("あの 人",options({language:"ja",mode:"clean",removeFillers:true,autoPunctuation:false})).processedText).toBe("あの 人");
  });
  it("removes only safe adjacent repeated words",()=>{
    expect(processTranscript("hello hello world",options({mode:"clean",autoPunctuation:false})).processedText).toBe("hello world");
    expect(processTranscript("もし もし",options({language:"ja",mode:"clean",autoPunctuation:false})).processedText).toBe("もし もし");
  });
  it("polished is deterministic and non-semantic",()=>{
    const input="um hello hello world";
    const result=processTranscript(input,options({mode:"polished",removeFillers:true}));
    expect(result.processedText).toBe("hello world.");
    expect(processTranscript(input,options({mode:"polished",removeFillers:true})).processedText).toBe(result.processedText);
  });
  it("applies only explicit safe English corrections",()=>{
    expect(processTranscript("im sure dont do that",options({autoCorrection:true,autoPunctuation:false})).processedText).toBe("I'm sure don't do that");
    expect(processTranscript("dont change",options({language:"mn",autoCorrection:true,autoPunctuation:false})).processedText).toBe("dont change");
    expect(processTranscript("dont change",options({language:"ja",autoCorrection:true,autoPunctuation:false})).processedText).toBe("dont change");
  });
  it("uses language-neutral processing for auto",()=>{
    expect(processTranscript("hello   world",options({language:"auto"})).processedText).toBe("hello world.");
  });
});
