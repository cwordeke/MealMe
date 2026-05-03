import type { CampusId } from '@/types';

/** Tenant key for bundled campus configs + dining API routing. */
export type UniversityTenant = 'ISU' | 'PURDUE';

/** Stored onboarding selection → which dining backend to use. */
export type UserUniversity = UniversityTenant;

export function userUniversityFromCampusId(campusId: CampusId): UserUniversity {
  return campusId === 'purdue' ? 'PURDUE' : 'ISU';
}

export type IsuDiningCategory =
  | 'DINING CENTERS'
  | 'FAST CASUAL'
  | 'CAFES & MARKETS';

export type PurdueDiningCategory = 'DINING COURTS';

export type DiningLocationCategory =
  | IsuDiningCategory
  | PurdueDiningCategory;

export interface CampusDiningLocationConfig {
  id: string;
  name: string;
  category: DiningLocationCategory;
  /**
   * ISU: WordPress slug for `get-single-location`.
   * Purdue: short dining-court name in HFS URLs (e.g. `Wiley`, `Ford`).
   */
  slug: string;
}

/** ISU sidebar / render order */
export const ISU_LOCATION_CATEGORY_ORDER: readonly IsuDiningCategory[] = [
  'DINING CENTERS',
  'FAST CASUAL',
  'CAFES & MARKETS',
];

export const PURDUE_LOCATION_CATEGORY_ORDER: readonly PurdueDiningCategory[] = [
  'DINING COURTS',
];

const ISU_DINING_LIST: readonly CampusDiningLocationConfig[] = [
  {
    id: 'udcc',
    name: 'UDCC',
    category: 'DINING CENTERS',
    slug: 'union-drive-marketplace-2-2',
  },
  {
    id: 'seasons-marketplace',
    name: 'Seasons Marketplace',
    category: 'DINING CENTERS',
    slug: 'seasons-marketplace-2-2',
  },
  {
    id: 'conversations',
    name: 'Conversations',
    category: 'DINING CENTERS',
    slug: 'conversations-2',
  },
  {
    id: 'friley-windows',
    name: 'Friley Windows',
    category: 'DINING CENTERS',
    slug: 'friley-windows-2-2',
  },
  {
    id: 'hawthorn',
    name: 'Hawthorn',
    category: 'FAST CASUAL',
    slug: 'hawthorn',
  },
  {
    id: 'clydes',
    name: "Clyde's",
    category: 'FAST CASUAL',
    slug: 'clydes',
  },
  {
    id: 'the-hub',
    name: 'The Hub',
    category: 'FAST CASUAL',
    slug: 'hub-grill',
  },
  {
    id: 'mu-food-court',
    name: 'MU Food Court',
    category: 'FAST CASUAL',
    slug: 'memorial-union-food-court-2',
  },
  {
    id: 'lance-and-ellies',
    name: "Lance & Ellie's",
    category: 'FAST CASUAL',
    slug: 'lance-and-ellies',
  },
  {
    id: 'bookends-cafe',
    name: 'Bookends Café',
    category: 'CAFES & MARKETS',
    slug: '1336-2',
  },
  {
    id: 'business-cafe',
    name: 'Business Café',
    category: 'CAFES & MARKETS',
    slug: '1337-2',
  },
  {
    id: 'courtyard-cafe',
    name: 'Courtyard Café',
    category: 'CAFES & MARKETS',
    slug: '1338-2',
  },
  {
    id: 'design-cafe',
    name: 'Design Café',
    category: 'CAFES & MARKETS',
    slug: '1339-2',
  },
  {
    id: 'gentle-doctor-cafe',
    name: 'Gentle Doctor Café',
    category: 'CAFES & MARKETS',
    slug: '1342-2',
  },
  {
    id: 'east-side-market',
    name: 'East Side Market',
    category: 'CAFES & MARKETS',
    slug: '1341-2',
  },
  {
    id: 'west-side-market',
    name: 'West Side Market',
    category: 'CAFES & MARKETS',
    slug: '290-2',
  },
];

/** Purdue residential dining courts (HFS API location names). */
const PURDUE_DINING_LIST: readonly CampusDiningLocationConfig[] = [
  {
    id: 'purdue-wiley',
    name: 'Wiley',
    category: 'DINING COURTS',
    slug: 'Wiley',
  },
  {
    id: 'purdue-ford',
    name: 'Ford',
    category: 'DINING COURTS',
    slug: 'Ford',
  },
  {
    id: 'purdue-earhart',
    name: 'Earhart',
    category: 'DINING COURTS',
    slug: 'Earhart',
  },
  {
    id: 'purdue-hillenbrand',
    name: 'Hillenbrand',
    category: 'DINING COURTS',
    slug: 'Hillenbrand',
  },
  {
    id: 'purdue-windsor',
    name: 'Windsor',
    category: 'DINING COURTS',
    slug: 'Windsor',
  },
];

export const campusData: Readonly<
  Record<UniversityTenant, readonly CampusDiningLocationConfig[]>
> = {
  ISU: ISU_DINING_LIST,
  PURDUE: PURDUE_DINING_LIST,
};

/** Legacy export — ISU-only list shape used before multi-tenant refactor. */
export const ISU_DINING_LOCATIONS: readonly CampusDiningLocationConfig[] =
  campusData.ISU;

export type IsuDiningLocationConfig = CampusDiningLocationConfig;

export function diningCategoryOrderForTenant(
  tenant: UniversityTenant,
): readonly string[] {
  return tenant === 'PURDUE'
    ? PURDUE_LOCATION_CATEGORY_ORDER
    : ISU_LOCATION_CATEGORY_ORDER;
}
