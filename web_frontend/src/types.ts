export enum AgentName {
  STATISTICIAN = "Statistician",
  DEFINER = "Definer",
  FACT_CHECKER = "FactChecker",
  DEVILS_ADVOCATE = "DevilsAdvocate",
  COMMAND = "Command",
  HISTORIAN = "Historian",
  COGNITIVE_BIAS_DETECTOR = "CognitiveBiasDetector",
  REAL_TIMER = "RealTimer",
  QUESTION_ASKER = "QuestionAsker",
}

export const AGENT_ICON_PATHS: Record<AgentName, string> = {
  [AgentName.STATISTICIAN]: "/statistician_icon_large.svg",
  [AgentName.FACT_CHECKER]: "/fact_checker_icon_large.svg",
  [AgentName.DEVILS_ADVOCATE]: "/devils_icon_large.svg",
  [AgentName.DEFINER]: "/definer_icon_large.svg",
  [AgentName.COMMAND]: "/dial_icon_large.svg",
  [AgentName.HISTORIAN]: "/historian_icon_large.svg",
  [AgentName.COGNITIVE_BIAS_DETECTOR]: "/cogbias_icon_large.svg",
  [AgentName.REAL_TIMER]: "/realtimer_icon_large.svg",
  [AgentName.QUESTION_ASKER]: "/questionasker_icon_large.svg",
};

export const AGENT_ICON_NAMES: Record<AgentName, string> = {
  [AgentName.STATISTICIAN]: "Statistician",
  [AgentName.FACT_CHECKER]: "Fact Checker",
  [AgentName.DEVILS_ADVOCATE]: "Devil's Advocate",
  [AgentName.DEFINER]: "Definer",
  [AgentName.COMMAND]: "Command",
  [AgentName.HISTORIAN]: "Historian",
  [AgentName.COGNITIVE_BIAS_DETECTOR]: "Cognitive Bias Detector",
  [AgentName.REAL_TIMER]: "Real Timer",
  [AgentName.QUESTION_ASKER]: "Question Asker",
};

export type Entity = {
  name?: string;
  summary?: string;
  image_url?: string; // from wiki
  map_image_path?: string; // from maps
  url?: string | null; // view more url
  text?: string; // insight
  uuid: string;
  agent_insight?: string; // agent insight
  agent_references?: string; // agent references
  agent_motive?: string; // agent motive
  agent_name?: AgentName; // agent name
};

export type Insight = {
  timestamp?: number;
  uuid?: string;
  query?: string;
  insight?: string;
};

export interface TranscriptionState {
  isRecognizing: boolean;
  transcriptStartIdx: number;
}
