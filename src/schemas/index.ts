/**
 * Yup validation schemas for every form on the Main Website.
 *
 * Schemas are pure `yup.ObjectSchema` instances with no UI binding. Adopt
 * them via either:
 *   1. Direct call: `await schema.validate(values, { abortEarly: false })`.
 *   2. `react-hook-form` + `@hookform/resolvers/yup` when migrating a form.
 */

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
