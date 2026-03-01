/**
 * Seed data for development / testing.
 * Pre-populates stores with 3 children and 5 entries
 * so the Home screen has content to display.
 */

import type { Child } from '@/stores/childrenStore';
import type { Entry } from '@/stores/entriesStore';

export const SEED_CHILDREN: Child[] = [
  { id: 'seed-1', name: 'Emma', birthday: '2023-10-15', colorIndex: 0 },
  { id: 'seed-2', name: 'Liam', birthday: '2021-06-22', colorIndex: 1 },
  { id: 'seed-3', name: 'Nora', birthday: '2024-03-08', colorIndex: 2 },
];

export const SEED_ENTRIES: Entry[] = [
  {
    id: 'seed-e1',
    text: 'Emma said "I love you to the moon and the stars and the back again" tonight at bedtime. She was so serious about getting the words right.',
    date: '2026-02-25T20:47:00.000Z',
    childIds: ['seed-1'],
    tags: ['bedtime', 'funny'],
    isFavorited: true,
    hasAudio: true,
    locationText: 'Tampa, FL',
  },
  {
    id: 'seed-e2',
    text: 'Liam built a tower out of every single block we own and then told me it was a "skyscraper for bugs." He spent twenty minutes on it.',
    date: '2026-02-24T18:30:00.000Z',
    childIds: ['seed-2'],
    tags: ['milestone', 'creative'],
    isFavorited: false,
    hasAudio: true,
  },
  {
    id: 'seed-e3',
    text: 'Both kids were playing together in the yard. Emma was teaching Liam how to do a somersault. He kept flopping sideways and they were both laughing so hard.',
    date: '2026-02-23T16:15:00.000Z',
    childIds: ['seed-1', 'seed-2'],
    tags: ['siblings', 'funny'],
    isFavorited: true,
    hasAudio: false,
    locationText: "Grandma's House",
  },
  {
    id: 'seed-e4',
    text: 'Nora smiled for the first time today — a real big one, not just gas. She was looking right at me.',
    date: '2026-02-22T09:10:00.000Z',
    childIds: ['seed-3'],
    tags: ['milestone', 'first'],
    isFavorited: true,
    hasAudio: true,
    locationText: 'St. Petersburg, FL',
  },
  {
    id: 'seed-e5',
    text: 'Liam asked where the sun goes at night. I told him it goes to sleep just like him. He said "but does it have a blanket?"',
    date: '2026-02-21T19:55:00.000Z',
    childIds: ['seed-2'],
    tags: ['funny', 'bedtime'],
    isFavorited: false,
    hasAudio: true,
  },
];
