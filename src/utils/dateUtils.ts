import { format, isValid } from 'date-fns';

export const safeFormat = (date: any, formatStr: string, fallback: string = 'N/A'): string => {
  if (!date) return fallback;
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (!isValid(dateObj)) return fallback;
  
  try {
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return fallback;
  }
};
