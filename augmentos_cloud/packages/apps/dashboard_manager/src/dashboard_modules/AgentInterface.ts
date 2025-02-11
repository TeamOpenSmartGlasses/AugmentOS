export interface Agent {
  handleContext(inputData: any): Promise<{
    [key: string]: any;
  }>;
} 