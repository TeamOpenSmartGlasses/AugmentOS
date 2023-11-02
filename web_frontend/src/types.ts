export type Entity = {
  name?: string;
  summary?: string;
  image_url?: string; // from wiki
  map_image_path?: string; // from maps
  url?: string; // view more url
  text?: string; // insight
  agent_insight?: string; // agent insight
  agent_references?: string; // agent references
  agent_motive?: string; // agent motive
  agent_name?: string; // agent name
};

export type Insight = {
  timestamp?: number;
  uuid?: string;
  query?: string;
  insight?: string;
}