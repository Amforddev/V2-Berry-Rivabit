import { Survey, RewardCategory } from './types';

export const MOCK_SURVEYS: Survey[] = [
  {
    id: 's1',
    title: 'Tech Habits 2026',
    berry: 150,
    time: '3 min',
    category: 'Technology',
    questions: [
      { id: 'q1', text: 'Which device do you use most often?', options: ['Smartphone', 'Laptop', 'Tablet', 'Smartwatch'] },
      { id: 'q2', text: 'How many hours a day do you spend on social media?', options: ['Less than 1', '1-3 hours', '3-5 hours', '5+ hours'] },
      { id: 'q3', text: 'Do you use AI assistants daily?', options: ['Yes, multiple times', 'Yes, occasionally', 'Rarely', 'Never'] }
    ]
  },
  {
    id: 's2',
    title: 'Consumer Preferences',
    berry: 200,
    time: '5 min',
    category: 'Shopping',
    questions: [
      { id: 'q1', text: 'Where do you prefer to shop?', options: ['Online', 'In-store', 'Both equally'] },
      { id: 'q2', text: 'What influences your buying decision the most?', options: ['Price', 'Brand reputation', 'Reviews', 'Eco-friendliness'] }
    ]
  },
  {
    id: 's3',
    title: 'Daily Commute',
    berry: 100,
    time: '2 min',
    category: 'Lifestyle',
    questions: [
      { id: 'q1', text: 'How do you usually commute?', options: ['Car', 'Public Transit', 'Bicycle', 'Walk', 'Work from home'] }
    ]
  },
  {
    id: 's4',
    title: 'Health & Fitness',
    berry: 250,
    time: '4 min',
    category: 'Health',
    questions: [
      { id: 'q1', text: 'How often do you exercise?', options: ['Daily', '3-4 times a week', '1-2 times a week', 'Rarely'] },
      { id: 'q2', text: 'Do you track your calories?', options: ['Yes, strictly', 'Sometimes', 'No'] }
    ]
  },
  {
    id: 's5',
    title: 'Entertainment Choices',
    berry: 120,
    time: '3 min',
    category: 'Entertainment',
    questions: [
      { id: 'q1', text: 'What is your favorite streaming service?', options: ['Netflix', 'Hulu', 'Disney+', 'Other'] },
      { id: 'q2', text: 'How often do you go to the cinema?', options: ['Weekly', 'Monthly', 'Rarely', 'Never'] }
    ]
  },
  {
    id: 's6',
    title: 'Food & Dining',
    berry: 180,
    time: '4 min',
    category: 'Food',
    questions: [
      { id: 'q1', text: 'How often do you eat out or order delivery?', options: ['Every day', '2-3 times a week', 'Once a week', 'Rarely'] },
      { id: 'q2', text: 'What is your favorite cuisine?', options: ['Local', 'Italian', 'Chinese', 'Mexican', 'Other'] }
    ]
  }
];

export const REWARD_CATEGORIES: RewardCategory[] = [
  {
    id: 'cash',
    title: 'Cash',
    iconName: 'Banknote',
    options: [
      { id: 'c1', title: '₦1000 to Wallet', cost: 1100, description: 'Added to your in-app wallet immediately' },
      { id: 'c2', title: '₦5000 to Wallet', cost: 5000, description: 'Added to your in-app wallet immediately' }
    ]
  },
  {
    id: 'vouchers',
    title: 'Brand Vouchers',
    iconName: 'Gift',
    options: [
      { id: 'v1', title: '₦2000 Bolt Ride', cost: 2200, description: 'Get a voucher for your next Bolt ride' },
      { id: 'v2', title: '₦5000 Jumia Voucher', cost: 5500, description: 'Shop on Jumia with a discount voucher' },
      { id: 'v3', title: '₦3000 Glovo Credits', cost: 3300, description: 'Order food and groceries on Glovo' }
    ]
  },
  {
    id: 'raffle',
    title: 'Draws & Pools',
    iconName: 'Ticket',
    options: [
      { id: 'r1', title: 'Daily Draw', cost: 10, description: 'Every day, 11:59pm. Prize: ₦5,000 (Min tier: Seedling)', status: 'Open' },
      { id: 'r2', title: 'Weekly Draw', cost: 50, description: 'Every Friday. Prize: ₦50,000 (Min tier: Sprout)', status: 'Open' },
      { id: 'r3', title: 'Monthly Draw', cost: 400, description: 'Last day of month. Prize: ₦200,000 (Min tier: Berry)', status: 'Drawing Soon' },
      { id: 'r4', title: 'Quarterly Draw', cost: 2000, description: 'End of quarter. Prize: ₦1,000,000 (Min tier: Gold Berry)', status: 'Open' },
      { id: 'r5', title: 'Yearly Draw', cost: 10000, description: 'Dec 31. Prize: ₦5,000,000 (Min tier: Diamond)', status: 'Open' }
    ]
  },
  {
    id: 'scratch',
    title: 'Scratch Cards',
    iconName: 'Grid',
    options: []
  },
  {
    id: 'wheel',
    title: 'Spin the Wheel',
    iconName: 'Dna',
    options: []
  },
  {
    id: 'predict',
    title: 'Predictions',
    iconName: 'TrendingUp',
    options: []
  },
  {
    id: 'charity',
    title: 'Charity',
    iconName: 'HeartHandshake',
    options: [
      { 
        id: 'charity1', 
        title: 'Save the Children', 
        cost: 100000, 
        description: 'Provide meals for vulnerable children. (₦1,500 value)', 
        logo: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=128&h=128&fit=crop&q=80',
        impactMessage: 'Your donation feeds 3 children for a day'
      },
      { 
        id: 'charity2', 
        title: 'Clean Water Africa', 
        cost: 50000, 
        description: 'Help build wells and provide clean drinking water. (₦750 value)',
        logo: 'https://images.unsplash.com/photo-1538300342682-1fe70792135c?w=128&h=128&fit=crop&q=80',
        impactMessage: 'Your donation provides clean water for a week'
      },
      { 
        id: 'charity3', 
        title: 'Education First', 
        cost: 200000, 
        description: 'Provide school supplies to children in need. (₦3,000 value)',
        logo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=128&h=128&fit=crop&q=80',
        impactMessage: 'Your donation buys school supplies for a term'
      }
    ]
  }
];
