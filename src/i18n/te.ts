import { TE_UI } from './te-ui';
import { TE_EXERCISES } from './te-exercises';
import { TE_PLANS } from './te-plans';

/** Telugu, keyed by the English source text. */
export const TE: Record<string, string> = { ...TE_EXERCISES, ...TE_PLANS, ...TE_UI };
