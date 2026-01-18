const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export interface UserResponse {
  userId: string;
  username: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

/**
 * Handles the logic of checking if a user exists (Login) 
 * or creating them if they don't (Register).
 */
export const authService = {
  async loginOrRegister(username: string): Promise<UserResponse> {
    try {
      // 1. Attempt Login
      const loginResponse = await fetch(`${SERVER_URL}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      // 2. If user exists, return data
      if (loginResponse.ok) {
        const { data } = await loginResponse.json();
        return { username: data.username, userId: data.userId };
      }

      // 3. If user not found (404), attempt Registration
      if (loginResponse.status === 404) {
        const registerResponse = await fetch(`${SERVER_URL}/api/user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json();
          throw new Error(errorData.error || "Registration failed");
        }

        const { data } = await registerResponse.json();
        return { username: data.username, userId: data.userId };
      }

      // 4. Handle other errors (500, etc.)
      const errorData = await loginResponse.json();
      throw new Error(errorData.error || "Authentication failed");

    } catch (error: any) {
      console.error("[ApiService] Auth Error:", error);
      throw error; // Re-throw to handle in the UI
    }
  },
};