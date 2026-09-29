export type Language="mn"|"en"|"ja"|"auto";
export type RecordingState="idle"|"recording"|"processing"|"success"|"error";
export type RecordingMode="toggle"|"push_to_talk"|"microphone";
export type Shortcut="Space"|"F2"|"F4"|"F8"|"Ctrl+Space"|"Alt+Space";
export type ProcessingMode="raw"|"standard"|"clean"|"polished";
export type Theme="light"|"dark"|"system";
export interface Settings{language:Language;recordingMode:RecordingMode;shortcut:Shortcut;autoStop:boolean;autoPunctuation:boolean;autoCorrection:boolean;removeFillers:boolean;processingMode:ProcessingMode;theme:Theme;saveRecordings:boolean;saveTranscripts:boolean}