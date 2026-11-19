export const premiumFormTemplates = [
  {
    slug: 'project-inquiry', name: 'Project inquiry', subtitle: 'Qualify new projects',
    title: 'Tell us about your project', description: '',
    theme: { primary_color: '#5138A5', secondary_color: '#35236F', background_color: '#F4F1FA', background_pattern: 'orbits' },
    blocks: [
      { type: 'short', category: 'text', question: 'Your name', required: true },
      { type: 'email', category: 'text', question: 'Email address', required: true },
      { type: 'select', category: 'choice', question: 'What do you need?', options: ['Strategy', 'Design', 'Development', 'Other'], required: true },
      { type: 'long', category: 'text', question: 'Tell us about your project', required: true },
      { type: 'select', category: 'choice', question: 'Estimated budget', options: ['Under $5,000', '$5,000–$15,000', '$15,000–$50,000', '$50,000+'], required: false },
    ],
  },
  {
    slug: 'event-rsvp', name: 'Event RSVP', subtitle: 'Plan your guest list',
    title: 'Join us', description: '',
    theme: { primary_color: '#9A493B', secondary_color: '#743227', background_color: '#FBF2EC', background_pattern: 'dots' },
    blocks: [
      { type: 'short', category: 'text', question: 'Your name', required: true },
      { type: 'email', category: 'text', question: 'Email address', required: true },
      { type: 'radio', category: 'choice', question: 'Will you attend?', options: ['Yes', 'No'], required: true },
      { type: 'long', category: 'text', question: 'Dietary requirements', required: false },
    ],
  },
  {
    slug: 'customer-feedback', name: 'Customer feedback', subtitle: 'Understand the experience',
    title: 'Share your feedback', description: '',
    theme: { primary_color: '#176D60', secondary_color: '#0C5148', background_color: '#EEF7F2', background_pattern: 'lines' },
    blocks: [
      { type: 'rating', category: 'rating', question: 'How was your experience?', required: true, max: 5 },
      { type: 'long', category: 'text', question: 'What worked well?', required: false },
      { type: 'long', category: 'text', question: 'What could be better?', required: false },
      { type: 'email', category: 'text', question: 'Email address', required: false },
    ],
  },
];
