/**
 * The keys the app stores in the session, so `session.get("userId")` is
 * typed. Only venue staff sign in; fans buy without an account.
 */
declare module "@elements/app" {
  interface SessionData {
    userId: string;
    userName: string;
    role: "admin" | "door";
  }
}

export {};
