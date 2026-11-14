/** Shared JWT secrets. Every verifier must import these — do not inline fallbacks. */
export const ACCESS_SECRET = process.env.JWT_SECRET ?? 'dev_access_secret_CHANGE_IN_PROD';
export const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET ?? 'dev_refresh_secret_CHANGE_IN_PROD';
export const ACCESS_EXPIRY = '15m';
export const REFRESH_EXPIRY_DAYS = 30;
