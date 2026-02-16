export type UserProfile = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  is_staff: boolean;
  is_active: boolean;
};

export type AppSession = {
  token: string;
  tenantId: string;
  user?: UserProfile;
};

const TOKEN_KEY = "nila_token";
const TENANT_KEY = "nila_tenant_id";
const USER_KEY = "nila_user";
const REMEMBER_KEY = "nila_remember";

function readStorage(key: string): string {
  const local = localStorage.getItem(key);
  if (local !== null) return local;
  return sessionStorage.getItem(key) || "";
}

function clearBothStorages(key: string): void {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function getSession(): AppSession {
  if (typeof window === "undefined") {
    return { token: "", tenantId: "" };
  }

  const token = readStorage(TOKEN_KEY);
  const tenantId = readStorage(TENANT_KEY);
  const userRaw = readStorage(USER_KEY);
  let user: UserProfile | undefined;

  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as UserProfile;
    } catch {
      user = undefined;
    }
  }

  return { token, tenantId, user };
}

export function saveSession(session: AppSession, remember = true): void {
  if (typeof window === "undefined") return;

  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  target.setItem(TOKEN_KEY, session.token);
  target.setItem(TENANT_KEY, session.tenantId);
  if (session.user) {
    target.setItem(USER_KEY, JSON.stringify(session.user));
  }
  target.setItem(REMEMBER_KEY, remember ? "1" : "0");

  other.removeItem(TOKEN_KEY);
  other.removeItem(TENANT_KEY);
  other.removeItem(USER_KEY);
  other.removeItem(REMEMBER_KEY);
}

export function setActiveTenant(tenantId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;

  clearBothStorages(TOKEN_KEY);
  clearBothStorages(TENANT_KEY);
  clearBothStorages(USER_KEY);
  clearBothStorages(REMEMBER_KEY);
}
