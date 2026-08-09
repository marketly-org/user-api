/** Shared type definitions. */

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface RefreshRequest {
  refreshToken: string;
}
