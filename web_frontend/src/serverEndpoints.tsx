const env = import.meta.env.VITE_SERVER_ENVIRONMENT;

const isDev = env === "dev";
const baseEndpoint = isDev ? "/api/dev" : "/api";

export const UI_POLL_ENDPOINT = baseEndpoint + "/ui_poll";

export const CHAT_ENDPOINT = baseEndpoint + "/chat";

export const UPLOAD_USERDATA_ENDPOINT = baseEndpoint + "/upload_userdata";

export const AGENT_RUN_ENDPOINT = baseEndpoint + "/run_single_agent";

export const SEND_AGENT_CHAT_ENDPOINT = baseEndpoint + "/send_agent_chat";