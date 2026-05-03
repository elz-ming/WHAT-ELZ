'use client';

import { useRegisterNav } from '@/lib/shell/nav-registry';

const ADMIN_NAV = [
  { type: 'link'  as const, href: '/admin',            label: 'Dashboard'  },
  { type: 'group' as const, label: 'Profile', children: [
    { href: '/admin/resume',     label: 'Resume'     },
    { href: '/admin/hackathons', label: 'Hackathons' },
    { href: '/admin/career',     label: 'Career'     },
    { href: '/admin/projects',   label: 'Projects'   },
  ]},
  { type: 'link'  as const, href: '/admin/apply',      label: 'Apply'      },
  { type: 'link'  as const, href: '/admin/hunt',       label: 'Hunt'       },
  { type: 'link'  as const, href: '/admin/listen',     label: 'Listen'     },
  { type: 'link'  as const, href: '/admin/media',      label: 'Media'      },
  { type: 'link'  as const, href: '/admin/presence',   label: 'Presence'   },
  { type: 'link'  as const, href: '/admin/blog',       label: 'Blog'       },
  { type: 'link'  as const, href: '/admin/developer',  label: 'Developer'  },
];

export function AdminNavInjector() {
  useRegisterNav(ADMIN_NAV);
  return null;
}
