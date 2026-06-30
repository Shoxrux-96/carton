import { useLocation } from "wouter";

interface User {
  id: number;
  phone: string;
}

export const useAuth = () => {
  const [, setLocation] = useLocation();

  const getToken = () => localStorage.getItem("token");
  const getUser = (): User | null => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  };

  const setAuth = (token: string, user: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    window.location.href = "/dashboard";
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const token = getToken();
  const user = getUser();

  return {
    token,
    user,
    isAuthenticated: !!token,
    setAuth,
    logout,
  };
};

export const useAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};
