import { isAdminUser, type KeycloakUser } from "@/lib/keycloak";

/** Default post-login destination by Keycloak role. */
export function homePathForRole(isAdmin: boolean): string {
  return isAdmin ? "/dashboard" : "/submit";
}

/**
 * Resolve where to send the user after login.
 * Honors ?next= when safe; otherwise uses the role home.
 */
export function resolvePostLoginPath(
  nextRaw: string | null | undefined,
  userOrAdmin: KeycloakUser | boolean | null | undefined
): string {
  const isAdmin =
    typeof userOrAdmin === "boolean"
      ? userOrAdmin
      : isAdminUser(userOrAdmin);

  const raw = nextRaw ? String(nextRaw) : "";
  const invalid =
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/login") ||
    raw.startsWith("/admin") ||
    raw === "/";

  if (invalid) return homePathForRole(isAdmin);

  // Non-admins cannot deep-link into admin-only areas
  if (
    !isAdmin &&
    (raw.startsWith("/review") || raw.startsWith("/admin"))
  ) {
    return homePathForRole(false);
  }

  return raw;
}
