import { apiClient } from "./apiClient";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SURVEYOR" | "ADMIN";
  surveyorId?: string | null;
  targetState?: string | null;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  surveyorId?: string;
  targetState?: string;
  role?: "USER" | "SURVEYOR" | "ADMIN";
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>("/login", credentials);
    return res.data;
  },

  signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>("/signup", credentials);
    return res.data;
  },

  getMe: async (): Promise<{ user: UserProfile }> => {
    const res = await apiClient.get<{ user: UserProfile }>("/me");
    return res.data;
  },
};
