export interface EventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  coverImage: string;
  vibe: string;
  hostName: string;
  hostAvatar: string;
  attendees: AttendeeData[];
  attendeeCount: number;
  isPublic: boolean;
  category: string;
}

export interface AttendeeData {
  id: string;
  name: string;
  avatar: string;
  rsvpStatus: "going" | "maybe" | "not-going";
}

export interface CommentData {
  id: string;
  user: { name: string; avatar: string };
  text: string;
  timestamp: string;
  reactions: { emoji: string; count: number }[];
}

export interface VibeOption {
  id: string;
  name: string;
  image: string;
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
}

export interface BudgetItem {
  id: string;
  label: string;
  amount: number;
  paid: boolean;
}

export const vibeOptions: VibeOption[] = [
  {
    id: "neon-night",
    name: "Neon Night",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDum7glfgQ7ksLoc9EIII4CwdLQzT4T5vLeGuMv4dF79tLp_0wlSTBpa0peugOckNlxAHVN_uzTxihF04zmuEx3OMV8EO4nhaMLSNN1XlRTS3UJ6HlbL-EkY29mhL3ixi7jyHKAIvCu89TdvXem2PkhrJUvx8ee6-EyYUb6sqhZKeHgHsKdpluUqUSmtHH3u5eTX7N8wN6fChC3uWoWwTHXAXSpsm70t3QkrHLTDLABnVTqYDMoffvZ124HaFya4AN72Gdbahy0tLKL",
  },
  {
    id: "lofi",
    name: "Lofi",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDwyzv6cVz0dvYtbq60-zwqjv0eMzgatUuwd-Lf-vRxUOZTqr91Cjw3XUJLQVGYqJFKXbU4plL0F-w5dLq7aWLBeCbWaqVkd1p08-uzPkTo2GdIr3o-VY1XMaTH47661kaTsnf8Dk6CHuzW61DqC7UE6xezZ4BB249hz69hWseC6qGOm1InIy6SbUgv0cZMdKkkig9mcbrSdc5Mf1yUN4GWUzRHhPofEq-k1dQmAF84c7Emb4bQ1I0VjzVJa47YAC9Fvo7nE94W-m_G",
  },
  {
    id: "jungle",
    name: "Jungle",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCx9hSRpNgTSq_GkM-evWpDU9soplzIAhDyvMQBFTaxDIkvsh7FwvrPUnhJYbr9_JohsTHmDoiBtSsrnnzUk14Yxvl8gYMlzVstQ0GG-z9sh4-nSLN6mnX3Og6-G6MAxAc7YZ2aVTmH3OkjpFMcNQna1JbXYuMf0iqTgoAvXQQKY69waY4K6lukraEKLjUKDbYPqUprwq5KiGEA8FJu02w1E8hxH8QVBDnAwCyxefoXEZahc7t59_sffnbij_qFvG12hpA5KqhbcPG6",
  },
  {
    id: "zen",
    name: "Zen",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuChiyTbF0qJMykH3XDRS5n3mVx9hoknVM5qCY8wgo3aVHKrliYMwJAqD3ziJ9P_s2MxHxd_FxqpeUqlqR3rd9vvPxV-zsPU3TwLQW8EzAXojbu1qXydPkXHgRylEp2Zmh3L5l2ug-aohjYO6g825yRERrtCLtiBYDPapjyrD-S2l3DDga-oaOC2dIFijCe7EHIeJVdodfxphHnDE62g8LKsRdgyW4G0ZTsswLktyKbVxJqSxfJ8ERb1jmu_jDGQ4azMLGtMMxIRLis9",
  },
  {
    id: "retro",
    name: "Retro",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDum7glfgQ7ksLoc9EIII4CwdLQzT4T5vLeGuMv4dF79tLp_0wlSTBpa0peugOckNlxAHVN_uzTxihF04zmuEx3OMV8EO4nhaMLSNN1XlRTS3UJ6HlbL-EkY29mhL3ixi7jyHKAIvCu89TdvXem2PkhrJUvx8ee6-EyYUb6sqhZKeHgHsKdpluUqUSmtHH3u5eTX7N8wN6fChC3uWoWwTHXAXSpsm70t3QkrHLTDLABnVTqYDMoffvZ124HaFya4AN72Gdbahy0tLKL",
  },
];

const avatars = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBN0z5HYF9DwFZXwb2ruN7qOQqDQIs_Uea_oZrKWYdMJ4x5VLpaYIfKJNV12gwVbnkS1YkcAxypUdOz5pjTKDr-E3rDGve3T2zWyhE27KY2lv1L4IAIKWQHvmkaaYuwZ93XzbS4TVlNKsnWrcQ9Rd698N0I7KMr1xYACILIRpJhGq5hmYWmfgfXuBot30115L8YAMzKt-YlzEKP29rmqc_z8hNSVjnw4KwJgnDiNOqgvx87hhbEWso4oM7jKkuSE0oHLVsNpz89agNI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBVh2gdJpjhRYoTPfKCwg0ouLHjvd70dOxfPJzDI3cg6h6w5VwRdaC4qRQIU7i8fZCjH5xaKMiDRQ7xWxGkPRYZjPTKyPnXmLTVVHLIw_HKJ4fCh65kYMrmhCc3eiB1kwk-bLGK4bIIaGRvqWdGJW9MOIUFh1XnnGjvhxXuVLbDV2FPVlWzXC0_S1NyxRoM5QYdNpGx6KtRQUVGh2b",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCHCmtWXmx-PGsW7ZYxOAQxDBsSA1QRIbI69GgpIR2qVvVGBD58jHgSR9xyj0YJVhxdBKxUU8X4_kZj0phtgQi5j-jm7cwm2kJTaSxnkhlTH2fnr1tUbRp2V4kG_YkS7vXn1Lqb4X2GKBrHpgGiOO-aY-rmxPAqY0Y",
];

export const sampleEvents: EventData[] = [
  {
    id: "1",
    title: "Summer Rooftop Mixer",
    date: "Aug 24, 2026",
    time: "8:00 PM",
    location: "Sky Lounge, Downtown",
    description:
      "Join us for an epic rooftop party with live DJ sets, neon lights, and city views. Dress code: Come as your most vibrant self ✨",
    coverImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDum7glfgQ7ksLoc9EIII4CwdLQzT4T5vLeGuMv4dF79tLp_0wlSTBpa0peugOckNlxAHVN_uzTxihF04zmuEx3OMV8EO4nhaMLSNN1XlRTS3UJ6HlbL-EkY29mhL3ixi7jyHKAIvCu89TdvXem2PkhrJUvx8ee6-EyYUb6sqhZKeHgHsKdpluUqUSmtHH3u5eTX7N8wN6fChC3uWoWwTHXAXSpsm70t3QkrHLTDLABnVTqYDMoffvZ124HaFya4AN72Gdbahy0tLKL",
    vibe: "Neon Night",
    hostName: "Alex Rivera",
    hostAvatar: avatars[0]!,
    attendees: [
      { id: "a1", name: "Jordan", avatar: avatars[1]!, rsvpStatus: "going" },
      { id: "a2", name: "Sam", avatar: avatars[2]!, rsvpStatus: "going" },
      { id: "a3", name: "Casey", avatar: avatars[0]!, rsvpStatus: "maybe" },
    ],
    attendeeCount: 47,
    isPublic: true,
    category: "Party",
  },
  {
    id: "2",
    title: "Sunset Beach Bonfire",
    date: "Sep 1, 2026",
    time: "6:30 PM",
    location: "Venice Beach, CA",
    description:
      "S'mores, acoustic vibes, and ocean waves. Bring your guitar and good energy 🔥🌊",
    coverImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDwyzv6cVz0dvYtbq60-zwqjv0eMzgatUuwd-Lf-vRxUOZTqr91Cjw3XUJLQVGYqJFKXbU4plL0F-w5dLq7aWLBeCbWaqVkd1p08-uzPkTo2GdIr3o-VY1XMaTH47661kaTsnf8Dk6CHuzW61DqC7UE6xezZ4BB249hz69hWseC6qGOm1InIy6SbUgv0cZMdKkkig9mcbrSdc5Mf1yUN4GWUzRHhPofEq-k1dQmAF84c7Emb4bQ1I0VjzVJa47YAC9Fvo7nE94W-m_G",
    vibe: "Lofi",
    hostName: "Maya Chen",
    hostAvatar: avatars[1]!,
    attendees: [
      { id: "a4", name: "Alex", avatar: avatars[0]!, rsvpStatus: "going" },
      { id: "a5", name: "Riley", avatar: avatars[2]!, rsvpStatus: "going" },
    ],
    attendeeCount: 23,
    isPublic: true,
    category: "Outdoors",
  },
  {
    id: "3",
    title: "Tech & Tacos Meetup",
    date: "Sep 5, 2026",
    time: "7:00 PM",
    location: "The Hacker Space",
    description:
      "Monthly tech meetup with lightning talks, networking, and unlimited tacos 🌮💻",
    coverImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCx9hSRpNgTSq_GkM-evWpDU9soplzIAhDyvMQBFTaxDIkvsh7FwvrPUnhJYbr9_JohsTHmDoiBtSsrnnzUk14Yxvl8gYMlzVstQ0GG-z9sh4-nSLN6mnX3Og6-G6MAxAc7YZ2aVTmH3OkjpFMcNQna1JbXYuMf0iqTgoAvXQQKY69waY4K6lukraEKLjUKDbYPqUprwq5KiGEA8FJu02w1E8hxH8QVBDnAwCyxefoXEZahc7t59_sffnbij_qFvG12hpA5KqhbcPG6",
    vibe: "Jungle",
    hostName: "Dev Community",
    hostAvatar: avatars[2]!,
    attendees: [
      { id: "a6", name: "Jordan", avatar: avatars[1]!, rsvpStatus: "going" },
    ],
    attendeeCount: 89,
    isPublic: true,
    category: "Networking",
  },
  {
    id: "4",
    title: "Full Moon Yoga Flow",
    date: "Sep 10, 2026",
    time: "9:00 PM",
    location: "Griffith Observatory Lawn",
    description:
      "Align under the stars with guided cosmic yoga and sound healing 🌙🧘",
    coverImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuChiyTbF0qJMykH3XDRS5n3mVx9hoknVM5qCY8wgo3aVHKrliYMwJAqD3ziJ9P_s2MxHxd_FxqpeUqlqR3rd9vvPxV-zsPU3TwLQW8EzAXojbu1qXydPkXHgRylEp2Zmh3L5l2ug-aohjYO6g825yRERrtCLtiBYDPapjyrD-S2l3DDga-oaOC2dIFijCe7EHIeJVdodfxphHnDE62g8LKsRdgyW4G0ZTsswLktyKbVxJqSxfJ8ERb1jmu_jDGQ4azMLGtMMxIRLis9",
    vibe: "Zen",
    hostName: "Luna Wellness",
    hostAvatar: avatars[0]!,
    attendees: [],
    attendeeCount: 34,
    isPublic: true,
    category: "Wellness",
  },
];

export const sampleComments: CommentData[] = [
  {
    id: "c1",
    user: { name: "Jordan Lee", avatar: avatars[1]! },
    text: "Can't wait for this! Already planning my outfit 🔥",
    timestamp: "2h ago",
    reactions: [
      { emoji: "🔥", count: 12 },
      { emoji: "💜", count: 5 },
    ],
  },
  {
    id: "c2",
    user: { name: "Sam Taylor", avatar: avatars[2]! },
    text: "Is there parking nearby? Coming with 3 friends!",
    timestamp: "4h ago",
    reactions: [{ emoji: "👍", count: 3 }],
  },
  {
    id: "c3",
    user: { name: "Riley Kim", avatar: avatars[0]! },
    text: "This is going to be legendary ✨",
    timestamp: "6h ago",
    reactions: [
      { emoji: "✨", count: 8 },
      { emoji: "🎉", count: 4 },
    ],
  },
];

export const sampleTasks: TaskItem[] = [
  { id: "t1", text: "Book DJ for the night", completed: true, assignee: "Alex" },
  { id: "t2", text: "Order neon lights & decorations", completed: true, assignee: "Maya" },
  { id: "t3", text: "Arrange drink catering", completed: false, assignee: "Jordan" },
  { id: "t4", text: "Set up photo booth area", completed: false },
  { id: "t5", text: "Create event playlist backup", completed: false, assignee: "Sam" },
];

export const sampleBudget: BudgetItem[] = [
  { id: "b1", label: "Venue rental", amount: 500, paid: true },
  { id: "b2", label: "DJ & Sound", amount: 300, paid: true },
  { id: "b3", label: "Decorations", amount: 150, paid: false },
  { id: "b4", label: "Drinks & Catering", amount: 400, paid: false },
  { id: "b5", label: "Photo booth", amount: 100, paid: false },
];

export const categories = [
  "🔥 Trending",
  "🎉 Party",
  "🌊 Outdoors",
  "💻 Tech",
  "🧘 Wellness",
  "🎵 Music",
  "🍕 Food",
  "🏋️ Fitness",
  "🎨 Art",
];
