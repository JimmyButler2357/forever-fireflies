/**
 * Preview data for the Welcome Preview onboarding screen.
 *
 * Shows what the app looks like with months of sample data.
 * Uses generic demo names (not personalized from onboarding).
 * Written in authentic tired-parent voice.
 */

import { childColors } from '@/constants/theme';

// ─── Demo children ──────────────────────────────────────

const PREVIEW_CHILDREN = {
  emma: { name: 'Emma', color: childColors[0].hex },
  liam: { name: 'Liam', color: childColors[1].hex },
  nora: { name: 'Nora', color: childColors[2].hex },
};

// ─── Pre-formatted card data ────────────────────────────

export interface PreviewEntry {
  childNames: string[];
  childColors: string[];
  date: string;
  time: string;
  preview: string;
  tags: string[];
  isFavorited: boolean;
  hasAudio: boolean;
}

// Recent entries (for "Your daily feed" section)
export const PREVIEW_FEED_ENTRIES: PreviewEntry[] = [
  {
    childNames: ['Emma'],
    childColors: [PREVIEW_CHILDREN.emma.color],
    date: 'Tue, Feb 24',
    time: '8:47 PM',
    preview:
      'Emma insisted on reading the bedtime story tonight. She held the book upside down and narrated the whole thing from memory.',
    tags: ['bedtime', 'funny'],
    isFavorited: false,
    hasAudio: true,
  },
  {
    childNames: ['Liam'],
    childColors: [PREVIEW_CHILDREN.liam.color],
    date: 'Mon, Feb 23',
    time: '6:30 PM',
    preview:
      "Liam made his first real friend at the park today. He walked right up to another boy and said \"I'm Liam, you wanna dig?\"",
    tags: ['milestone'],
    isFavorited: false,
    hasAudio: true,
  },
  {
    childNames: ['Nora'],
    childColors: [PREVIEW_CHILDREN.nora.color],
    date: 'Sun, Feb 22',
    time: '9:10 AM',
    preview:
      'Nora is starting to hold her head up and track faces across the room. The way she stares at Emma is something else.',
    tags: ['milestone'],
    isFavorited: false,
    hasAudio: false,
  },
  {
    childNames: ['Emma', 'Liam'],
    childColors: [PREVIEW_CHILDREN.emma.color, PREVIEW_CHILDREN.liam.color],
    date: 'Sat, Feb 21',
    time: '4:15 PM',
    preview:
      'Both kids were singing in the car \u2014 totally different songs, totally off key. Nobody cared. It was perfect.',
    tags: ['siblings', 'funny'],
    isFavorited: true,
    hasAudio: true,
  },
];

// Favorited entries (for "Your favorite moments" section)
export const PREVIEW_FAVORITES: PreviewEntry[] = [
  {
    childNames: ['Nora'],
    childColors: [PREVIEW_CHILDREN.nora.color],
    date: 'Jan 14',
    time: '7:20 PM',
    preview:
      'Nora laughed for the first time today. Big, real belly laughs. She was watching Emma dance around the kitchen.',
    tags: ['milestone', 'first'],
    isFavorited: true,
    hasAudio: true,
  },
  {
    childNames: ['Emma', 'Liam'],
    childColors: [PREVIEW_CHILDREN.emma.color, PREVIEW_CHILDREN.liam.color],
    date: 'Nov 8',
    time: '3:45 PM',
    preview:
      'Emma taught Liam how to blow bubbles today. He kept biting the wand instead. She was so patient with him.',
    tags: ['siblings'],
    isFavorited: true,
    hasAudio: true,
  },
];

// Search result entries (for "Find any memory" section)
// These contain the word "first" for the mock search highlight
export const PREVIEW_SEARCH_ENTRIES: PreviewEntry[] = [
  {
    childNames: ['Nora'],
    childColors: [PREVIEW_CHILDREN.nora.color],
    date: 'Jan 14',
    time: '7:20 PM',
    preview:
      'Nora laughed for the first time today. Big, real belly laughs. She was watching Emma dance around the kitchen.',
    tags: ['milestone', 'first'],
    isFavorited: true,
    hasAudio: true,
  },
  {
    childNames: ['Liam'],
    childColors: [PREVIEW_CHILDREN.liam.color],
    date: 'Dec 3',
    time: '8:55 PM',
    preview:
      "Liam made his first real friend at the park today. He walked right up to another boy and said \"I'm Liam, you wanna dig?\"",
    tags: ['milestone'],
    isFavorited: false,
    hasAudio: true,
  },
];
