/** User gender. */
export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

/** User account status. */
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
