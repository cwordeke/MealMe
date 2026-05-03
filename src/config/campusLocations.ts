export type IsuDiningCategory =
  | 'DINING CENTERS'
  | 'FAST CASUAL'
  | 'CAFES & MARKETS';

/**
 * Local ISU Dining master list for the Dashboard sidebar + API.
 * `id` selects the venue and matches `MenuItem.location` after fetch.
 *
 * **`slug`** is the query value for `/wp-json/dining/menu-hours/get-single-location/?slug=…`.
 * Iowa State’s WordPress slugs often differ from short URLs (e.g. UDCC maps to Union Drive Marketplace).
 */
export interface IsuDiningLocationConfig {
  id: string;
  name: string;
  category: IsuDiningCategory;
  slug: string;
}

/** Sidebar / render order */
export const ISU_LOCATION_CATEGORY_ORDER: readonly IsuDiningCategory[] = [
  'DINING CENTERS',
  'FAST CASUAL',
  'CAFES & MARKETS',
];

export const ISU_DINING_LOCATIONS: readonly IsuDiningLocationConfig[] = [
  /* DINING CENTERS */
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
  /* FAST CASUAL */
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
  /* CAFES & MARKETS */
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
