export interface TPA {
    id: string;
    name: string;
    packageName: string;
    description: string;
    webhookURL: string;
    logoURL: string;
    webviewURL?: string;
    isPublic: boolean;
}