import { AppStoreItem } from '../data/appstore-types.ts';

export const AppStoreData: AppStoreItem[] = [
  {
    name: 'Mentra Merge',
    packagename: 'com.mentra.merge',
    description:
      'Enhance your conversations with real-time social cues, emotion detection, and contextual information. Perfect for those who want to better understand and navigate social interactions.',
    icon_image_url:
      'https://augmentos.org/wp-content/uploads/2024/11/output-010-300x300.png',
    identifier_code: 'MENTRAMERGE1',
    rating: 4.7,
    downloads: 7500,
    requirements: ['Display', 'Camera', 'Audio', 'Network Access'],
    category: 'Social',
    screenshots: [
      'https://picsum.photos/400?random=8',
      'https://picsum.photos/400?random=9',
    ],
    reviews: [
      {
        id: '1',
        user: 'Grace',
        avatar: 'https://i.pravatar.cc/150?img=7',
        rating: 5,
        comment: 'The emotion detection feature helps me understand social cues I might otherwise miss.',
      },
      {
        id: '2',
        user: 'Henry',
        avatar: 'https://i.pravatar.cc/150?img=8',
        rating: 4,
        comment: 'Great for social situations. The conversation topic suggestions are really helpful.',
      },
    ],
  },
  {
    name: 'Translator',
    packagename: 'org.translator',
    description:
      'Real-time language translation for your everyday conversations. Supports over 100 languages, offline mode, and voice-to-text input.',
    icon_image_url:
      'https://augmentos.org/wp-content/uploads/2024/11/output-005-300x300.png',
    identifier_code: 'TRANSLATOR1',
    rating: 4.8,
    downloads: 10000,
    requirements: ['Display', 'Audio', 'Network Access'],
    category: 'Productivity',
    screenshots: [
      'https://picsum.photos/400?random=6',
      'https://picsum.photos/400?random=7',
    ],
    reviews: [
      {
        id: '1',
        user: 'Isaac',
        avatar: 'https://i.pravatar.cc/150?img=9',
        rating: 5,
        comment: 'Translator has been a game-changer for my international travels. Highly recommended!',
      },
      {
        id: '2',
        user: 'Jane',
        avatar: 'https://i.pravatar.cc/150?img=10',
        rating: 4,
        comment: 'The offline mode is a lifesaver when I travel to remote areas without network access.',
      },
    ],
  },
  {
    name: 'Navigation',
    packagename: 'org.navigation',
    description:
      'Turn-by-turn navigation with AR overlays. Features real-time traffic updates, lane guidance, and points of interest along your route.',
    icon_image_url: 'https://augmentos.org/wp-content/uploads/2024/11/output-008-300x300.png',
    identifier_code: 'NAVIGATION1',
    rating: 4.6,
    downloads: 5000,
    requirements: ['Display', 'Network Access', 'Camera', 'Audio', 'Location'],
    category: 'Navigation',
    screenshots: [
      'https://picsum.photos/400?random=1',
      'https://picsum.photos/400?random=2',
      'https://picsum.photos/400?random=3',
    ],
    reviews: [
      {
        id: '1',
        user: 'Alice',
        avatar: 'https://i.pravatar.cc/150?img=1',
        rating: 5,
        comment: 'Navigation has made my daily commute so much easier. The AR overlays are incredibly helpful!',
      },
      {
        id: '2',
        user: 'Bob',
        avatar: 'https://i.pravatar.cc/150?img=2',
        rating: 4,
        comment: 'The lane guidance is spot-on. Would love to see more offline map options.',
      },
      {
        id: '3',
        user: 'Charlie',
        avatar: 'https://i.pravatar.cc/150?img=3',
        rating: 5,
        comment: 'The points of interest feature helped me discover amazing local spots!',
      },
      {
        id: '4',
        user: 'David',
        avatar: 'https://i.pravatar.cc/150?img=4',
        rating: 4,
        comment: 'Real-time traffic updates are accurate. AR navigation arrows are super intuitive.',
      },
      {
        id: '5',
        user: 'Eve',
        avatar: 'https://i.pravatar.cc/150?img=5',
        rating: 5,
        comment: 'Perfect for walking navigation in cities. Love how it highlights crosswalks and pedestrian paths.',
      },
      {
        id: '6',
        user: 'Frank',
        avatar: 'https://i.pravatar.cc/150?img=6',
        rating: 4,
        comment: 'Great for both driving and walking. Battery optimization could be better.',
      },
      {
        id: '7',
        user: 'Grace',
        avatar: 'https://i.pravatar.cc/150?img=7',
        rating: 5,
        comment: 'The augmented reality features make navigation so much more intuitive than traditional GPS.',
      },
    ],
  },
  {
    name: 'Mira AI',
    packagename: 'org.mira.ai',
    description:
      'An advanced AI assistant for AR glasses that helps you interact with your environment, analyze visual information, and provide real-time insights.',
    icon_image_url:
      'https://augmentos.org/wp-content/uploads/2024/11/output-007-2048x2048.png',
    identifier_code: 'MIRAAI1',
    rating: 4.5,
    downloads: 5000,
    requirements: ['Display', 'Network Access', 'Camera', 'Audio'],
    category: 'Artificial Intelligence',
    screenshots: [
      'https://picsum.photos/400?random=1',
      'https://picsum.photos/400?random=2',
      'https://picsum.photos/400?random=3',
    ],
    reviews: [
      {
        id: '1',
        user: 'Alice',
        avatar: 'https://i.pravatar.cc/150?img=1',
        rating: 5,
        comment: 'Mira AI has completely changed how I interact with the world. The object recognition is incredible!',
      },
      {
        id: '2',
        user: 'Bob',
        avatar: 'https://i.pravatar.cc/150?img=2',
        rating: 4,
        comment: 'Great AI assistant, but sometimes struggles in low light conditions.',
      },
      {
        id: '3',
        user: 'Charlie',
        avatar: 'https://i.pravatar.cc/150?img=3',
        rating: 5,
        comment: 'The real-time translation feature is a game-changer for my international business meetings.',
      },
      {
        id: '4',
        user: 'David',
        avatar: 'https://i.pravatar.cc/150?img=4',
        rating: 5,
        comment: 'Love how it helps me identify plants and objects on my nature walks!',
      },
      {
        id: '5',
        user: 'Eve',
        avatar: 'https://i.pravatar.cc/150?img=5',
        rating: 4,
        comment: 'The visual assistance features are incredibly helpful for my daily tasks.',
      },
    ],
  },
  {
    name: 'Screen Mirror',
    packagename: 'org.screen.mirror',
    description:
      'Share your AR display with any screen instantly. Perfect for presentations, teaching, or sharing your augmented reality experience with others in real-time.',
    icon_image_url:
      'https://augmentos.org/wp-content/uploads/2024/11/output-006-768x768.png',
    identifier_code: 'MIRROR1',
    rating: 4.8,
    downloads: 3000,
    requirements: ['Display', 'Network Access', 'Screen Sharing'],
    category: 'Utilities',
    screenshots: [
      'https://picsum.photos/400?random=4',
      'https://picsum.photos/400?random=5',
    ],
    reviews: [
      {
        id: '1',
        user: 'Charlie',
        avatar: 'https://i.pravatar.cc/150?img=3',
        rating: 5,
        comment: 'Zero lag when mirroring to my smart TV. Perfect for sharing AR experiences!',
      },
      {
        id: '2',
        user: 'Diana',
        avatar: 'https://i.pravatar.cc/150?img=4',
        rating: 4,
        comment: 'Great for presentations, would love more screen layout options.',
      },
    ],
  },
  {
    name: 'Live Captions',
    packagename: 'org.captions.live',
    description:
      'Real-time speech-to-text captioning for your everyday life. Supports multiple languages, speaker identification, and seamless integration with your AR view.',
    icon_image_url:
      'https://augmentos.org/wp-content/uploads/2024/11/output-004-768x768.png',
    identifier_code: 'CAPTIONS1',
    rating: 4.9,
    downloads: 10000,
    requirements: ['Display', 'Audio', 'Network Access'],
    category: 'Accessibility',
    screenshots: [
      'https://picsum.photos/400?random=6',
      'https://picsum.photos/400?random=7',
    ],
    reviews: [
      {
        id: '1',
        user: 'Eve',
        avatar: 'https://i.pravatar.cc/150?img=5',
        rating: 5,
        comment: 'As someone with hearing loss, this app has been life-changing!',
      },
      {
        id: '2',
        user: 'Frank',
        avatar: 'https://i.pravatar.cc/150?img=6',
        rating: 5,
        comment: 'The multi-language support is fantastic for international meetings.',
      },
    ],
  },
  {
    name: 'ADHD Aid',
    packagename: 'org.adhd.aid',
    description:
      'Your personal ADHD management companion. Features visual reminders, focus timers, task breakdown assistance, and environmental distraction filtering.',
    icon_image_url:
      'https://augmentos.org/wp-content/uploads/2024/11/output-009-768x768.png',
    identifier_code: 'ADHDAID1',
    rating: 4.7,
    downloads: 7500,
    requirements: ['Display', 'Audio', 'Network Access'],
    category: 'Health',
    screenshots: [
      'https://picsum.photos/400?random=8',
      'https://picsum.photos/400?random=9',
    ],
    reviews: [
      {
        id: '1',
        user: 'Grace',
        avatar: 'https://i.pravatar.cc/150?img=7',
        rating: 5,
        comment: 'The visual task management system has helped me stay focused like never before!',
      },
      {
        id: '2',
        user: 'Henry',
        avatar: 'https://i.pravatar.cc/150?img=8',
        rating: 4,
        comment: 'Love the focus timer and distraction blocking features. Would like more customization options.',
      },
    ],
  },
];
