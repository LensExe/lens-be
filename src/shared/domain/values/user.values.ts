/** Giới tính người dùng. */
export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

/** Trạng thái tài khoản người dùng. */
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
