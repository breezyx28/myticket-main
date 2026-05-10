import type { MockEngagement } from '@/types/domain';

export const MOCK_ENGAGEMENTS_SEED: MockEngagement[] = [
  {
    id: 'eng-1',
    organizerName: 'Pulse Events KSA',
    organizerId: 'org-1',
    topic: 'Festival slot — June weekend',
    preview: 'We would like to discuss performance timing and backline for the main stage…',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    organizerProfile: {
      id: 'org-1',
      name: 'Pulse Events KSA',
      bio: 'Independent promoter focused on live music and cultural festivals across the Kingdom.',
      city: 'Riyadh',
      organizerType: 'Festival Organizer',
      recentEvents: ['Riyadh Sound Festival', 'Summer Beats Weekender'],
    },
    messages: [
      {
        id: 'eng-1-msg-1',
        sender: 'organizer',
        text: 'Hi! We are interested in booking your act for our June weekend festival stage.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'eng-1-msg-2',
        sender: 'organizer',
        text: 'Can you share your availability and preferred technical setup?',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1000 * 60 * 45).toISOString(),
      },
    ],
  },
  {
    id: 'eng-2',
    organizerName: 'Coastal Live',
    organizerId: 'org-2',
    topic: 'Comedy tour support',
    preview: 'Opening act inquiry for the west coast run.',
    status: 'pending',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    organizerProfile: {
      id: 'org-2',
      name: 'Coastal Live',
      bio: 'Live comedy and theatre events operator across the west coast.',
      city: 'Jeddah',
      organizerType: 'Tour Producer',
      recentEvents: ['Comedy Night Live', 'Coastal Laughs Tour'],
    },
    messages: [
      {
        id: 'eng-2-msg-1',
        sender: 'organizer',
        text: 'We are planning a short comedy run and looking for a support performer.',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'eng-2-msg-2',
        sender: 'organizer',
        text: 'Would you be open to 4 shows in Jeddah and one in Makkah?',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1000 * 60 * 30).toISOString(),
      },
    ],
  },
];
