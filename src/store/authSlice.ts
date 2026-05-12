import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { clearTokens, getRefreshToken, getToken, persistAuthCookies, saveRefreshTokenOnly } from '@/api/authToken';
import type { UserMe } from '@/api/types/user';

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserMe | null;
}

const initialState: AuthState = {
  token: getToken(),
  refreshToken: getRefreshToken(),
  user: null,
};

interface CredentialsPayload {
  token: string;
  refreshToken?: string | null;
  user?: UserMe | null;
  expiresAt?: string | null;
  sessionUser?: UserMe | null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<CredentialsPayload>) {
      state.token = action.payload.token;
      if (action.payload.refreshToken !== undefined) {
        state.refreshToken = action.payload.refreshToken;
      }
      state.user = action.payload.user ?? state.user;
      persistAuthCookies({
        accessToken: state.token,
        refreshToken: state.refreshToken,
        expiresAt: action.payload.expiresAt,
        userSnapshot: action.payload.sessionUser ?? null,
      });
    },
    setUser(state, action: PayloadAction<UserMe | null>) {
      state.user = action.payload;
    },
    setRefresh(state, action: PayloadAction<string | null>) {
      state.refreshToken = action.payload;
      saveRefreshTokenOnly(action.payload);
    },
    logout(state) {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      clearTokens();
    },
  },
});

export const { setCredentials, setUser, setRefresh, logout } = authSlice.actions;
export default authSlice.reducer;
