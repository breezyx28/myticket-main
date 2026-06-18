/**
 * Yup validation schemas for every form on the Main Website.
 *
 * Schemas are factory functions `createXSchema(t)` bound to the `validation`
 * i18n namespace. Adopt them via either:
 *   1. Direct call: `await createXSchema(t).validate(values, { abortEarly: false })`.
 *   2. `react-hook-form` + `@hookform/resolvers/yup` with `useMemo(() => createXSchema(t), [t, i18n.language])`.
 */

export * from './types';

export * from './auth';
export * from './profile';
export * from './talentProfile';
export * from './vendorProfile';
export * from './organizerProfile';
export * from './payment';
export * from './order';
export * from './auction';
export * from './ticket';
export * from './rating';
export * from './support';
export * from './complaint';
export * from './seat';
export * from './waitlist';
export * from './engagement';
export * from './favorite';
