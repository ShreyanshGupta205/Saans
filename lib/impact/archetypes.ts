/**
 * @file archetypes.ts
 * @description Classifies a household profile into one of 12 bounded archetypes.
 * This enables aggressive narrative caching for LLM generation keyed by:
 *   (aqiBucket, profileArchetype, language)
 */

import { HouseholdProfile } from './types';

export type ProfileArchetype =
  | 'young_kids_car_commute'
  | 'young_kids_transit'
  | 'elderly_no_purifier'
  | 'elderly_purifier_owner'
  | 'sensitive_solo_commuter'
  | 'high_commute_motorized'
  | 'short_commute_motorized'
  | 'remote_worker_no_purifier'
  | 'remote_worker_with_purifier'
  | 'transit_user_pucca'
  | 'solid_fuel_vulnerable'
  | 'baseline_family';

export const ALL_PROFILE_ARCHETYPES: readonly ProfileArchetype[] = [
  'young_kids_car_commute',
  'young_kids_transit',
  'elderly_no_purifier',
  'elderly_purifier_owner',
  'sensitive_solo_commuter',
  'high_commute_motorized',
  'short_commute_motorized',
  'remote_worker_no_purifier',
  'remote_worker_with_purifier',
  'transit_user_pucca',
  'solid_fuel_vulnerable',
  'baseline_family',
] as const;

/**
 * Maps any detailed household profile into one of the 12 archetypes.
 * Evaluates priority hierarchy: acute fuel/vulnerability > demographic vulnerability > commute pattern.
 */
export function getProfileArchetype(profile: HouseholdProfile): ProfileArchetype {
  // 1. Solid fuel or informal home (highest indoor emission hazard)
  if (profile.cookingFuel === 'biomass' || profile.homeType === 'semi_pucca') {
    return 'solid_fuel_vulnerable';
  }

  // 2. Sensitive members (asthma, COPD, cardiac, pregnancy)
  if (profile.hasSensitiveMembers) {
    return 'sensitive_solo_commuter';
  }

  // 3. Elderly members
  if (profile.household.elderly > 0) {
    return profile.hasAirPurifier ? 'elderly_purifier_owner' : 'elderly_no_purifier';
  }

  // 4. Young children
  const isMotorized = ['car_petrol', 'car_diesel', 'two_wheeler', 'auto'].includes(profile.commuteMode);
  if (profile.household.children > 0) {
    return isMotorized ? 'young_kids_car_commute' : 'young_kids_transit';
  }

  // 5. Remote workers (WFH >= 3 days)
  if (profile.workFromHomeDays >= 3) {
    return profile.hasAirPurifier ? 'remote_worker_with_purifier' : 'remote_worker_no_purifier';
  }

  // 6. Commute-centric profiles
  if (isMotorized) {
    return profile.commuteDistanceKm > 15 ? 'high_commute_motorized' : 'short_commute_motorized';
  }

  if (['metro', 'bus', 'walk_cycle', 'none'].includes(profile.commuteMode)) {
    return 'transit_user_pucca';
  }

  return 'baseline_family';
}
