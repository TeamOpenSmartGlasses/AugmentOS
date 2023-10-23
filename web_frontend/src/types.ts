export type Entity = {
  name?: string;
  summary?: string;
  image_url?: string; // from wiki
  map_image_path?: string; // from maps
  url?: string; // view more url
  text?: string; // insight
};

export type Insight = {
  timestamp?: number;
  uuid?: string;
  query?: string;
  insight?: string;
}