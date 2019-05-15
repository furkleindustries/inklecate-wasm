import {
  getGlobalContext,
} from './getGlobalContext';

export const getGlobalValue = <T = any>(key: string | number): T => (
  getGlobalContext()[key]
);
