export const TIER_DEFINITIONS = {
  1: { name: 'Seedling', minBerry: 0, cashoutRate: 0.015, drawAccess: 'Daily draws', streakRequired: 0, color: 'text-[#00A082]', bg: 'bg-[#e6fcf2]', border: 'border-[#008f75]', main: '#00A082' },
  2: { name: 'Sprout', minBerry: 1000, cashoutRate: 0.030, drawAccess: '+ Weekly', streakRequired: 7, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', main: '#2563eb' },
  3: { name: 'Berry', minBerry: 5000, cashoutRate: 0.050, drawAccess: '+ Monthly', streakRequired: 14, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', main: '#9333ea' },
  4: { name: 'Gold Berry', minBerry: 15000, cashoutRate: 0.075, drawAccess: '+ Quarterly', streakRequired: 30, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', main: '#ca8a04' },
  5: { name: 'Diamond', minBerry: 50000, cashoutRate: 0.100, drawAccess: '+ Yearly', streakRequired: 60, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', main: '#0891b2' }
};

export const calculateTier = (allTimeBerryEarned: number, currentStreak: number) => {
  let tier = 1;
  for (let i = 5; i >= 1; i--) {
    const def = TIER_DEFINITIONS[i as keyof typeof TIER_DEFINITIONS];
    if (allTimeBerryEarned >= def.minBerry && currentStreak >= def.streakRequired) {
      tier = i;
      break;
    }
  }
  return tier;
};
