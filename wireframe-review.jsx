import React, { useState, useEffect, useCallback, useRef } from "react";

const C = {
  bg: "#FAF8F5", card: "#FFFFFF", text: "#2C2420", textSoft: "#8C7E74",
  textMuted: "#B5AAA0", accent: "#E8724A", accentSoft: "#FFF0EB",
  accentGlow: "rgba(232,114,74,0.12)", heartFilled: "#E8724A", heartEmpty: "#D9D2CB",
  border: "#EDE8E3", childA: "#7BAFD4", childB: "#D4A07B", childC: "#9BC49B",
  general: "#B5AAA0", tag: "#F3EDE8", danger: "#D94F4F", overlay: "rgba(44,36,32,0.45)",
};

const paperTex = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`;

const CHILDREN = [
  { name: "All", color: C.general }, { name: "Emma", color: C.childA },
  { name: "Liam", color: C.childB }, { name: "Nora", color: C.childC },
];

const ENTRIES = [
  { id: 1, date: "Tue, Feb 17", time: "8:47 PM", children: ["Emma"], ages: { Emma: "2y 4m" }, tags: ["funny", "first"], text: "Emma tried to put her shoes on by herself today and got both on the wrong feet. She was so proud of herself she did a little dance around the kitchen...", loved: true, hasAudio: true },
  { id: 2, date: "Mon, Feb 16", time: "9:12 PM", children: ["Liam", "Emma"], ages: { Liam: "4y 1m", Emma: "2y 4m" }, tags: ["milestone"], text: "Liam read his first full sentence out loud tonight at bedtime. Emma sat next to him and clapped after every word. He read 'The cat sat on the mat' and...", loved: false, hasAudio: true },
  { id: 3, date: "Sun, Feb 15", time: "8:30 PM", children: ["Nora"], ages: { Nora: "8m" }, tags: ["bedtime"], text: "Nora finally slept through the whole night for the first time. I almost didn't believe it when I woke up at 6 and realized she hadn't cried once...", loved: true, hasAudio: true },
  { id: 4, date: "Sat, Feb 14", time: "9:01 PM", children: ["Liam"], ages: { Liam: "4y 1m" }, tags: ["funny"], text: "Liam asked me if butterflies dream. I told him I didn't know and he said 'probably about flowers' and went back to his cereal without missing a beat...", loved: false, hasAudio: true },
  { id: 5, date: "Fri, Feb 13", time: "8:55 PM", children: ["Emma", "Nora"], ages: { Emma: "2y 4m", Nora: "8m" }, tags: ["sweet"], text: "Emma held Nora's hand while I was changing her and started singing a made-up lullaby. It was mostly just 'baby baby baby' but Nora was mesmerized...", loved: true, hasAudio: true },
];

const WELCOME_PROMPT = "What did your little one do today that you never want to forget?";
const REC_PROMPTS = ["What was the highlight of today?", "Any new words or phrases?", "What made them laugh the hardest?", "Did they try something for the first time?", "What's something you don't want to forget?"];
const FREQ_TAGS = ["funny", "milestone", "first", "sweet", "bedtime", "outing", "words", "siblings"];
const DATE_PRESETS = ["Last 7 days", "Last 30 days", "Last 3 months", "All time"];

const gs = `
@keyframes pulseGlow { 0%,100%{box-shadow:0 0 20px rgba(232,114,74,0.25),0 4px 20px rgba(232,114,74,0.2)} 50%{box-shadow:0 0 40px rgba(232,114,74,0.4),0 4px 28px rgba(232,114,74,0.3)} }
@keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
@keyframes scaleIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
@keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
@keyframes ringPulse { 0%{transform:scale(1);opacity:0.12} 100%{transform:scale(1.7);opacity:0} }
@keyframes bannerIn { from{transform:translateY(-100%);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes panelIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
*::-webkit-scrollbar{display:none} *{-ms-overflow-style:none;scrollbar-width:none}
`;

// ==================== SUB-STATE CONFIG ====================

const SUB_STATES = {
  recording: [
    { id: "prompts", label: "Prompts" },
    { id: "recording", label: "Recording" },
  ],
  detail: [
    { id: "viewing", label: "Viewing" },
    { id: "child-picker", label: "Child Picker" },
    { id: "tag-editor", label: "Tag Editor" },
    { id: "delete-confirm", label: "Delete Confirm" },
  ],
  search: [
    { id: "default", label: "Default" },
    { id: "date-picker", label: "Date Picker Open" },
    { id: "no-results", label: "No Results" },
  ],
  home: [
    { id: "multi-child", label: "Multi-Child" },
    { id: "single-child", label: "Single Child" },
    { id: "first-entry", label: "First Entry" },
  ],
  ob_child: [
    { id: "empty", label: "Empty" },
    { id: "multi", label: "Children Added" },
  ],
};

function getDefaultSubState(screenId) {
  const states = SUB_STATES[screenId];
  return states ? states[0].id : null;
}

// ==================== FLOW MAP DATA ====================

const SCREEN_INFO = {
  // Onboarding
  ob_signin: {
    label: "Sign In", mode: "onboarding",
    purpose: "Authentication and first impression. Sets the emotional tone before any setup begins.",
    features: ["Apple Sign-In", "Google Sign-In", "Email auth", "Legal links (Terms, Privacy)"],
    connects: ["ob_child"],
  },
  ob_child: {
    label: "Add Child", mode: "onboarding",
    purpose: "Create child profiles. Parents can add all their children before proceeding — building their whole family book.",
    features: ["Name input (required)", "Birthday picker (required — powers age stamps on every entry)", "Nickname (optional, used for voice auto-detection)", "All fields visible upfront — no hidden expanders", "Multi-child loop: added children shown as colored pills", "\"Add another child\" link after first child", "Button disabled until name + birthday provided"],
    states: [
      { id: "empty", purpose: "Fresh form — no children added yet" },
      { id: "multi", purpose: "One or more children already added, shown as pills above the form" },
    ],
    connects: ["ob_signin", "ob_mic"],
  },
  ob_mic: {
    label: "Mic Permission", mode: "onboarding",
    purpose: "Pre-permission primer. Explains why before iOS asks, improving grant rates.",
    features: ["Privacy reassurance", "Control reassurance (button-initiated only)", "Graceful fallback if denied"],
    connects: ["ob_child", "ob_notif"],
  },
  ob_notif: {
    label: "Notifications", mode: "onboarding",
    purpose: "Set up the nightly bedtime reminder that drives the journaling habit.",
    features: ["Time picker with 8:30 PM default", "Opt-out available (\"Not now\")", "Framed as \"gentle nudge\" not \"notification\""],
    connects: ["ob_mic", "ob_record"],
  },
  ob_record: {
    label: "First Recording", mode: "onboarding",
    purpose: "The climax of onboarding — capturing the first memory. Reuses the empty state screen with personalized copy.",
    features: ["Personalized prompt with child's name", "Pulsing mic button", "Text entry fallback", "60-second recording limit"],
    connects: ["ob_notif", "ob_saved", "ob_write"],
  },
  ob_write: {
    label: "First Memory (Text)", mode: "onboarding",
    purpose: "Text alternative to voice recording during onboarding. Simple text field with child pre-selected from profile setup.",
    features: ["Child pill pre-populated from onboarding", "Georgia serif text area", "Save button disabled until text entered", "Back arrow to return to recording screen"],
    connects: ["ob_record", "ob_saved"],
  },
  ob_saved: {
    label: "Memory Saved", mode: "onboarding",
    purpose: "Emotional payoff after first recording. Acknowledges the moment without overproducing it.",
    features: ["Heart animation entrance", "Child name in confirmation", "\"Kept forever\" promise"],
    connects: ["ob_record", "ob_paywall"],
  },
  ob_paywall: {
    label: "Paywall", mode: "onboarding",
    purpose: "Convert to trial subscriber after the parent has already experienced core value.",
    features: ["Annual/monthly pricing with annual pre-selected", "7-day free trial", "Visible dismiss button (no dark patterns)", "Restore purchase link"],
    connects: ["ob_saved", "home"],
  },
  // Main App
  empty: {
    label: "Empty State", mode: "main",
    purpose: "Edge case — shown when a user has deleted all entries. Warm invitation to start recording again.",
    features: ["Radial gradient warmth backdrop", "Prompt card with paper texture", "Pulsing mic button with glow animation", "\"or write instead\" text entry option", "fadeInUp entrance animation"],
    connects: ["recording", "detail"],
  },
  home: {
    label: "Home", mode: "main",
    purpose: "Central hub. Browse entries, filter by child, launch recording or text entry.",
    features: ["Heart icon in top bar navigates to Core Memories", "Multi-child: tab filters (All + per-child)", "Single-child: warm pill with age + memory count", "First-entry: celebration banner + single glowing card (post-onboarding payoff)", "Entry cards (date / child pills / tags / preview)", "Gradient fade bottom area", "Record mic button + \"or write\" text entry option"],
    states: [
      { id: "multi-child", purpose: "Default — child tabs across top for filtering (All, Emma, Liam, Nora)" },
      { id: "single-child", purpose: "Only one child registered — no tabs, shows warm pill with age + memory count" },
      { id: "first-entry", purpose: "Post-onboarding — celebration banner, single glowing entry card, encouraging copy" },
    ],
    connects: ["search", "recording", "corememories", "settings", "detail"],
  },
  recording: {
    label: "Recording", mode: "main",
    purpose: "Capture a voice entry. Focused and distraction-free. Goes directly to Entry Detail after stop.",
    features: ["Prompt cards (age-bracketed, shuffled)", "Warm radial gradient backdrop matching onboarding", "Large 96px pulsing mic button", "Breathing circle visualization with timer", "60-second auto-stop", "Stop button navigates directly to Detail (no child-select step)"],
    states: [
      { id: "prompts", purpose: "Pre-recording — prompt cards visible, mic button ready" },
      { id: "recording", purpose: "Active recording — prompts fade, breathing circle + timer shown, stop button replaces mic" },
    ],
    connects: ["home", "detail"],
  },
  detail: {
    label: "Entry Detail", mode: "main",
    purpose: "View, edit, and enrich a single journal entry. Auto-detects children from transcript after recording.",
    features: [
      "Metadata strip: date/time left, child pills with × right",
      "Age line below pills (e.g. \"Emma 2y 4m · Liam 4y 1m\")",
      "× on pill removes child; × on last child opens picker in swap mode",
      "+ button opens child picker (hidden when all children tagged)",
      "Child picker: toggle pills for all children, stays open for multi-select, tap outside to close",
      "Zero-child protection: picker won't close until at least one child selected",
      "Auto-detect hint on low-confidence entries (multi-child from recording)",
      "Editable transcript (Georgia serif, paper texture)",
      "Tag row with add/remove + tag editor panel",
      "Audio playback bar with scrub",
      "Heart toggle (Core Memory)",
      "Soft delete with 30-day recovery confirmation dialog",
      "Post-recording \"Memory saved\" banner (auto-dismisses)",
    ],
    states: [
      { id: "viewing", purpose: "Default — reading/editing the entry, all panels closed" },
      { id: "child-picker", purpose: "Inline child picker open with toggle pills for adding/removing/swapping children" },
      { id: "tag-editor", purpose: "Tag editor panel open — type new tag or select from frequent tags" },
      { id: "delete-confirm", purpose: "Delete confirmation dialog overlay with 30-day recovery note" },
    ],
    connects: ["home", "recording", "search", "corememories"],
  },
  search: {
    label: "Search", mode: "main",
    purpose: "Find any memory across the full archive.",
    features: ["Full-text search input (auto-focuses keyboard)", "Child filter chips (multi-select)", "Tag filter chips", "Date range filter (presets: Last 7 days, Last month, Last 3 months, Custom)", "Result cards with highlighted search matches", "Warm empty state when no results match"],
    states: [
      { id: "default", purpose: "Search bar focused, filters visible, results shown" },
      { id: "date-picker", purpose: "Date range preset picker expanded" },
      { id: "no-results", purpose: "No results match — warm empty state with suggestion to try different keywords" },
    ],
    connects: ["home", "detail"],
  },
  corememories: {
    label: "♡ Core Memories", mode: "main",
    purpose: "The app's emotional centerpiece — a curated treasure box of the parent's most meaningful moments. Visually elevated from Home.",
    features: [
      "Warm gradient background (#F9F2EB → cream) — distinct from Home's flat background",
      "Georgia serif title — matches the journal feel, unlike system sans on other screens",
      "Memory count (\"♡ 3 memories saved\")",
      "Child tab filters (All + per-child)",
      "Larger cards with Georgia serif transcript preview (3 lines vs. Home's 2)",
      "Warm amber glow border on cards",
      "Inline audio play button on each card (plays without navigating to Detail)",
      "Play button has stopPropagation — tapping audio area stays on this screen",
      "Empty state in serif: \"Tap the heart on any entry to save it as a Core Memory\"",
    ],
    connects: ["home", "detail"],
  },
  settings: {
    label: "Settings", mode: "main",
    purpose: "App configuration, child management, subscription, data controls.",
    features: ["Children list (name, birthday, add/edit/delete)", "Reminder time picker + toggle", "Subscription status + manage link", "Recently Deleted section (accent-bordered, prominent — not buried)", "Data export", "Account deletion", "About/legal links"],
    connects: ["home"],
  },
  notification: {
    label: "Notification", mode: "main",
    purpose: "Push notification mockup showing the personalized nightly bedtime prompt.",
    features: [
      "Personalized prompt with child's name (\"What made Emma smile today?\")",
      "Age reference line (\"She's 2 years, 4 months old — these days go fast.\")",
      "Record action button (opens Recording)",
      "Remind Me Later (30-min snooze)",
      "Warm gradient background behind notification card",
    ],
    connects: ["recording", "home"],
  },
};

// ==================== ICONS ====================

const I = {
  Gear: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Back: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  Heart: ({ filled, sz = 20 }) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill={filled ? C.heartFilled : "none"} stroke={filled ? C.heartFilled : C.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Mic: ({ sz = 28 }) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  MicSoft: ({ sz = 56 }) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Pencil: ({ sz = 18, c: col }) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col || C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  XSmall: ({ c: col }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={col || C.textSoft} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill={C.accent} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Del: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Plus: ({ sz = 14, c: col }) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col || C.textMuted} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Check: ({ sz = 14, c: col }) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col || "white"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Cal: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Wand: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M11 6.2L9.7 5"/><path d="M11 11.8L9.7 13"/><path d="m8 21 8-8"/></svg>,
  Apple: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.65-2.2.46-3.06-.4C3.79 16.16 4.36 9.58 8.69 9.35c1.25.07 2.12.72 2.88.77.98-.2 1.92-.87 2.97-.79 1.26.1 2.21.6 2.83 1.52-2.59 1.55-1.97 4.96.36 5.92-.47 1.24-.68 1.74-1.68 3.51zM12.03 9.28C11.88 7.15 13.6 5.4 15.63 5.25c.3 2.39-2.18 4.2-3.6 4.03z"/></svg>,
  Google: () => <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
  Mail: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  Bell: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Wave: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.5" strokeLinecap="round"><path d="M2 12h2l3-7 4 14 4-10 3 6h4"/></svg>,
  SearchIcon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Grid: ({ active }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? C.accent : C.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
};

// ==================== SHARED COMPONENTS ====================

function Dot({ color, sz = 8 }) { return <span style={{ width: sz, height: sz, borderRadius: sz / 2, background: color, flexShrink: 0, display: "inline-block" }} />; }
function CPill({ name, color }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, background: color + "20", fontSize: 12, fontWeight: 600, color }}><Dot color={color} sz={6} />{name}</span>; }
function Tag({ label, onRemove }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 8, background: C.tag, fontSize: 11, color: C.textSoft, fontWeight: 500 }}>{label}{onRemove && <span onClick={e => { e.stopPropagation(); onRemove(); }} style={{ cursor: "pointer", marginLeft: 2, display: "flex" }}><I.XSmall c={C.textMuted} /></span>}</span>; }

function FadeUp({ children, delay = 0 }) {
  const [v, setV] = useState(false);
  useEffect(() => { const t = setTimeout(() => setV(true), delay); return () => clearTimeout(t); }, [delay]);
  return <div style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.4s ease, transform 0.4s ease" }}>{children}</div>;
}

function ECard({ entry, onClick, delay = 0 }) {
  const ic = entry.loved;
  return <FadeUp delay={delay}><div onClick={onClick} style={{ background: C.card, backgroundImage: paperTex, borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer", boxShadow: ic ? `0 0 0 1.5px ${C.accent}30, 0 2px 8px ${C.accentGlow}` : "0 1px 3px rgba(44,36,32,0.06)", border: ic ? `1px solid ${C.accent}25` : `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>{entry.children.map(c => { const ch = CHILDREN.find(x => x.name === c); return <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: ch?.color || C.general }}><Dot color={ch?.color || C.general} sz={7} />{c}</span>; })}</div>
      <span style={{ fontSize: 11, color: C.textMuted }}>· {entry.date} · {entry.time}</span>
      <div style={{ marginLeft: "auto" }}>{ic && <I.Heart filled sz={14} />}</div>
    </div>
    <p style={{ fontSize: 14.5, color: C.text, lineHeight: 1.55, margin: 0, fontWeight: 450, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{entry.text}</p>
  </div></FadeUp>;
}

function Confirm({ title, msg, label, color, onOk, onNo }) {
  return <div style={{ position: "absolute", inset: 0, zIndex: 50, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, borderRadius: 40 }} onClick={onNo}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 18, padding: "24px 22px 18px", width: "100%", maxWidth: 300, boxShadow: "0 12px 40px rgba(44,36,32,0.2)" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.5, marginBottom: 20 }}>{msg}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onNo} style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: C.tag, border: "none", fontSize: 14, fontWeight: 600, color: C.textSoft, cursor: "pointer" }}>Cancel</button>
        <button onClick={onOk} style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: color || C.accent, border: "none", fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer" }}>{label}</button>
      </div>
    </div>
  </div>;
}

function Phone({ children, label }) {
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
    <div style={{
      width: 375, minWidth: 375, height: 780, minHeight: 780,
      background: C.bg, borderRadius: 40, border: `3px solid ${C.text}`,
      overflow: "hidden", position: "relative",
      boxShadow: "0 8px 32px rgba(44,36,32,0.12)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ height: 50, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", paddingBottom: 4 }}><div style={{ width: 120, height: 28, borderRadius: 14, background: C.text }} /></div>
      {children}
    </div>
  </div>;
}

function Btn({ label, onClick, disabled }) {
  return <button onClick={disabled ? undefined : onClick} style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", fontSize: 15, fontWeight: 700, cursor: disabled ? "default" : "pointer", background: disabled ? C.border : C.accent, color: disabled ? C.textMuted : "white", transition: "all 0.15s" }}>{label}</button>;
}

// ==================== ONBOARDING SCREENS ====================

function OB_SignIn({ onNav }) {
  return <Phone label="Sign In">
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 30px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, fontFamily: "'Georgia', serif", margin: "0 0 12px", letterSpacing: -0.5 }}>Core Memories</h1>
        <p style={{ fontSize: 15, color: C.textSoft, fontFamily: "'Georgia', serif", fontStyle: "italic", margin: 0 }}>You'll never forget the little things.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
        <button onClick={() => onNav("ob_child")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", height: 50, borderRadius: 14, background: "#000", border: "none", color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer" }}><I.Apple />Continue with Apple</button>
        <button onClick={() => onNav("ob_child")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", height: 50, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 15, fontWeight: 600, cursor: "pointer" }}><I.Google />Continue with Google</button>
        <button onClick={() => onNav("ob_child")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", height: 50, borderRadius: 14, background: C.tag, border: "none", color: C.textSoft, fontSize: 15, fontWeight: 600, cursor: "pointer" }}><I.Mail />Continue with Email</button>
      </div>
      <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", lineHeight: 1.5, paddingBottom: 20 }}>By continuing, you agree to our <span style={{ color: C.accent }}>Terms of Service</span> and <span style={{ color: C.accent }}>Privacy Policy</span></p>
    </div>
  </Phone>;
}

function OB_Child({ onNav, subState }) {
  const isMulti = subState === "multi";
  const [name, setName] = useState("");
  const [bday, setBday] = useState("");
  const [addedChildren, setAddedChildren] = useState(
    isMulti ? [
      { name: "Emma", bday: "Oct 15, 2023", color: C.childA },
      { name: "Liam", bday: "Jan 3, 2022", color: C.childB },
    ] : []
  );
  useEffect(() => {
    setName(""); setBday("");
    setAddedChildren(isMulti ? [
      { name: "Emma", bday: "Oct 15, 2023", color: C.childA },
      { name: "Liam", bday: "Jan 3, 2022", color: C.childB },
    ] : []);
  }, [subState]);

  const hasChildren = addedChildren.length > 0;
  const heading = hasChildren
    ? "Anyone else?"
    : name.trim()
      ? <>Let's start <span style={{ color: C.accent }}>{name.trim()}</span>'s memory book</>
      : "Who are we remembering?";
  const canAdd = name.trim() && bday;

  return <Phone label="Add Child">
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "6px 20px", display: "flex", alignItems: "center" }}>
        <div style={{ cursor: "pointer" }} onClick={() => onNav("ob_signin")}><I.Back /></div>
      </div>
      <div style={{ padding: "16px 24px 0", textAlign: "center" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Georgia', serif", margin: "0 0 16px", lineHeight: 1.4 }}>{heading}</h2>
      </div>

      {hasChildren && (
        <div style={{ margin: "0 20px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {addedChildren.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, background: c.color + "15", border: `1.5px solid ${c.color}30` }}>
              <Dot color={c.color} sz={8} />
              <span style={{ fontSize: 13, fontWeight: 600, color: c.color }}>{c.name}</span>
              {c.bday && <span style={{ fontSize: 11, color: C.textMuted }}>{c.bday}</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ margin: "0 20px", background: C.card, backgroundImage: paperTex, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={hasChildren ? "Next child's name" : "Their name"} style={{ width: "100%", border: "none", outline: "none", fontSize: 16, fontFamily: "'Georgia', serif", color: C.text, background: "transparent", padding: "10px 0", borderBottom: `1px solid ${C.border}` }} />
        <div onClick={() => setBday(bday ? "" : "Oct 15, 2023")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
          <I.Cal />
          <span style={{ fontSize: 14, color: bday ? C.text : C.textMuted, fontWeight: bday ? 500 : 400 }}>{bday || "Birthday"}</span>
          {bday && <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}>✓</span>}
        </div>
        <input placeholder="Nickname (optional)" style={{ width: "100%", border: "none", outline: "none", fontSize: 14, color: C.text, background: "transparent", padding: "10px 0" }} />
      </div>

      <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        {hasChildren ? (
          <>
            <Btn label={canAdd ? `Add ${name.trim()} & continue` : name.trim() ? "Add a birthday to continue" : "Continue"} onClick={() => onNav("ob_mic")} disabled={name.trim() && !bday} />
            {canAdd && (
              <button onClick={() => {}} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.accent, fontWeight: 600, padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <I.Plus sz={13} c={C.accent} />Add another child
              </button>
            )}
          </>
        ) : (
          <Btn label={canAdd ? `Add ${name.trim()}` : name.trim() ? "Add a birthday to continue" : "Enter a name to continue"} onClick={() => {}} disabled={!canAdd} />
        )}
      </div>
    </div>
  </Phone>;
}

function OB_Mic({ onNav }) {
  return <Phone label="Mic Permission">
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px", textAlign: "center" }}>
      <div style={{ marginBottom: 28 }}><I.MicSoft sz={56} /></div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Georgia', serif", margin: "0 0 16px" }}>One tap to capture a memory</h2>
      <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.6, margin: "0 0 36px" }}>Core Memories uses your microphone to record your voice. Nothing is ever recorded without you pressing the button — and your recordings stay private.</p>
      <Btn label="Allow microphone" onClick={() => onNav("ob_notif")} />
    </div>
  </Phone>;
}

function OB_Notif({ onNav }) {
  const [time, setTime] = useState("8:30 PM");
  const times = ["7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"];
  const [showPicker, setShowPicker] = useState(false);
  return <Phone label="Notifications">
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px", textAlign: "center" }}>
      <div style={{ marginBottom: 24 }}><I.Bell /></div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Georgia', serif", margin: "0 0 12px" }}>We'll send a gentle nudge each evening</h2>
      <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.6, margin: "0 0 28px" }}>A quiet reminder after bedtime — so you can capture the day before it slips away.</p>
      <div onClick={() => setShowPicker(!showPicker)} style={{ cursor: "pointer", marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 600, color: C.text, fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
      {showPicker && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
        {times.map(t => <button key={t} onClick={() => { setTime(t); setShowPicker(false); }} style={{ padding: "6px 12px", borderRadius: 14, border: time === t ? `1.5px solid ${C.accent}` : `1.5px solid ${C.border}`, background: time === t ? C.accentSoft : C.card, color: time === t ? C.accent : C.textSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t}</button>)}
      </div>}
      <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 24px" }}>You can change this anytime in Settings</p>
      <Btn label={`Remind me at ${time}`} onClick={() => onNav("ob_record")} />
      <button onClick={() => onNav("ob_record")} style={{ background: "none", border: "none", color: C.textSoft, fontSize: 13, marginTop: 14, cursor: "pointer", fontWeight: 500 }}>Not now</button>
    </div>
  </Phone>;
}

function OB_Record({ onNav }) {
  return <Phone label="First Recording">
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 40%, rgba(244,226,214,0.45) 0%, rgba(250,248,245,0) 70%)" }} />
      <div style={{ padding: "6px 20px 0", display: "flex", alignItems: "center", position: "relative" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.5, fontFamily: "'Georgia', serif" }}>Core Memories</span>
      </div>
      <div style={{ position: "relative", padding: "40px 28px 0", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeInUp 0.6s ease both" }}>
        <div style={{ background: C.card, backgroundImage: paperTex, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", fontSize: 18, color: C.text, lineHeight: 1.5, fontFamily: "'Georgia', serif", fontWeight: 500, boxShadow: "0 2px 12px rgba(44,36,32,0.06)", width: "100%", textAlign: "center", marginBottom: 28 }}>
          What's something <span style={{ color: C.accent }}>Emma</span> did today that made you smile?
        </div>
        <p style={{ fontSize: 15, color: C.textSoft, lineHeight: 1.65, margin: "0 0 12px", textAlign: "center" }}>Tap the mic and talk for up to 60 seconds. We'll save your words — and your voice — forever.</p>
        <p style={{ fontSize: 14, color: C.accent, lineHeight: 1.5, margin: "0 0 36px", fontWeight: 400, opacity: 0.8, fontStyle: "italic" }}>Your first memory is waiting.</p>
        <button onClick={() => onNav("ob_saved")} style={{ width: 96, height: 96, borderRadius: 48, background: C.accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "pulseGlow 2.5s ease-in-out infinite" }}><I.Mic sz={42} /></button>
        <div style={{ marginTop: 16 }}>
          <button onClick={() => onNav("ob_write")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.textSoft, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}><I.Pencil sz={14} c={C.textSoft} />or write instead</button>
        </div>
      </div>
    </div>
  </Phone>;
}

function OB_Write({ onNav }) {
  const [text, setText] = useState("");
  return <Phone label="First Memory (Text)">
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 40%, rgba(244,226,214,0.45) 0%, rgba(250,248,245,0) 70%)" }} />
      <div style={{ padding: "6px 20px", display: "flex", alignItems: "center", position: "relative" }}>
        <div style={{ cursor: "pointer" }} onClick={() => onNav("ob_record")}><I.Back /></div>
      </div>
      <div style={{ position: "relative", padding: "16px 24px 0", display: "flex", flexDirection: "column", flex: 1, animation: "fadeInUp 0.6s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <CPill name="Emma" color={C.childA} />
          <span style={{ fontSize: 12, color: C.textMuted }}>2y 4m</span>
        </div>
        <div style={{ background: C.card, backgroundImage: paperTex, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write your first memory about Emma..."
            style={{
              width: "100%", flex: 1, border: "none", outline: "none", resize: "none",
              fontSize: 16, fontFamily: "'Georgia', serif", color: C.text, background: "transparent",
              lineHeight: 1.65, padding: 0,
            }}
          />
        </div>
        <div style={{ padding: "16px 0 24px" }}>
          <Btn label={text.trim() ? "Save memory" : "Write something to continue"} onClick={() => onNav("ob_saved")} disabled={!text.trim()} />
        </div>
      </div>
    </div>
  </Phone>;
}

function OB_Saved({ onNav }) {
  return <Phone label="Memory Saved">
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px", textAlign: "center" }}>
      <div style={{ animation: "scaleIn 0.4s ease both", marginBottom: 20 }}><I.Heart filled sz={40} /></div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: "'Georgia', serif", margin: "0 0 10px", lineHeight: 1.3 }}>Emma's first memory, saved.</h2>
      <p style={{ fontSize: 14, color: C.textSoft, margin: "0 0 48px" }}>Your voice and your words — kept forever.</p>
      <Btn label="Keep going" onClick={() => onNav("ob_paywall")} />
    </div>
  </Phone>;
}

function OB_Paywall({ onNav }) {
  const [plan, setPlan] = useState("annual");
  const trialEnd = new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return <Phone label="Paywall">
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ padding: "6px 20px", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ cursor: "pointer" }} onClick={() => onNav("home")}><I.X /></div>
      </div>
      <div style={{ padding: "0 28px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: "'Georgia', serif", margin: "0 0 24px", textAlign: "center" }}>Keep every memory safe</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
          {[{ icon: <I.MicSoft sz={18} />, text: "Unlimited voice & text memories" }, { icon: <I.Wave />, text: "Your recordings preserved forever" }, { icon: <I.SearchIcon />, text: "Search, organize, and relive anytime" }].map((r, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>{r.icon}<span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{r.text}</span></div>)}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button onClick={() => setPlan("monthly")} style={{ flex: 1, padding: "16px 12px", borderRadius: 14, cursor: "pointer", textAlign: "center", border: plan === "monthly" ? `2px solid ${C.accent}` : `2px solid ${C.border}`, background: plan === "monthly" ? C.accentSoft : C.card }}>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>Monthly</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>$5.99</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>/month</div>
          </button>
          <button onClick={() => setPlan("annual")} style={{ flex: 1, padding: "16px 12px", borderRadius: 14, cursor: "pointer", textAlign: "center", border: plan === "annual" ? `2px solid ${C.accent}` : `2px solid ${C.border}`, background: plan === "annual" ? C.accentSoft : C.card, position: "relative" }}>
            <span style={{ position: "absolute", top: -10, right: 12, background: C.accent, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>Save 30%</span>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>Annual</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>$49.99</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>/year · $4.17/mo</div>
          </button>
        </div>
        <Btn label="Start your free trial" onClick={() => onNav("home")} />
        <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", lineHeight: 1.5, margin: "12px 0 8px" }}>7-day free trial, cancel anytime.<br />You won't be charged until {trialEnd}.</p>
        <button style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", textAlign: "center", width: "100%" }}>Already subscribed? Restore purchase</button>
      </div>
    </div>
  </Phone>;
}

// ==================== MAIN APP SCREENS ====================

function EmptyState({ onNav }) {
  return <Phone label="Empty State (Edge Case)">
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 40%, rgba(244,226,214,0.45) 0%, rgba(250,248,245,0) 70%)" }} />
      <div style={{ padding: "6px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.5, fontFamily: "'Georgia', serif" }}>Core Memories</span>
        <div style={{ cursor: "pointer" }}><I.Gear /></div>
      </div>
      <div style={{ position: "relative", padding: "40px 28px 0", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeInUp 0.6s ease both" }}>
        <div style={{ background: C.card, backgroundImage: paperTex, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", fontSize: 18, color: C.text, lineHeight: 1.5, fontFamily: "'Georgia', serif", fontWeight: 500, boxShadow: "0 2px 12px rgba(44,36,32,0.06)", width: "100%", textAlign: "center", marginBottom: 28 }}>{WELCOME_PROMPT}</div>
        <p style={{ fontSize: 15, color: C.textSoft, lineHeight: 1.65, margin: "0 0 12px", textAlign: "center" }}>No memories yet. Tap the mic and talk for up to 60 seconds — we'll handle the rest.</p>
        <p style={{ fontSize: 14, color: C.accent, lineHeight: 1.5, margin: "0 0 36px", fontWeight: 400, opacity: 0.8, fontStyle: "italic" }}>Ready when you are.</p>
        <button onClick={() => onNav("recording")} style={{ width: 96, height: 96, borderRadius: 48, background: C.accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "pulseGlow 2.5s ease-in-out infinite" }}><I.Mic sz={42} /></button>
        <div style={{ marginTop: 16 }}><button onClick={() => onNav("detail-new")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.textSoft, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}><I.Pencil sz={14} c={C.textSoft} />or write instead</button></div>
      </div>
    </div>
  </Phone>;
}

function Home({ onNav, subState }) {
  const singleChild = subState === "single-child";
  const firstEntry = subState === "first-entry";
  const TABS = [{ name: "All", color: C.general }, ...CHILDREN.slice(1)];
  const [tab, setTab] = useState("All");
  let filtered = tab === "All" ? ENTRIES : ENTRIES.filter(e => e.children.includes(tab));
  const memoryCount = ENTRIES.length;
  const firstEntryData = ENTRIES[0];
  return <Phone label="Home Screen">
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar — title + search pill / heart / gear */}
      <div style={{ padding: "6px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.5, fontFamily: "'Georgia', serif" }}>Core Memories</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!firstEntry && <div onClick={() => onNav("search")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: C.tag, border: `1px solid ${C.border}` }}>
            <I.Search />
            <span style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>Search</span>
          </div>}
          {!firstEntry && <div style={{ cursor: "pointer" }} onClick={() => onNav("corememories")}><I.Heart filled={false} sz={20} /></div>}
          <div style={{ cursor: "pointer" }} onClick={() => onNav("settings")}><I.Gear /></div>
        </div>
      </div>

      {firstEntry ? (
        /* ---- First Entry celebration state ---- */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Celebration banner */}
          <div style={{ margin: "16px 16px 0", padding: "16px 20px", borderRadius: 16, background: `linear-gradient(135deg, ${C.accentSoft} 0%, rgba(255,240,235,0.5) 100%)`, border: `1.5px solid ${C.accent}30`, animation: "fadeInUp 0.5s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>✨</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Your first memory is saved</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>This is where all your memories will live. Record another anytime — they only get more precious with time.</p>
          </div>

          {/* Single child info row */}
          <div style={{ padding: "14px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, background: C.childA + "20", border: `2px solid ${C.childA}`, boxShadow: `0 2px 8px ${C.childA}18` }}>
              <Dot color={C.childA} sz={8} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.childA }}>{firstEntryData.children[0]}</span>
            </div>
            <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>{firstEntryData.ages[firstEntryData.children[0]]}</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>·</span>
            <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>1 memory</span>
          </div>

          {/* Single entry card with warm glow */}
          <div style={{ padding: "6px 16px 140px", animation: "fadeInUp 0.6s ease 0.2s both" }}>
            <div style={{ borderRadius: 16, border: `1.5px solid ${C.accent}40`, boxShadow: `0 0 20px ${C.accent}18, 0 2px 12px rgba(44,36,32,0.06)` }}>
              <ECard entry={firstEntryData} onClick={() => onNav("detail", firstEntryData)} delay={0} />
            </div>
          </div>
        </div>
      ) : (
        /* ---- Normal Home states (single-child / multi-child) ---- */
        <>
          {singleChild ? (
            <div style={{ padding: "12px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, background: C.childA + "20", border: `2px solid ${C.childA}`, boxShadow: `0 2px 8px ${C.childA}18` }}>
                <Dot color={C.childA} sz={8} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.childA }}>Emma</span>
              </div>
              <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>2y 4m</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>·</span>
              <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>{memoryCount} memories</span>
            </div>
          ) : (
            <div style={{ padding: "12px 0 6px", display: "flex", gap: 6, overflowX: "auto", paddingLeft: 20, paddingRight: 20 }}>
              {TABS.map(c => <button key={c.name} onClick={() => setTab(c.name)} style={{ padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, border: tab === c.name ? `2px solid ${c.color}` : "2px solid transparent", background: tab === c.name ? c.color + "20" : C.card, color: tab === c.name ? c.color : C.textMuted, boxShadow: tab === c.name ? `0 2px 8px ${c.color}18` : "0 1px 3px rgba(44,36,32,0.04)", flexShrink: 0 }}>{c.name !== "All" && <Dot color={c.color} sz={8} />}{c.name}</button>)}
            </div>
          )}
          <div style={{ flex: 1, overflow: "auto", padding: "6px 16px 140px" }}>{filtered.map((e, i) => <ECard key={e.id} entry={e} onClick={() => onNav("detail", e)} delay={i * 60} />)}</div>
        </>
      )}

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, pointerEvents: "none" }}>
        <div style={{ height: 70, background: `linear-gradient(to bottom, rgba(250,248,245,0) 0%, rgba(250,248,245,0.55) 55%, ${C.bg} 100%)` }} />
        <div style={{ background: C.bg, paddingBottom: 20, paddingTop: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <button onClick={() => onNav("recording")} style={{ width: 68, height: 68, borderRadius: 34, background: C.accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", pointerEvents: "auto", boxShadow: "0 4px 20px rgba(232,114,74,0.35)" }}><I.Mic sz={30} /></button>
          <button onClick={() => onNav("detail-new")} style={{ background: "none", border: "none", cursor: "pointer", pointerEvents: "auto", fontSize: 12, color: C.textSoft, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}><I.Pencil sz={12} c={C.textSoft} />or write instead</button>
        </div>
      </div>
    </div>
  </Phone>;
}

function Recording({ onNav, subState }) {
  const forceRec = subState === "recording";
  const [rec, setRec] = useState(forceRec);
  const [promptIdx, setPromptIdx] = useState(0);
  useEffect(() => { setRec(forceRec); setPromptIdx(0); }, [subState]);
  const showPrompts = !rec;
  const nextPrompt = () => setPromptIdx(i => (i + 1) % REC_PROMPTS.length);
  return <Phone label="Recording Screen">
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
      {showPrompts && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 40%, rgba(244,226,214,0.45) 0%, rgba(250,248,245,0) 70%)" }} />}
      <div style={{ padding: "6px 20px", position: "relative" }}><div style={{ cursor: "pointer" }} onClick={() => { setRec(false); onNav("home"); }}><I.X /></div></div>

      {showPrompts && <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 28px 0", animation: "fadeInUp 0.6s ease both" }}>
        <div key={promptIdx} style={{ background: C.card, backgroundImage: paperTex, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", fontSize: 18, color: C.text, lineHeight: 1.5, fontFamily: "'Georgia', serif", fontWeight: 500, boxShadow: "0 2px 12px rgba(44,36,32,0.06)", width: "100%", textAlign: "center", marginBottom: 20, animation: "fadeInUp 0.3s ease both" }}>{REC_PROMPTS[promptIdx]}</div>
        <button onClick={nextPrompt} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.textMuted, fontWeight: 500, padding: "8px 0", display: "flex", alignItems: "center", gap: 5, marginBottom: 28 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          Another prompt
        </button>
        <p style={{ fontSize: 15, color: C.textSoft, lineHeight: 1.65, margin: "0 0 12px", textAlign: "center" }}>Tap the mic and talk for up to 60 seconds.</p>
        <p style={{ fontSize: 14, color: C.accent, lineHeight: 1.5, margin: "0 0 32px", fontWeight: 400, opacity: 0.8, fontStyle: "italic" }}>We'll save your words — and your voice.</p>
        <button onClick={() => setRec(true)} style={{ width: 96, height: 96, borderRadius: 48, background: C.accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "pulseGlow 2.5s ease-in-out infinite" }}><I.Mic sz={42} /></button>
      </div>}

      {rec && <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${C.accent}`, animation: "ringPulse 2s ease-out infinite" }} />
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: "rgba(232,114,74,0.15)", animation: "breathe 3s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 300, color: C.text, fontVariantNumeric: "tabular-nums" }}>0:00</span>
          </div>
        </div>
        <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>Recording...</span>
      </div>}

      {rec && <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <button onClick={() => onNav("detail-from-rec", ENTRIES[0])} style={{ width: 80, height: 80, borderRadius: 16, background: C.accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 12px rgba(232,114,74,0.2)" }}><div style={{ width: 24, height: 24, borderRadius: 3, background: "white" }} /></button>
      </div>}
    </div>
  </Phone>;
}

function Detail({ entry, onNav, isNew, fromRecording, subState }) {
  const e = entry || ENTRIES[0];
  const [loved, setLoved] = useState(e.loved);
  const [tags, setTags] = useState(e.tags);
  const [selectedChildren, setSelectedChildren] = useState(e.children);
  const forceTE = subState === "tag-editor";
  const forceDel = subState === "delete-confirm";
  const forceCP = subState === "child-picker";
  const [showTE, setShowTE] = useState(forceTE);
  const [showDel, setShowDel] = useState(forceDel);
  const [localCP, setLocalCP] = useState(false);
  const showCP = forceCP || localCP;
  const setShowCP = setLocalCP;
  const [bannerPhase, setBannerPhase] = useState(fromRecording ? "in" : "none");
  const lowConfidence = fromRecording && e.children.length > 1;

  useEffect(() => { setShowTE(forceTE); }, [forceTE]);
  useEffect(() => { setShowDel(forceDel); }, [forceDel]);
  useEffect(() => { setLocalCP(false); }, [forceCP]);

  useEffect(() => {
    if (bannerPhase === "in") { const t = setTimeout(() => setBannerPhase("fading"), 2500); return () => clearTimeout(t); }
    if (bannerPhase === "fading") { const t = setTimeout(() => setBannerPhase("collapsing"), 400); return () => clearTimeout(t); }
    if (bannerPhase === "collapsing") { const t = setTimeout(() => setBannerPhase("none"), 300); return () => clearTimeout(t); }
  }, [bannerPhase]);

  const [swapFrom, setSwapFrom] = useState(null);
  const handleRemoveChild = (name) => {
    if (selectedChildren.length === 1) {
      setSwapFrom(name);
      setShowCP(true);
    } else {
      setSelectedChildren(prev => prev.filter(n => n !== name));
    }
  };

  return <Phone label={isNew ? "Entry Detail (Text)" : fromRecording ? "Entry Detail (From Recording)" : "Entry Detail"}>
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideUp 0.3s ease both" }}>
      <div style={{ padding: "6px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ cursor: "pointer" }} onClick={() => onNav("home")}><I.Back /></div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ cursor: "pointer" }} onClick={() => setLoved(!loved)}><I.Heart filled={loved} /></div>
          <div style={{ cursor: "pointer" }} onClick={() => setShowDel(true)}><I.Del /></div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 20px 20px" }}>
        {bannerPhase !== "none" && (
          <div style={{ background: C.accentSoft, borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: bannerPhase === "collapsing" ? 0 : "12px 16px", marginBottom: bannerPhase === "collapsing" ? 0 : 12, maxHeight: bannerPhase === "collapsing" ? 0 : 50, opacity: bannerPhase === "fading" || bannerPhase === "collapsing" ? 0 : 1, animation: bannerPhase === "in" ? "bannerIn 0.35s ease-out" : undefined, transition: bannerPhase === "fading" ? "opacity 0.4s ease-in" : bannerPhase === "collapsing" ? "max-height 0.3s ease, margin-bottom 0.3s ease, padding 0.3s ease" : undefined, overflow: "hidden", display: "flex", alignItems: "center", gap: 6 }}>
            <I.Heart filled sz={12} />
            <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Memory saved</span>
          </div>
        )}

        {/* Metadata strip — date/time left, child pills with ×/+ right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{e.date}</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>{e.time}</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {selectedChildren.map(c => { const ch = CHILDREN.find(x => x.name === c); return (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: (ch?.color || C.general) + "20", fontSize: 13, fontWeight: 700, color: ch?.color || C.general }}>
                <Dot color={ch?.color || C.general} sz={8} />{c}
                <span onClick={(ev) => { ev.stopPropagation(); handleRemoveChild(c); }} style={{ cursor: "pointer", marginLeft: 2, fontSize: 11, opacity: 0.6, lineHeight: 1 }}>×</span>
              </span>
            ); })}
            {/* + button — hidden when all children already tagged */}
            {selectedChildren.length < CHILDREN.length - 1 && (
              <span onClick={() => { setSwapFrom(null); setShowCP(!showCP); }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 12, background: C.tag, border: `1.5px solid ${C.border}`, cursor: "pointer", fontSize: 14, color: C.textMuted, fontWeight: 500, lineHeight: 1 }}>+</span>
            )}
          </div>
        </div>
        {/* Age line — subtle reference below pills */}
        <div style={{ marginBottom: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: C.textMuted }}>
            {selectedChildren.map((c, i) => { const age = e.ages?.[c]; return age ? `${c} ${age}` : null; }).filter(Boolean).join(" · ")}
          </span>
        </div>

        {/* Low-confidence auto-detect hint */}
        {lowConfidence && !showCP && (
          <div style={{ marginBottom: 8, marginTop: -4 }}>
            <span style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>Auto-detected · tap × to remove or + to add</span>
          </div>
        )}

        {/* Inline child picker — toggle pills, stays open until tap outside */}
        {showCP && (
          <div style={{ background: C.card, borderRadius: 14, padding: "12px 16px", border: `1px solid ${C.border}`, marginBottom: 10, animation: "fadeInUp 0.2s ease both" }}>
            {swapFrom && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Switch from <span style={{ fontWeight: 600, color: C.text }}>{swapFrom}</span>:</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CHILDREN.slice(1).map(c => {
                const sel = selectedChildren.includes(c.name);
                return <button key={c.name} onClick={() => {
                  if (swapFrom && !sel) {
                    // Swap mode — replace swapFrom with this child
                    setSelectedChildren(prev => [...prev.filter(n => n !== swapFrom), c.name]);
                    setSwapFrom(null);
                  } else {
                    // Normal toggle
                    setSelectedChildren(prev => sel ? prev.filter(n => n !== c.name) : [...prev, c.name]);
                  }
                }} style={{
                  padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 6,
                  border: sel ? `2px solid ${c.color}` : `2px solid ${C.border}`,
                  background: sel ? c.color + "20" : C.card,
                  color: sel ? c.color : C.textMuted,
                  transition: "all 0.15s",
                }}><Dot color={c.color} sz={8} />{c.name}{sel && <I.Check sz={10} c={c.color} />}</button>;
              })}
            </div>
            {selectedChildren.length === 0 && <div style={{ fontSize: 11, color: C.accent, marginTop: 8, fontWeight: 500 }}>Select at least one child</div>}
          </div>
        )}

        {/* Tags row */}
        {!showCP && <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {tags.map(t => <Tag key={t} label={t} onRemove={() => setTags(tags.filter(x => x !== t))} />)}
          <span onClick={() => setShowTE(!showTE)} style={{ fontSize: 11, color: C.textMuted, cursor: "pointer", fontWeight: 500, padding: "2px 6px", display: "flex", alignItems: "center", gap: 2 }}><I.Plus sz={11} c={C.textMuted} /> add</span>
        </div>}

        {showTE && <div style={{ background: C.card, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}`, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", background: C.bg, borderRadius: 10, padding: "9px 12px", marginBottom: 12, border: `1px solid ${C.border}` }}><span style={{ fontSize: 13, color: C.textMuted }}>Type a new tag...</span></div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 8, letterSpacing: 0.5 }}>YOUR FREQUENT TAGS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{FREQ_TAGS.map(t => <button key={t} onClick={() => { if (!tags.includes(t)) setTags([...tags, t]); setShowTE(false); }} style={{ padding: "5px 12px", borderRadius: 16, background: tags.includes(t) ? C.accent + "20" : C.tag, border: "none", fontSize: 12, fontWeight: 500, color: tags.includes(t) ? C.accent : C.textSoft, cursor: "pointer" }}>{t}</button>)}</div>
        </div>}

        {/* Transcript — tap here closes picker */}
        <div onClick={() => { if (showCP && selectedChildren.length > 0) { setShowCP(false); setSwapFrom(null); } }} style={{ background: C.card, backgroundImage: paperTex, borderRadius: 14, padding: "18px", border: `1px solid ${C.border}`, minHeight: 220, fontSize: 15, color: C.text, lineHeight: 1.65, fontFamily: "'Georgia', serif" }}>{isNew ? <span style={{ color: C.textMuted, fontStyle: "italic" }}>Start typing your memory...</span> : e.text}</div>
        {!isNew && <div style={{ textAlign: "center", marginTop: 10 }}><span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>All changes saved</span></div>}
      </div>
      {e.hasAudio && !isNew && <div style={{ padding: "12px 20px 24px", display: "flex", alignItems: "center", gap: 12, borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><I.Play /></div>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.border, position: "relative" }}><div style={{ position: "absolute", left: 0, top: 0, width: "35%", height: "100%", borderRadius: 2, background: C.accent }} /></div>
        <span style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>0:18 / 0:47</span>
      </div>}
    </div>
    {showDel && <Confirm title="Delete this memory?" msg="This entry will be moved to Recently Deleted and permanently removed after 30 days." label="Delete" color={C.danger} onOk={() => { setShowDel(false); onNav("home"); }} onNo={() => setShowDel(false)} />}
  </Phone>;
}

function SearchScr({ onNav, subState }) {
  const [sc, setSc] = useState([]);
  const [st, setSt] = useState([]);
  const [df, setDf] = useState("All time");
  const forceDatePicker = subState === "date-picker";
  const [sdp, setSdp] = useState(forceDatePicker);
  useEffect(() => { setSdp(forceDatePicker); }, [forceDatePicker]);
  const tog = (a, s, v) => s(a.includes(v) ? a.filter(x => x !== v) : [...a, v]);
  return <Phone label="Search Screen">
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "6px 20px", display: "flex", alignItems: "center" }}><div style={{ cursor: "pointer" }} onClick={() => onNav("home")}><I.Back /></div><span style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: C.text }}>Search</span><div style={{ width: 22 }} /></div>
      <div style={{ padding: "8px 20px" }}><div style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px" }}><I.Search /><span style={{ fontSize: 14, color: C.textMuted }}>Search all memories...</span></div></div>
      <div style={{ padding: "8px 20px 4px" }}>
        <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>Children</span><div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{CHILDREN.slice(1).map(c => { const s = sc.includes(c.name); return <button key={c.name} onClick={() => tog(sc, setSc, c.name)} style={{ padding: "5px 12px", borderRadius: 16, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, border: s ? `1.5px solid ${c.color}` : `1.5px solid ${C.border}`, background: s ? c.color + "18" : C.card, color: s ? c.color : C.textMuted }}><Dot color={c.color} sz={6} />{c.name}{s && <I.Check sz={10} c={c.color} />}</button>; })}</div></div>
        <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>Tags</span><div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{FREQ_TAGS.slice(0, 6).map(t => { const s = st.includes(t); return <button key={t} onClick={() => tog(st, setSt, t)} style={{ padding: "5px 10px", borderRadius: 14, cursor: "pointer", fontSize: 11, fontWeight: 500, border: s ? `1.5px solid ${C.accent}` : `1.5px solid ${C.border}`, background: s ? C.accent + "15" : C.card, color: s ? C.accent : C.textSoft }}>{t}</button>; })}</div></div>
        <div style={{ marginBottom: 6 }}><button onClick={() => setSdp(!sdp)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 14, cursor: "pointer", fontSize: 11, fontWeight: 600, color: C.textSoft, border: `1.5px solid ${C.border}`, background: C.card }}><I.Cal />{df}<span style={{ fontSize: 10, marginLeft: 2 }}>{sdp ? "▲" : "▼"}</span></button>
        {sdp && <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{DATE_PRESETS.map(d => <button key={d} onClick={() => { setDf(d); setSdp(false); }} style={{ padding: "5px 10px", borderRadius: 14, cursor: "pointer", fontSize: 11, fontWeight: 500, border: df === d ? `1.5px solid ${C.accent}` : `1.5px solid ${C.border}`, background: df === d ? C.accent + "15" : C.card, color: df === d ? C.accent : C.textSoft }}>{d}</button>)}</div>}</div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "4px 16px 20px" }}>
        {subState === "no-results" ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🧸</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>No memories found</div>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>Try different words or fewer filters — the moment you're looking for might be hiding under a different name.</div>
          </div>
        ) : (
          ENTRIES.slice(0, 3).map((e, i) => <ECard key={e.id} entry={e} onClick={() => onNav("detail", e)} delay={i * 60} />)
        )}
      </div>
    </div>
  </Phone>;
}

function CoreMem({ onNav }) {
  const [tab, setTab] = useState("All");
  const loved = ENTRIES.filter(e => e.loved);
  const f = tab === "All" ? loved : loved.filter(e => e.children.includes(tab));
  return <Phone label="♡ Core Memories">
    <style>{gs}</style>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: `linear-gradient(180deg, #F9F2EB 0%, ${C.bg} 35%)` }}>
      {/* Header with warm glow */}
      <div style={{ padding: "6px 20px 12px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: 8 }}>
          <div style={{ cursor: "pointer" }} onClick={() => onNav("home")}><I.Back /></div>
          <span style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: C.text, fontFamily: "'Georgia', serif", letterSpacing: 0.3 }}>Core Memories</span>
          <div style={{ width: 22 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <I.Heart filled sz={14} />
          <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{loved.length} {loved.length === 1 ? "memory" : "memories"} saved</span>
        </div>
      </div>
      {/* Child tabs */}
      <div style={{ padding: "0 20px 8px", display: "flex", gap: 8, overflowX: "auto" }}>{CHILDREN.map(c => <button key={c.name} onClick={() => setTab(c.name)} style={{ padding: "7px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, border: tab === c.name ? `2px solid ${c.color}` : "2px solid transparent", background: tab === c.name ? c.color + "20" : C.card, color: tab === c.name ? c.color : C.textMuted, boxShadow: tab === c.name ? `0 2px 8px ${c.color}18` : "0 1px 3px rgba(44,36,32,0.04)" }}>{c.name !== "All" && <Dot color={c.color} sz={8} />}{c.name}</button>)}</div>
      {/* Larger, warmer cards */}
      <div style={{ flex: 1, overflow: "auto", padding: "6px 16px 20px" }}>{f.length > 0 ? f.map((e, i) => (
        <FadeUp key={e.id} delay={i * 60}><div onClick={() => onNav("detail", e)} style={{
          background: C.card, backgroundImage: paperTex, borderRadius: 16, padding: "18px 18px 14px", marginBottom: 12, cursor: "pointer",
          boxShadow: `0 0 0 1.5px ${C.accent}25, 0 3px 12px ${C.accent}10`,
          border: `1px solid ${C.accent}20`,
        }}>
          {/* Child pills + date */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            {e.children.map(c => { const ch = CHILDREN.find(x => x.name === c); return <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: ch?.color || C.general }}><Dot color={ch?.color || C.general} sz={7} />{c}</span>; })}
            <span style={{ fontSize: 11, color: C.textMuted }}>· {e.date}</span>
            <div style={{ marginLeft: "auto" }}><I.Heart filled sz={13} /></div>
          </div>
          {/* Larger serif preview — 3 lines */}
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.6, margin: "0 0 10px", fontFamily: "'Georgia', serif", fontWeight: 400, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{e.text}</p>
          {/* Audio play hint */}
          {e.hasAudio && <div onClick={(ev) => ev.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><I.Play /></div>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: C.border }} />
            <span style={{ fontSize: 10, color: C.textMuted }}>0:{e.text.length > 100 ? "47" : "23"}</span>
          </div>}
        </div></FadeUp>
      )) : <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ marginBottom: 12 }}><I.Heart filled={false} sz={32} /></div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, fontFamily: "'Georgia', serif" }}>Tap the heart on any entry<br/>to save it as a Core Memory.</div>
      </div>}</div>
    </div>
  </Phone>;
}

function Settings({ onNav }) {
  const secs = [
    { t: "Children", i: [{ label: "Emma — Born Oct 15, 2023" }, { label: "Liam — Born Jan 3, 2022" }, { label: "Nora — Born Jun 20, 2025" }, { label: "+ Add Child", accent: true }] },
    { t: "Reminder", i: [{ label: "Time: 8:30 PM" }, { label: "Enabled: On" }] },
    { t: "Subscription", i: [{ label: "Plan: Core Memories Premium" }, { label: "Manage Subscription" }] },
    { t: "Recently Deleted", i: [{ label: "View deleted memories", sublabel: "Entries are kept for 30 days", accent: true }] },
    { t: "Data & Privacy", i: [{ label: "Export All Entries" }, { label: "Delete Account", danger: true }] },
    { t: "About", i: [{ label: "Version 1.0.0" }, { label: "Privacy Policy" }, { label: "Terms of Service" }, { label: "Contact Support" }] },
  ];
  return <Phone label="Settings">
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "6px 20px", display: "flex", alignItems: "center" }}><div style={{ cursor: "pointer" }} onClick={() => onNav("home")}><I.Back /></div><span style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: C.text }}>Settings</span><div style={{ width: 22 }} /></div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 20px 20px" }}>{secs.map(s => <div key={s.t} style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>{s.t}</span>
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${s.t === "Recently Deleted" ? C.accent + "40" : C.border}`, marginTop: 8, overflow: "hidden" }}>
          {s.i.map((item, i) => <div key={i} style={{ padding: "13px 16px", fontSize: 14, color: item.danger ? C.danger : item.accent ? C.accent : C.text, fontWeight: item.accent || item.danger ? 600 : 400, borderBottom: i < s.i.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{item.label}</span>
            {item.sublabel && <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>{item.sublabel}</span>}
          </div>)}
        </div>
      </div>)}</div>
    </div>
  </Phone>;
}

function Notif({ onNav }) {
  return <Phone label="Push Notification">
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: `linear-gradient(180deg, ${C.bg} 0%, #F5F0EB 100%)` }}>
      <div style={{ width: "100%", background: "rgba(255,255,255,0.94)", backdropFilter: "blur(20px)", borderRadius: 20, padding: "16px 18px", boxShadow: "0 4px 24px rgba(44,36,32,0.12)", border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><I.Mic sz={16} /></div><div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Core Memories</div><div style={{ fontSize: 11, color: C.textMuted }}>now</div></div></div>
        <p style={{ fontSize: 14, color: C.text, margin: "0 0 4px", lineHeight: 1.4, fontWeight: 500 }}>What made Emma smile today?</p>
        <p style={{ fontSize: 11.5, color: C.textMuted, margin: "0 0 14px" }}>She's 2 years, 4 months old — these days go fast.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onNav("recording")} style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: C.accent, color: "white", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Record</button>
          <button style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: C.tag, color: C.textSoft, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Remind me later</button>
        </div>
      </div>
    </div>
  </Phone>;
}

// ==================== FLOW MAP ====================

const CONNECTIONS = {
  onboarding: [
    { from: "ob_signin", to: "ob_child", label: "continue", type: "primary" },
    { from: "ob_child", to: "ob_mic", label: "continue", type: "primary" },
    { from: "ob_child", to: "ob_child", label: "add another", type: "secondary" },
    { from: "ob_mic", to: "ob_notif", label: "allow", type: "primary" },
    { from: "ob_notif", to: "ob_record", label: "continue", type: "primary" },
    { from: "ob_record", to: "ob_saved", label: "voice", type: "primary" },
    { from: "ob_record", to: "ob_write", label: "write instead", type: "secondary" },
    { from: "ob_write", to: "ob_saved", label: "save", type: "secondary" },
    { from: "ob_saved", to: "ob_paywall", label: "continue", type: "primary" },
    { from: "ob_paywall", to: "home", label: "→ first-entry", type: "primary" },
  ],
  main: [
    // Primary tree: Home → branches
    { from: "home", to: "recording", label: "tap mic", type: "primary" },
    { from: "home", to: "detail", label: "tap write (new text entry)", type: "secondary" },
    { from: "home", to: "search", label: "tap search", type: "primary" },
    { from: "home", to: "corememories", label: "tap ♡", type: "primary" },
    { from: "home", to: "settings", label: "tap gear", type: "primary" },
    // Primary pipeline: Recording → Detail
    { from: "recording", to: "detail", label: "save entry", type: "primary" },
    // Secondary: browse screens → Detail
    { from: "home", to: "detail", label: "tap card", type: "secondary" },
    { from: "search", to: "detail", label: "tap result", type: "secondary" },
    { from: "corememories", to: "detail", label: "tap card", type: "secondary" },
    // Notification entry
    { from: "notification", to: "recording", label: "tap record", type: "accent" },
    { from: "notification", to: "home", label: "open app", type: "secondary" },
    // Return paths
    { from: "detail", to: "home", label: "back", type: "return" },
    { from: "recording", to: "home", label: "cancel", type: "return" },
    { from: "search", to: "home", label: "back", type: "return" },
    { from: "corememories", to: "home", label: "back", type: "return" },
    { from: "settings", to: "home", label: "back", type: "return" },
  ],
};

function FlowMap({ mode, onSelectScreen, selectedScreen, onClose }) {
  const info = selectedScreen ? SCREEN_INFO[selectedScreen] : null;
  const [showReturns, setShowReturns] = useState(false);
  const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const ico = (id) => ({ home: "🏠", notification: "🔔", recording: "🎙️", detail: "📝", search: "🔍", corememories: "♡", settings: "⚙️", ob_signin: "🔐", ob_child: "👶", ob_mic: "🎤", ob_notif: "🔔", ob_record: "🎙️", ob_write: "✏️", ob_saved: "💛", ob_paywall: "💳" }[id] || "📄");
  const lbl = (id) => SCREEN_INFO[id]?.label || id;

  // ---- SVG Primitives ----
  const Defs = () => (
    <defs>
      <marker id="af" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M1,0.8 L7,3 L1,5.2" fill="none" stroke={C.textSoft} strokeWidth="1.3" strokeLinecap="round" /></marker>
      <marker id="as" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto"><path d="M1,0.5 L6,2.5 L1,4.5" fill="none" stroke={C.textMuted} strokeWidth="1" strokeLinecap="round" opacity="0.6" /></marker>
      <marker id="aa" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M1,0.8 L7,3 L1,5.2" fill="none" stroke={C.accent} strokeWidth="1.3" strokeLinecap="round" /></marker>
      <marker id="ar" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto"><path d="M1,0.5 L6,2.5 L1,4.5" fill="none" stroke={C.textMuted} strokeWidth="1" strokeLinecap="round" opacity="0.4" /></marker>
      <filter id="ns" x="-4%" y="-8%" width="108%" height="120%"><feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(44,36,32,0.06)" /></filter>
    </defs>
  );

  // Node card
  const N = ({ id, x, y, w, h, pos }) => {
    const p = pos ? pos[id] : { x, y, w, h };
    if (!p) return null;
    const sel = selectedScreen === id;
    const isHub = id === "home";
    const isExt = id === "notification";
    const isCore = id === "recording" || id === "detail";
    return (
      <g onClick={() => onSelectScreen(selectedScreen === id ? null : id)} style={{ cursor: "pointer" }}>
        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={isExt ? 14 : 10}
          fill={sel ? C.accentSoft : C.card}
          stroke={sel ? C.accent : isHub ? C.text : isExt ? C.textMuted : isCore ? C.textSoft : C.border}
          strokeWidth={sel ? 2.5 : isHub ? 2.5 : isCore ? 2 : 1.5}
          strokeDasharray={isExt ? "6 3" : "none"} filter="url(#ns)" />
        <text x={p.x + 12} y={p.y + p.h / 2 + 1} fontSize={12} dominantBaseline="central">{ico(id)}</text>
        <text x={p.x + 28} y={p.y + p.h / 2 + 1} fontSize={11} fontWeight={700} fill={sel ? C.accent : C.text}
          dominantBaseline="central" fontFamily={F}>{lbl(id)}</text>
      </g>
    );
  };

  // Connection path with smart exit/entry point selection
  const Conn = ({ from, to, type, label, positions, exitSide, entrySide }) => {
    const pf = positions[from], pt = positions[to];
    if (!pf || !pt) return null;
    const isRet = type === "return";
    const isSec = type === "secondary";
    const isAcc = type === "accent";
    if (isRet && !showReturns) return null;

    // Determine exit and entry points
    let sx, sy, tx, ty;
    const fcx = pf.x + pf.w / 2, fcy = pf.y + pf.h / 2;
    const tcx = pt.x + pt.w / 2, tcy = pt.y + pt.h / 2;

    // Allow explicit side overrides, otherwise auto-detect
    const eSide = exitSide || (tcx > fcx + 30 ? "right" : tcx < fcx - 30 ? "left" : tcy > fcy ? "bottom" : "top");
    const nSide = entrySide || (fcx < tcx - 30 ? "left" : fcx > tcx + 30 ? "right" : fcy < tcy ? "top" : "bottom");

    const retOff = isRet ? 8 : 0;
    if (eSide === "right") { sx = pf.x + pf.w; sy = fcy + retOff; }
    else if (eSide === "left") { sx = pf.x; sy = fcy + retOff; }
    else if (eSide === "bottom") { sx = fcx + retOff; sy = pf.y + pf.h; }
    else { sx = fcx + retOff; sy = pf.y; }

    if (nSide === "left") { tx = pt.x; ty = tcy + retOff; }
    else if (nSide === "right") { tx = pt.x + pt.w; ty = tcy + retOff; }
    else if (nSide === "top") { tx = tcx + retOff; ty = pt.y; }
    else { tx = tcx + retOff; ty = pt.y + pt.h; }

    // Build bezier
    const dx = tx - sx, dy = ty - sy;
    const isHoriz = Math.abs(dx) > Math.abs(dy);
    const d = isHoriz
      ? `M${sx},${sy} C${sx + dx * 0.5},${sy} ${tx - dx * 0.5},${ty} ${tx},${ty}`
      : `M${sx},${sy} C${sx},${sy + dy * 0.5} ${tx},${ty - dy * 0.5} ${tx},${ty}`;

    const color = isAcc ? C.accent : isRet ? C.textMuted : isSec ? C.textMuted : C.textSoft;
    const mEnd = isAcc ? "url(#aa)" : isRet ? "url(#ar)" : isSec ? "url(#as)" : "url(#af)";
    const sw = isRet ? 1 : isSec ? 1.2 : 1.5;
    const dash = isRet ? "5 3" : isSec ? "4 3" : "none";
    const op = isRet ? 0.3 : isSec ? 0.5 : isAcc ? 0.8 : 0.65;

    const mid = isHoriz ? { x: sx + dx * 0.5, y: (sy + ty) / 2 } : { x: (sx + tx) / 2, y: sy + dy * 0.5 };

    return (
      <g>
        <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={dash} strokeOpacity={op} markerEnd={mEnd} />
        {label && !isRet && (
          <g>
            <rect x={mid.x - label.length * 2.6 - 5} y={mid.y - 7} width={label.length * 5.2 + 10} height={14} rx={4} fill={C.bg} fillOpacity={0.92} />
            <text x={mid.x} y={mid.y + 1} textAnchor="middle" dominantBaseline="central"
              fontSize={8} fontWeight={600} fill={isAcc ? C.accent : C.textMuted} fontFamily={F} opacity={isSec ? 0.7 : 1}>{label}</text>
          </g>
        )}
      </g>
    );
  };

  // ---- MAIN APP: TREE LAYOUT ----
  // Root (Home) on left → branches right → Detail as leaf of Recording
  // Notification below Home as alternate entry
  const MainMap = () => {
    const nw = 135, nh = 46;  // node width/height
    const col0 = 55;          // Home column
    const col1 = 270;         // Branch column (Recording, Search, CoreMem, Settings)
    const col2 = 490;         // Leaf column (Detail)
    const rowGap = 64;
    const topPad = 55;

    const P = {
      home:         { x: col0, y: topPad + rowGap * 1.5, w: nw, h: nh },
      recording:    { x: col1, y: topPad, w: nw, h: nh },
      search:       { x: col1, y: topPad + rowGap, w: nw + 15, h: nh },
      corememories: { x: col1, y: topPad + rowGap * 2, w: nw + 15, h: nh },
      settings:     { x: col1, y: topPad + rowGap * 3, w: nw, h: nh },
      detail:       { x: col2, y: topPad + rowGap * 0.65, w: nw, h: nh },
      notification: { x: col0, y: topPad + rowGap * 3.4, w: nw, h: nh },
    };

    const W = col2 + nw + 50;
    const H = P.notification.y + nh + 50;

    // Tree branch: vertical line from Home, then horizontal to each child
    const TreeBranch = () => {
      const hx = P.home.x + P.home.w;   // right edge of Home
      const hy = P.home.y + P.home.h / 2;
      const trunkX = hx + 30;            // vertical trunk x position
      const kids = ["recording", "search", "corememories", "settings"];
      const kidYs = kids.map(k => P[k].y + P[k].h / 2);
      const minY = Math.min(...kidYs);
      const maxY = Math.max(...kidYs);

      return (
        <g>
          {/* Horizontal from Home to trunk */}
          <line x1={hx} y1={hy} x2={trunkX} y2={hy} stroke={C.textSoft} strokeWidth={2} strokeOpacity={0.5} />
          {/* Vertical trunk */}
          <line x1={trunkX} y1={minY} x2={trunkX} y2={maxY} stroke={C.textSoft} strokeWidth={2} strokeOpacity={0.5} />
          {/* Horizontal branches to each child */}
          {kids.map((k, i) => {
            const ky = P[k].y + P[k].h / 2;
            const conn = CONNECTIONS.main.find(c => c.from === "home" && c.to === k);
            return (
              <g key={k}>
                <line x1={trunkX} y1={ky} x2={P[k].x} y2={ky}
                  stroke={C.textSoft} strokeWidth={1.8} strokeOpacity={0.55} markerEnd="url(#af)" />
                {conn && (
                  <g>
                    <rect x={trunkX + 8} y={ky - 8} width={conn.label.length * 5.2 + 10} height={14} rx={4} fill={C.bg} fillOpacity={0.92} />
                    <text x={trunkX + 13 + conn.label.length * 2.6} y={ky} textAnchor="middle" dominantBaseline="central"
                      fontSize={8} fontWeight={600} fill={C.textMuted} fontFamily={F}>{conn.label}</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      );
    };

    // Primary path: Recording → Detail (solid)
    const recConn = CONNECTIONS.main.find(c => c.from === "recording" && c.to === "detail" && c.type === "primary");

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", maxWidth: W, height: "auto" }}>
        <Defs />

        {/* Tree structure: Home → branches */}
        <TreeBranch />

        {/* Primary: Recording → Detail */}
        <Conn from="recording" to="detail" type="primary" label={recConn?.label} positions={P} />

        {/* Secondary dotted: browse → Detail */}
        {CONNECTIONS.main.filter(c => c.type === "secondary" && c.to === "detail").map((c, i) =>
          <Conn key={`sec-${i}`} {...c} positions={P} />
        )}

        {/* Notification paths */}
        <Conn from="notification" to="recording" type="accent" label="tap record" positions={P} />
        <Conn from="notification" to="home" type="secondary" label="open app" positions={P} exitSide="top" entrySide="bottom" />

        {/* Return paths (toggled) */}
        {CONNECTIONS.main.filter(c => c.type === "return").map((c, i) =>
          <Conn key={`ret-${i}`} {...c} positions={P} />
        )}

        {/* Nodes (drawn last = on top) */}
        <N id="home" pos={P} />
        <N id="recording" pos={P} />
        <N id="detail" pos={P} />
        <N id="search" pos={P} />
        <N id="corememories" pos={P} />
        <N id="settings" pos={P} />
        <N id="notification" pos={P} />

        {/* Notification label */}
        <text x={P.notification.x + P.notification.w / 2} y={P.notification.y - 8}
          textAnchor="middle" fontSize={8} fontWeight={700} fill={C.textMuted} fontFamily={F} letterSpacing="0.5">EXTERNAL TRIGGER</text>

        {/* Legend */}
        <g transform={`translate(${col2 - 10}, ${H - 25})`}>
          <line x1={0} y1={0} x2={18} y2={0} stroke={C.textSoft} strokeWidth={2} strokeOpacity={0.55} />
          <text x={22} y={1} fontSize={8} fill={C.textMuted} fontFamily={F} dominantBaseline="central">Primary flow</text>
          <line x1={100} y1={0} x2={118} y2={0} stroke={C.textMuted} strokeWidth={1.2} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={122} y={1} fontSize={8} fill={C.textMuted} fontFamily={F} dominantBaseline="central">Alternate path</text>
          {showReturns && <g>
            <line x1={210} y1={0} x2={228} y2={0} stroke={C.textMuted} strokeWidth={1} strokeDasharray="5 3" opacity={0.3} />
            <text x={232} y={1} fontSize={8} fill={C.textMuted} fontFamily={F} dominantBaseline="central">Return</text>
          </g>}
        </g>
      </svg>
    );
  };

  // ---- ONBOARDING: LINEAR TREE ----
  const OnboardingMap = () => {
    const row1 = ["ob_signin", "ob_child", "ob_mic", "ob_notif"];
    const row2 = ["ob_record", "ob_saved", "ob_paywall"];
    const cw = 115, ch = 44, gap = 36, px = 20, py = 36;
    const row2y = py + ch + 64;
    const P = {};
    row1.forEach((id, i) => { P[id] = { x: px + i * (cw + gap), y: py, w: cw, h: ch }; });
    row2.forEach((id, i) => { P[id] = { x: px + i * (cw + gap), y: row2y, w: cw, h: ch }; });
    // ob_write sits below between ob_record and ob_saved
    const recX = P.ob_record.x, savedX = P.ob_saved.x;
    P.ob_write = { x: (recX + savedX) / 2 - cw / 2 + 10, y: row2y + ch + 44, w: cw, h: ch };
    const W = px + Math.max(row1.length, row2.length + 1) * (cw + gap) + 80;
    const H = row2y + ch + 44 + ch + 40;

    // Corner connector: ob_notif → ob_record (row1 end → row2 start)
    const cornerFrom = P.ob_notif;
    const cornerTo = P.ob_record;
    const cMidX = cornerFrom.x + cornerFrom.w + 18;
    const cMidY = (cornerFrom.y + cornerFrom.h / 2 + cornerTo.y + cornerTo.h / 2) / 2;

    // Self-loop on ob_child
    const childP = P.ob_child;
    const loopTop = childP.y - 20;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", maxWidth: W, height: "auto" }}>
        <Defs />
        {/* Row 1 primary connections */}
        {CONNECTIONS.onboarding.filter(c => c.type === "primary" && row1.includes(c.from) && row1.includes(c.to)).map((c, i) =>
          <Conn key={i} {...c} positions={P} />
        )}
        {/* Corner: ob_notif → ob_record */}
        <path d={`M${cornerFrom.x + cornerFrom.w + 4},${cornerFrom.y + cornerFrom.h / 2} L${cMidX},${cornerFrom.y + cornerFrom.h / 2} Q${cMidX + 8},${cornerFrom.y + cornerFrom.h / 2} ${cMidX + 8},${cornerFrom.y + cornerFrom.h / 2 + 8} L${cMidX + 8},${cornerTo.y + cornerTo.h / 2 - 8} Q${cMidX + 8},${cornerTo.y + cornerTo.h / 2} ${cMidX},${cornerTo.y + cornerTo.h / 2} L${cornerTo.x - 4},${cornerTo.y + cornerTo.h / 2}`}
          fill="none" stroke={C.textSoft} strokeWidth={1.5} markerEnd="url(#af)" />
        <rect x={cMidX - 18} y={cMidY - 8} width={52} height={16} rx={8} fill={C.bg} stroke={C.border} strokeWidth={0.5} />
        <text x={cMidX + 8} y={cMidY} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={500} fill={C.textSoft} fontFamily={F}>continue</text>
        {/* Row 2 primary connections */}
        {CONNECTIONS.onboarding.filter(c => c.type === "primary" && (row2.includes(c.from) && row2.includes(c.to))).map((c, i) =>
          <Conn key={`r2-${i}`} {...c} positions={P} />
        )}
        {/* Paywall → Main App */}
        {CONNECTIONS.onboarding.filter(c => c.from === "ob_paywall" && c.to === "home").map((c, i) =>
          <Conn key={`exit-${i}`} {...c} positions={{...P, home: { x: P.ob_paywall.x + cw + gap, y: row2y, w: 78, h: ch }}} />
        )}
        {/* Secondary: write branch */}
        {CONNECTIONS.onboarding.filter(c => c.type === "secondary" && c.from !== "ob_child").map((c, i) =>
          <Conn key={`s-${i}`} {...c} positions={P} />
        )}
        {/* Self-loop: ob_child → ob_child "add another" */}
        <path d={`M${childP.x + childP.w * 0.35},${childP.y} C${childP.x + childP.w * 0.35},${loopTop} ${childP.x + childP.w * 0.65},${loopTop} ${childP.x + childP.w * 0.65},${childP.y}`}
          fill="none" stroke={C.textMuted} strokeWidth={1.2} strokeDasharray="4,3" markerEnd="url(#as)" />
        <rect x={childP.x + childP.w / 2 - 28} y={loopTop - 10} width={56} height={14} rx={7} fill={C.bg} stroke={C.border} strokeWidth={0.5} />
        <text x={childP.x + childP.w / 2} y={loopTop - 3} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={500} fill={C.textMuted} fontFamily={F}>add another</text>
        {/* Nodes */}
        {row1.map(id => <N key={id} id={id} pos={P} />)}
        {row2.map(id => <N key={id} id={id} pos={P} />)}
        <N id="ob_write" pos={P} />
        {/* Exit pill: Main App */}
        {(() => {
          const ex = P.ob_paywall.x + cw + gap;
          return <g>
            <rect x={ex} y={row2y} width={78} height={ch} rx={12} fill={C.tag} stroke={C.border} strokeWidth={1} />
            <text x={ex + 39} y={row2y + ch / 2} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600} fill={C.textSoft} fontFamily={F}>Main App</text>
          </g>;
        })()}
      </svg>
    );
  };

  // ---- DETAIL PANEL ----
  const DetailPanel = () => {
    if (!info) return null;
    const conns = (CONNECTIONS[mode] || CONNECTIONS.main).filter(c => c.from === selectedScreen && c.type !== "return");
    const inbound = (CONNECTIONS[mode] || CONNECTIONS.main).filter(c => c.to === selectedScreen && c.type !== "return");
    const statusColor = "#9BC49B";
    return (
      <div style={{ width: 320, minWidth: 320, borderLeft: `1px solid ${C.border}`, background: C.card, padding: "20px 20px 24px", overflow: "auto", animation: "panelIn 0.25s ease-out", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{ico(selectedScreen)}</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: F }}>{info.label}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, background: C.tag, borderRadius: 8, padding: "2px 8px" }}>{info.mode === "onboarding" ? "Onboarding" : "Main App"}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: statusColor + "18", borderRadius: 8, padding: "2px 8px" }}>Designed</span>
              </div>
            </div>
          </div>
          <div onClick={onClose} style={{ cursor: "pointer", padding: 4 }}><I.X /></div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Purpose</div>
          <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.55, fontStyle: "italic" }}>{info.purpose}</div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Screen Layout</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {info.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                <span style={{ color: C.accent, fontWeight: 700, fontSize: 11, marginTop: 2, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontWeight: 450 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        {info.states && info.states.length > 0 && <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>States</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {info.states.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: "#7BAFD4", background: "#7BAFD420", borderRadius: 6, padding: "1px 7px", fontSize: 11, flexShrink: 0, whiteSpace: "nowrap" }}>{s.id}</span>
                <span style={{ color: C.textSoft }}>{s.purpose}</span>
              </div>
            ))}
          </div>
        </div>}
        {conns.length > 0 && <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Navigates To</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {conns.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => onSelectScreen(c.to)} style={{ padding: "4px 10px", borderRadius: 10, background: c.type === "accent" ? C.accentSoft : c.type === "secondary" ? C.bg : C.tag, border: c.type === "secondary" ? `1px dashed ${C.border}` : "none", fontSize: 11, fontWeight: 600, color: c.type === "accent" ? C.accent : C.textSoft, cursor: "pointer" }}>{SCREEN_INFO[c.to]?.label || c.to}</button>
                <span style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{c.label}</span>
                {c.type === "secondary" && <span style={{ fontSize: 9, color: C.textMuted, fontStyle: "italic" }}>alt</span>}
              </div>
            ))}
          </div>
        </div>}
        {inbound.length > 0 && <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Reached From</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {inbound.map((c, i) => (
              <button key={i} onClick={() => onSelectScreen(c.from)} style={{ padding: "4px 10px", borderRadius: 10, background: C.tag, border: "none", fontSize: 11, fontWeight: 600, color: C.textSoft, cursor: "pointer" }}>{SCREEN_INFO[c.from]?.label || c.from}</button>
            ))}
          </div>
        </div>}
      </div>
    );
  };

  // ---- RENDER ----
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 500 }}>
      <div style={{ flex: 1, padding: "16px 24px", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>
            {mode === "onboarding" ? "ONBOARDING FLOW" : "MAIN APP FLOW"}
          </div>
          {mode === "main" && (
            <button onClick={() => setShowReturns(!showReturns)} style={{
              padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 600, fontFamily: F,
              background: showReturns ? C.accent + "18" : C.tag,
              color: showReturns ? C.accent : C.textMuted,
            }}>{showReturns ? "Hide" : "Show"} return paths</button>
          )}
        </div>
        {mode === "onboarding" ? <OnboardingMap /> : <MainMap />}
      </div>
      {info && <DetailPanel />}
    </div>
  );
}
// ==================== MAIN APP ====================

export default function App() {
  const [mode, setMode] = useState("main");
  const [screen, setScreen] = useState("home");
  const [subState, setSubState] = useState(null);
  const [selEntry, setSelEntry] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [fromRec, setFromRec] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapSelected, setMapSelected] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollY.current && y > 60) setHeaderVisible(false);
      else setHeaderVisible(true);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const obScreens = [
    { id: "ob_signin", label: "Sign In" }, { id: "ob_child", label: "Add Child" },
    { id: "ob_mic", label: "Mic Permission" }, { id: "ob_notif", label: "Notifications" },
    { id: "ob_record", label: "First Recording" }, { id: "ob_write", label: "Write" },
    { id: "ob_saved", label: "Memory Saved" }, { id: "ob_paywall", label: "Paywall" },
  ];
  const mainScreens = [
    { id: "home", label: "Home" },
    { id: "recording", label: "Recording" }, { id: "detail", label: "Entry Detail" },
    { id: "search", label: "Search" }, { id: "corememories", label: "♡ Core" },
    { id: "settings", label: "Settings" }, { id: "notification", label: "Notification" },
  ];
  const edgeScreens = [
    { id: "empty", label: "Empty State" },
  ];
  const screens = mode === "onboarding" ? obScreens : mainScreens;
  const currentSubStates = SUB_STATES[screen] || null;
  const isEdge = screen === "empty";

  const changeScreen = useCallback((id) => {
    if (id === "detail") { setSelEntry(ENTRIES[0]); setIsNew(false); setFromRec(false); }
    setScreen(id);
    setSubState(getDefaultSubState(id));
  }, []);

  const nav = (target, data) => {
    if (target === "detail") { setSelEntry(data); setIsNew(false); setFromRec(false); setScreen("detail"); setSubState(getDefaultSubState("detail")); }
    else if (target === "detail-from-rec") { setSelEntry(data); setIsNew(false); setFromRec(true); setScreen("detail"); setSubState(getDefaultSubState("detail")); }
    else if (target === "detail-new") { setSelEntry(ENTRIES[0]); setIsNew(true); setFromRec(false); setScreen("detail"); setSubState(getDefaultSubState("detail")); }
    else if (target === "home" && mode === "onboarding") { setMode("main"); setScreen("home"); setSubState(null); }
    else { setScreen(target); setSubState(getDefaultSubState(target)); }
  };

  const switchMode = (m) => {
    setMode(m);
    const s = m === "onboarding" ? "ob_signin" : "home";
    setScreen(s);
    setSubState(getDefaultSubState(s));
    setMapSelected(null);
  };

  const toggleMap = () => {
    if (showMap && mapSelected) {
      const info = SCREEN_INFO[mapSelected];
      if (info) {
        if (info.mode === "onboarding" && mode !== "onboarding") setMode("onboarding");
        if (info.mode === "main" && mode !== "main") setMode("main");
        changeScreen(mapSelected);
      }
      setMapSelected(null);
    }
    setShowMap(!showMap);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#FFFFFF", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflowX: "auto",
    }}>
      <style>{gs}</style>
      {!headerVisible && (
        <div
          onClick={() => setHeaderVisible(true)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, height: 28, zIndex: 101,
            cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center",
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
        </div>
      )}
      <div style={{
        position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        padding: "14px 16px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", background: C.border, borderRadius: 24, padding: 3 }}>
            {["onboarding", "main"].map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                padding: "8px 24px", borderRadius: 22, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                background: mode === m ? C.text : "transparent",
                color: mode === m ? "white" : C.textSoft,
                transition: "all 0.15s", minWidth: 120,
              }}>{m === "onboarding" ? "Onboarding" : "Main App"}</button>
            ))}
          </div>
          <button onClick={toggleMap} style={{
            padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
            background: showMap ? C.accentSoft : "transparent",
            display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
          }}>
            <I.Grid active={showMap} />
            <span style={{ fontSize: 11, fontWeight: 600, color: showMap ? C.accent : C.textSoft }}>Map</span>
          </button>
        </div>
        {!showMap && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", justifyContent: "center", flexWrap: "wrap" }}>
            {screens.map(s => (
              <button key={s.id} onClick={() => changeScreen(s.id)} style={{
                padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: screen === s.id ? C.text : C.card,
                color: screen === s.id ? "white" : C.textSoft,
                transition: "all 0.15s",
              }}>{s.label}</button>
            ))}
            {mode === "main" && <>
              <span style={{ fontSize: 11, color: C.textMuted, alignSelf: "center", padding: "0 4px" }}>·</span>
              {edgeScreens.map(s => (
                <button key={s.id} onClick={() => changeScreen(s.id)} style={{
                  padding: "7px 14px", borderRadius: 10, border: `1px dashed ${C.border}`, cursor: "pointer",
                  fontSize: 12, fontWeight: 600, fontStyle: "italic",
                  background: screen === s.id ? C.textMuted : "transparent",
                  color: screen === s.id ? "white" : C.textMuted,
                  transition: "all 0.15s",
                }}>{s.label}</button>
              ))}
            </>}
          </div>
        )}
        {!showMap && currentSubStates && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 0 }}>
            {currentSubStates.map(ss => (
              <button key={ss.id} onClick={() => setSubState(ss.id)} style={{
                padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600,
                background: subState === ss.id ? C.accent : C.tag,
                color: subState === ss.id ? "white" : C.textSoft,
                transition: "all 0.15s",
              }}>{ss.label}</button>
            ))}
          </div>
        )}
      </div>
      {showMap ? (
        <FlowMap
          mode={mode}
          selectedScreen={mapSelected}
          onSelectScreen={setMapSelected}
          onClose={() => setMapSelected(null)}
        />
      ) : (
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 16px 60px" }}>
          {screen === "ob_signin" && <OB_SignIn onNav={nav} />}
          {screen === "ob_child" && <OB_Child onNav={nav} subState={subState} />}
          {screen === "ob_mic" && <OB_Mic onNav={nav} />}
          {screen === "ob_notif" && <OB_Notif onNav={nav} />}
          {screen === "ob_record" && <OB_Record onNav={nav} />}
          {screen === "ob_write" && <OB_Write onNav={nav} />}
          {screen === "ob_saved" && <OB_Saved onNav={nav} />}
          {screen === "ob_paywall" && <OB_Paywall onNav={nav} />}
          {screen === "empty" && <EmptyState onNav={nav} />}
          {screen === "home" && <Home onNav={nav} subState={subState} />}
          {screen === "recording" && <Recording onNav={nav} subState={subState} />}
          {screen === "detail" && <Detail entry={selEntry} onNav={nav} isNew={isNew} fromRecording={fromRec} subState={subState} />}
          {screen === "search" && <SearchScr onNav={nav} subState={subState} />}
          {screen === "corememories" && <CoreMem onNav={nav} />}
          {screen === "settings" && <Settings onNav={nav} />}
          {screen === "notification" && <Notif onNav={nav} />}
        </div>
      )}
    </div>
  );
}
