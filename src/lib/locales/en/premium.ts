import type ruPremium from '../ru/premium'

const en: typeof ruPremium = {
  paywall: {
    cta: 'Get Premium',
    soon_note: 'Payment coming soon',
    badge: 'Premium',
  },
  page: {
    title: 'Premium',
    subtitle: 'More stats, friends and leaderboard — without limits',
    status_active_title: 'Premium is active',
    status_active_text: 'Thank you! Everything is already unlocked.',
    status_inactive_title: 'Premium is not enabled',
    status_inactive_text: 'Get Premium to unlock stats, leaderboard and adding friends.',
    status_guest_title: 'You are not signed in',
    status_guest_text: 'Sign in to get Premium and sync your subscription.',
    badge_active: 'Active',
    badge_inactive: 'Inactive',
    free_title: 'Free',
    free_price: '$0',
    free_period: 'forever',
    premium_title: 'Premium',
    premium_price: '$3.99',
    premium_period: 'per month',
    free_features: [
      'Friend list and incoming requests',
      'Basic profile and goals',
      'Demo stats',
    ],
    premium_features: [
      'Full stats and charts',
      'Friends leaderboard',
      'Unlimited friend adds',
      'Early access to new features',
    ],
    current_label: 'Your current plan',
    checkout: 'Get Premium',
    checkout_note: 'Payment coming soon — this is a stub, no charge will be made.',
    refresh: 'I already paid — refresh',
    refreshing: 'Refreshing…',
    refresh_done: 'Done — status refreshed.',
    refresh_error: 'Couldn’t refresh — check your connection.',
    login_cta: 'Sign in',
  },
  stats: {
    title: 'Stats are Premium-only',
    text: 'Detailed charts, heatmap and progress are available with a Premium subscription.',
  },
  leaderboard: {
    title: 'Leaderboard is Premium-only',
    text: 'Compete with friends: ranks, streaks and levels — with a Premium subscription.',
    loading: 'Loading leaderboard…',
    empty: 'Nothing here yet — add friends to build the ranking.',
    streak: '🔥 {n} days',
    you: 'You',
    fallback_name: 'User',
  },
  friends: {
    tab_friends: 'Friends',
    tab_leaderboard: 'Leaderboard',
    add_locked_title: 'Adding friends is Premium',
    add_locked_text: 'Get Premium to send friend requests.',
  },
}

export default en
