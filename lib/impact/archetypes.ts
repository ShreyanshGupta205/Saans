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

function checkVulnerabilityArchetype(profile: HouseholdProfile): ProfileArchetype | null {
  if (profile.cookingFuel === 'biomass' || profile.homeType === 'semi_pucca') {
    return 'solid_fuel_vulnerable';
  }
  if (profile.hasSensitiveMembers) {
    return 'sensitive_solo_commuter';
  }
  if (profile.elderlyCount > 0) {
    return profile.hasAirPurifier ? 'elderly_purifier_owner' : 'elderly_no_purifier';
  }
  return null;
}

function checkLifestyleArchetype(profile: HouseholdProfile): ProfileArchetype {
  const isMotorized = ['car_petrol', 'car_diesel', 'two_wheeler', 'auto'].includes(profile.commuteMode);
  if (profile.childrenCount > 0) {
    return isMotorized ? 'young_kids_car_commute' : 'young_kids_transit';
  }
  if (profile.workFromHomeDays >= 3) {
    return profile.hasAirPurifier ? 'remote_worker_with_purifier' : 'remote_worker_no_purifier';
  }
  if (isMotorized) {
    return profile.commuteDistanceKm > 15 ? 'high_commute_motorized' : 'short_commute_motorized';
  }
  if (['metro', 'bus', 'walk_cycle', 'none'].includes(profile.commuteMode)) {
    return 'transit_user_pucca';
  }
  return 'baseline_family';
}

/**
 * Maps any detailed household profile into one of the 12 archetypes.
 * Evaluates priority hierarchy: acute fuel/vulnerability > demographic vulnerability > commute pattern.
 */
export function getProfileArchetype(profile: HouseholdProfile): ProfileArchetype {
  const vulnerable = checkVulnerabilityArchetype(profile);
  if (vulnerable) {
    return vulnerable;
  }
  return checkLifestyleArchetype(profile);
}
