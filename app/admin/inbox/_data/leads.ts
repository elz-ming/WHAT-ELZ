export interface Message {
  id: string;
  from: 'lead' | 'me';
  text: string;
  time: string;
}

export interface Lead {
  id: string;
  name: string;
  company?: string;
  initials: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  messages: Message[];
  autoReply: string;
}

export interface Platform {
  id: string;
  name: string;
  accent: string;
  leads: Lead[];
}

export const PLATFORMS: Platform[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    accent: '#25D366',
    leads: [
      {
        id: 'wa-1',
        name: 'Alex Rivera',
        company: 'Riviera Group',
        initials: 'AR',
        lastMessage: 'Booked for next Tuesday 👍',
        timestamp: 'Yesterday',
        unread: 0,
        messages: [
          { id: '1', from: 'lead', text: "Saw your ad on Instagram — impressive! Can we book a call?", time: 'Yesterday 2:30 PM' },
          { id: '2', from: 'me',   text: "Absolutely! Here's my Calendly — pick any slot that works for you.", time: 'Yesterday 2:45 PM' },
          { id: '3', from: 'lead', text: 'Booked for next Tuesday 👍', time: 'Yesterday 3:02 PM' },
        ],
        autoReply: "See you Tuesday! Looking forward to it 🙌",
      },
      {
        id: 'wa-2',
        name: 'Jamie Chen',
        initials: 'JC',
        lastMessage: 'Yes please! Send it over',
        timestamp: 'Mon',
        unread: 2,
        messages: [
          { id: '1', from: 'lead', text: "Hi! Heard about your services from a friend. Do you have a portfolio I can look at?", time: 'Mon 10:55 AM' },
          { id: '2', from: 'me',   text: "Hey Jamie! Yes, sending it over now.", time: 'Mon 11:02 AM' },
          { id: '3', from: 'lead', text: 'Yes please! Send it over', time: 'Mon 11:04 AM' },
        ],
        autoReply: "Thanks! I'll take a look and get back to you 👀",
      },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    accent: '#C13584',
    leads: [
      {
        id: 'ig-1',
        name: 'Sarah Kim',
        company: 'SK Studio',
        initials: 'SK',
        lastMessage: 'Got it, will reply soon',
        timestamp: '2h',
        unread: 0,
        messages: [
          { id: '1', from: 'lead', text: "❤️ your latest post! Can we connect about your services?", time: '2h ago' },
          { id: '2', from: 'me',   text: "Thanks Sarah! Sent you a DM with more info 📩", time: '2h ago' },
          { id: '3', from: 'lead', text: 'Got it, will reply soon', time: '1h ago' },
        ],
        autoReply: "Sounds great — I'll reach out by EOD!",
      },
      {
        id: 'ig-2',
        name: 'Marcus Lim',
        initials: 'ML',
        lastMessage: 'What packages do you offer?',
        timestamp: '5h',
        unread: 1,
        messages: [
          { id: '1', from: 'lead', text: "Hey! Found you through a mutual. What packages do you offer?", time: '5h ago' },
        ],
        autoReply: "We have 3 tiers — Starter, Growth, and Scale. Want me to send the deck? 📊",
      },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    accent: '#2AABEE',
    leads: [
      {
        id: 'tg-1',
        name: 'Priya Nair',
        company: 'Nair Consulting',
        initials: 'PN',
        lastMessage: 'Perfect, looking forward to it!',
        timestamp: '10:42 AM',
        unread: 0,
        messages: [
          { id: '1', from: 'lead', text: "Hey! I was looking at your services — very interested. Do you have a package for small businesses?", time: '10:38 AM' },
          { id: '2', from: 'me',   text: "Hi Priya! Yes, we do. Let me share our SMB deck with you 😊", time: '10:40 AM' },
          { id: '3', from: 'lead', text: 'Perfect, looking forward to it!', time: '10:42 AM' },
        ],
        autoReply: "Just sent it over! Let me know if you have any questions.",
      },
      {
        id: 'tg-2',
        name: 'David Tan',
        initials: 'DT',
        lastMessage: 'Looking for a lead management solution',
        timestamp: '9:15 AM',
        unread: 1,
        messages: [
          { id: '1', from: 'lead', text: "Looking for a lead management solution for my team. Does your platform support multiple users?", time: '9:15 AM' },
        ],
        autoReply: "Yes! We support teams of all sizes. Want to jump on a 15-min call this week?",
      },
    ],
  },
  {
    id: 'email',
    name: 'Email',
    accent: '#3B82F6',
    leads: [
      {
        id: 'em-1',
        name: 'Rachel Wong',
        company: 'Wong Associates',
        initials: 'RW',
        lastMessage: 'Thank you for the quick response',
        timestamp: 'Today',
        unread: 0,
        messages: [
          { id: '1', from: 'lead', text: "Hi, I came across your profile on LinkedIn and I'm interested in your AI automation services. We're a mid-sized consulting firm looking to streamline our client intake process.", time: 'Today 9:00 AM' },
          { id: '2', from: 'me',   text: "Hi Rachel! Great to hear from you. Automating client intake is exactly what we specialise in. Can I send over a short case study and proposed approach?", time: 'Today 9:30 AM' },
          { id: '3', from: 'lead', text: "Thank you for the quick response — yes, please send it over. Our team meeting is Thursday so timing is perfect.", time: 'Today 10:00 AM' },
        ],
        autoReply: "Case study sent! Let me know what you think after Thursday's meeting 🗓️",
      },
      {
        id: 'em-2',
        name: 'Kevin Ooi',
        initials: 'KO',
        lastMessage: 'Can we schedule a demo?',
        timestamp: 'Yesterday',
        unread: 1,
        messages: [
          { id: '1', from: 'lead', text: "Hi there, saw your post about AI-powered lead generation. We've been struggling with manual follow-ups. Can we schedule a demo?", time: 'Yesterday 4:30 PM' },
        ],
        autoReply: "Absolutely Kevin! Here's my Calendly — grab any slot that works: calendly.com/whatelz 📅",
      },
    ],
  },
];
