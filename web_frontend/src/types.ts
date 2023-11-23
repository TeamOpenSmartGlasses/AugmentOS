export enum AgentName {
  STATISTICIAN = "Statistician",
  DEFINER = "Definer",
  FACT_CHECKER = "FactChecker",
  DEVILS_ADVOCATE = "DevilsAdvocate",
  COMMAND = "Command"
}

export type Entity = {
  name?: string;
  summary?: string;
  image_url?: string; // from wiki
  map_image_path?: string; // from maps
  url?: string; // view more url
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
}