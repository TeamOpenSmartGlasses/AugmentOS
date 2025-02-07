export interface AppStoreItem {
    name: string;
    packageName: string;
    description: string;
    iconImageUrl: string;
    showInAppStore: boolean;
    identifierCode: string;
    rating: number;
    downloads: number;
    requirements: string[];
    category: string;
    screenshots: string[];
    reviews: {
      id: string;
      user: string;
      avatar: string;
      rating: number;
      comment: string;
    }[];
  }
