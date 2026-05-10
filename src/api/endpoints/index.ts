/**
 * Single import surface for every domain's RTK Query hooks.
 *
 * Pages can do:
 *   import { useGetEventBySlugQuery, useLoginMutation } from '@/api/endpoints';
 *
 * Each underlying file calls `baseApi.injectEndpoints` so the live `baseApi`
 * is augmented as soon as it is imported.
 */

export * from './system';
export * from './auth';
export * from './me';
export * from './talents';
export * from './vendors';
export * from './organizers';
export * from './events';
export * from './seats';
export * from './orders';
export * from './tickets';
export * from './auctions';
export * from './savedCards';
export * from './gifts';
export * from './engagements';
export * from './ratings';
export * from './waitlist';
export * from './notifications';
export * from './support';
export * from './complaints';
export * from './roleApplications';
export * from './favorites';
export * from './reference';
