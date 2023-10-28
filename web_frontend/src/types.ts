export enum AgentName {
  STATISTICIAN = "Statistician",
  DEFINER = "Definer",
  FACT_CHECKER = "FactChecker",
  DEVILS_ADVOCATE = "DevilsAdvocate",
}

export type Entity = {
  name?: string;
  summary?: string;
  image_url?: string; // from wiki
  map_image_path?: string; // from maps
  url?: string; // view more url
  text?: string; // insight
  agent_insight?: string;
  agent_name?: AgentName;
  uuid: string;
};
