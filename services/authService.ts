
const API_URL = 'https://bananaboom-api-242273127238.asia-east1.run.app/api';

export interface User {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  vip: boolean;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const registerUser = async (data: {
  displayName: string;
  email: string;
  password: string;
  passwordConf: string;
  phone?: string;
}): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message_cn || result.message || 'Registration failed');
  }
  return result;
};

export const loginUser = async (data: {
  email: string; // Acts as inputAccount (email or phone)
  password: string;
}): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/users/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message_cn || result.message || 'Login failed');
  }
  return result;
};

export const logoutUser = async (token: string): Promise<void> => {
  try {
    await fetch(`${API_URL}/users/logout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Assuming backend uses Bearer token scheme based on common practices, though not explicitly shown in route but implied by middleware
      },
    });
  } catch (e) {
    console.error("Logout API call failed", e);
  }
};
