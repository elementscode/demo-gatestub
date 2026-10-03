import { sql, session, AuthError, ForbiddenError } from "@elements/app";

interface Staff {
  id: string;
  name: string;
  role: "admin" | "door";
}

/** Where a role lands after signing in. */
export function homeFor(role: "admin" | "door"): string {
  return role === "admin" ? "/admin" : "/door";
}

/** @rpc */
export function signin(email: string, password: string): string {
  let address = email.trim().toLowerCase();

  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  let user = sql<Staff>(`
    select id, name, role from users
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)
  `).first();

  if (!user) {
    throw new AuthError("That email and password don't match.");
  }

  session.login({ userId: user.id, userName: user.name, role: user.role });

  return homeFor(user.role);
}

/** @rpc */
export function signout() {
  session.logout();
}

/**
 * The role is re-read from the database, not trusted from the session, so a
 * demoted account loses access on its next request.
 */
function currentRole(): "admin" | "door" {
  session.isLoggedInOrThrow();

  let user = sql<{ role: "admin" | "door" }>(`select role from users where id = ${session.getOrThrow("userId")}`).first();

  if (!user) {
    throw new AuthError("Sign in again.");
  }

  return user.role;
}

/** Door staff and admins: the check-in page and its rpc. */
export function requireStaff() {
  currentRole();
}

export function requireAdmin() {
  if (currentRole() !== "admin") {
    throw new ForbiddenError("Admins only.");
  }
}
