import { z } from 'zod';

export const UserRoleSchema = z.enum(['TRAVELER', 'GUIDE', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  avatar: z.string().optional().nullable(),
  role: UserRoleSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type AuthApiResponse = z.infer<typeof AuthResponseSchema>;

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

/** Persona identifier when running in demo mode. Matches `DemoPersona` in demoSeed. */
export type DemoPersona = 'traveler-aanya' | 'guide-bishnu';

export type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  /** Set to the persona ID when running a demo session, null otherwise. */
  demoPersona: DemoPersona | null;
};

export type AuthAction =
  | { type: 'SET_LOADING' }
  | { type: 'RESTORE'; payload: AuthUser; demoPersona?: DemoPersona | null }
  | { type: 'SIGN_IN'; payload: AuthUser; demoPersona?: DemoPersona | null }
  | { type: 'SIGN_OUT' }
  | { type: 'UPDATE_USER'; payload: Partial<AuthUser> };

export const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginPayload = z.infer<typeof LoginSchema>;

export const RegisterSchema = LoginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});
export type RegisterPayload = z.infer<typeof RegisterSchema>;
