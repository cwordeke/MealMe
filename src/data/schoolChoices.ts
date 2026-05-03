import type { CampusId } from '@/types';

/** Quiz & onboarding — logos under `public/logos/`. */
export const SCHOOL_CHOICES: { id: CampusId; label: string; logo: string }[] = [
  { id: 'iowa', label: 'Iowa State University', logo: '/logos/IowaStateLogo.png' },
  { id: 'purdue', label: 'Purdue University', logo: '/logos/PurdueLogo.png' },
  { id: 'illinois', label: 'University of Illinois', logo: '/logos/IllinoisLogo.png' },
  { id: 'wisconsin', label: 'University of Wisconsin', logo: '/logos/WisconsinLogo.png' },
  { id: 'michigan', label: 'University of Michigan', logo: '/logos/MichiganLogo.png' },
  { id: 'kansas', label: 'University of Kansas', logo: '/logos/KansasLogo.png' },
];
