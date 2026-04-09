export const OFFICIAL_DEPARTMENTS = [
  'IT',
  'HR',
  'Finance',
  'Sales',
  'Marketing',
  'Production',
  'Quality',
  'Logistics',
  'Purchase',
  'Admin',
  'Maintenance',
  'Stores',
  'R&D',
  'Accounts',
  'Legal',
  'Security',
  'Others'
] as const;

export type Department = typeof OFFICIAL_DEPARTMENTS[number];
