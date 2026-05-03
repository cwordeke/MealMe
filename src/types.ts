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

export interface MenuItem {
  id: string;
  name: string;
  location: string;
  station?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  isHalal: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
}

/** One row in the logged-meals tray; quantity scales macros. */
export type LoggedFoodEntry = {
  item: MenuItem;
  quantity: number;
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
