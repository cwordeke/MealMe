import { UserStats, Goal, TDEEResult, Macros } from '../types';

export function calculateTDEE(stats: UserStats, goal: Goal): TDEEResult {
  const { weight, height, age, activityLevel, gender } = stats;
  
  // Weight in kg, height in cm
  const weightKg = weight * 0.453592;
  const heightCm = height * 2.54;
  
  // Mifflin-St Jeor Equation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extra: 1.9,
  };
  
  const tdee = bmr * activityMultipliers[activityLevel];
  
  let goalCalories = tdee;
  if (goal === 'bulk') goalCalories += 300;
  if (goal === 'cut') goalCalories -= 500;
  
  // Macro Splits (approximate)
  // Protein: 1g per lb of bodyweight (or 0.8g for sedentary)
  // Fats: 0.3g per lb of bodyweight
  // Carbs: Remainder
  
  const protein = weight * 0.9; // Protein (g)
  const fats = weight * 0.35; // Fats (g)
  
  const proteinCals = protein * 4;
  const fatCals = fats * 9;
  const carbCals = Math.max(0, goalCalories - proteinCals - fatCals);
  const carbs = carbCals / 4;
  
  const macros: Macros = {
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fats: Math.round(fats),
  };
  
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    goalCalories: Math.round(goalCalories),
    macros,
  };
}
