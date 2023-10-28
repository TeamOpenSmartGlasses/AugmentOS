//modify the url to point to the correct endpoint
const serverEndpointEnv = import.meta.env.VITE_SERVER_ENVIRONMENT;
const isProd = (serverEndpointEnv === "prod"); //check if we're running on prod
const baseEndpoint = isProd ? "/api" : ("/api/" + serverEndpointEnv); //if prod, no extra endpoint location, otherwise append the endpoint name

export const UI_POLL_ENDPOINT = baseEndpoint + "/ui_poll";

export const CHAT_ENDPOINT = baseEndpoint + "/chat";

export const UPLOAD_USERDATA_ENDPOINT = baseEndpoint + "/upload_userdata";

export const AGENT_RUN_ENDPOINT = baseEndpoint + "/run_single_agent";

export const SEND_AGENT_CHAT_ENDPOINT = baseEndpoint + "/send_agent_chat";
