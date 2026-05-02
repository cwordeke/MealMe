/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Landing from './components/Landing';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { UserStats, Goal, DietaryPreferences } from './types';

type AppState = 'landing' | 'onboarding' | 'dashboard';

const STORAGE_KEY = 'mealme_data';
const LEGACY_STORAGE_KEY = 'cyclonefuel_data';

export default function App() {
  const [state, setState] = useState<AppState>('landing');
  const [userData, setUserData] = useState<{
    stats: UserStats;
    goal: Goal;
    preferences: DietaryPreferences;
  } | null>(null);

  useEffect(() => {
    const saved =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved) {
      setUserData(JSON.parse(saved));
      setState('dashboard');
      if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, saved);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  }, []);

  const handleStartOnboarding = () => {
    setState('onboarding');
  };

  const handleOnboardingComplete = (data: { stats: UserStats; goal: Goal; preferences: DietaryPreferences }) => {
    setUserData(data);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setState('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setUserData(null);
    setState('landing');
  };

  return (
    <div className="font-sans">
      {state === 'landing' && <Landing onStart={handleStartOnboarding} />}
      {state === 'onboarding' && (
        <Onboarding 
          onComplete={handleOnboardingComplete} 
          onCancel={() => setState('landing')} 
        />
      )}
      {state === 'dashboard' && userData && (
        <Dashboard 
          stats={userData.stats} 
          goal={userData.goal} 
          preferences={userData.preferences} 
          onLogout={handleLogout} 
        />
      )}
    </div>
  );
}
