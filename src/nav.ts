
/**
 * Navigation Config
 *
 * Add one entry per nav item. Routes are handled by generouted
 * (file-based routing in src/pages/), this just controls what
 * appears in the navigation bar.
 */

import type { Role } from './constants'

export interface NavItem {
  path: string
  label: string
  roles?: Role[]
  devOnly?: boolean
}


export const nav: NavItem[] = [
  { path: '/home', label: 'Home' },

  // ── Features ──
  { path: '/attachments', label: 'File Attachments', roles: ['member' as Role] },
  { path: '/assistant', label: 'AI Chat', roles: ['member' as Role] },
  { path: '/job-matcher', label: 'Job Matcher', roles: ['member' as Role] },
  { path: '/interview-coach', label: 'Interview Coach', roles: ['member' as Role] },
  
  // ── Settings ──
  { path: '/settings', label: 'Settings' },

  // API Status debug page is available if needed:
  // { path: '/api-status', label: 'API Status', devOnly: true },
];
