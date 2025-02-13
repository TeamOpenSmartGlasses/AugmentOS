export interface Agent {
  agentId: string;
  agentName: string;
  agentDescription: string;
  agentType: string;

  handleContext(inputData: any): Promise<{
    [key: string]: any;
  }>;
} 