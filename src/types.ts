export interface UserStats {
  weight: number; // lbs
  height: number; // inches
  age: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'extra';
  gender: 'male' | 'female' | 'other';
}

export type Goal = 'bulk' | 'cut' | 'maintain';

export type CampusId =
  | 'iowa'
  | 'purdue'
  | 'illinois'
  | 'wisconsin'
  | 'michigan'
  | 'kansas';

export interface DietaryPreferences {
  halal: boolean;
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
}

/** Meal blocks used for menus, ledger, and planners (ISU menus group by similar names). */
export const MEAL_PERIOD_ORDER = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'LateNight',
] as const;

export type MealPeriod = (typeof MEAL_PERIOD_ORDER)[number];

/** Human-readable labels for UI copy (tabs, errors). */
export function displayMealPeriod(period: MealPeriod): string {
  return period === 'LateNight' ? 'Late Night' : period;
}

export interface MenuItem {
  id: string;
  name: string;
  location: string;
  station?: string;
  /** Which meal periods this row was published under at the venue (merged if same dish repeats). */
  servedDuring: MealPeriod[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  isHalal: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  /** Entree-style plate (Target Match / top picks only use these). */
  isMainMeal: boolean;
  /** Condiments, sides under 150 kcal, sauces, etc. */
  isAddOn: boolean;
}

/** Parsed row before meal classification (live API + sanitizer). `servedDuring` is optional until sanitize. */
export type MenuItemBase = Omit<
  MenuItem,
  'isMainMeal' | 'isAddOn' | 'servedDuring'
> & {
  servedDuring?: MealPeriod[];
};

/** One row in the logged-meals tray; quantity scales macros. */
export type LoggedFoodEntry = {
  item: MenuItem;
  quantity: number;
  mealPeriod: MealPeriod;
};

export interface Macros {
  protein: number;
  carbs: number;
  fats: number;
}

export interface TDEEResult {
  bmr: number;
  tdee: number;
  goalCalories: number;
  macros: Macros;
}
