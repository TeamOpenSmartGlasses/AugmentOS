export interface AppStoreItem {
    name: string;
    package_name: string;
    description: string;
    icon_image_url: string;
    identifier_code: string;
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
