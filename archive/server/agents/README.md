# How the Agents System Works

1. Everything is an agent.
2. Meta agents: There is a proactive meta agent and an explicit meta agent. These agents don't do stuff on their own, they figure out what expert/worker agents to spin up given the task and context.
    - the proactive meta agent runs **continously** and tries to *guess* what might be useful to do - mostly by guess which expert agents it should run
    - the explicit meta agent runs **only** when asked or prompted to run, and there is an explicit request passsed to this agent 
3. There are never any repeated prompts so that all agents improve together. We have many f strings around the place to generate prompts. If you want to copy and paste some part of a prompt, don't. Set it up to be generated from the existing prompts.
4. Most prompts have conversation context injected in.
5. Most prompts receive a command at some point.
