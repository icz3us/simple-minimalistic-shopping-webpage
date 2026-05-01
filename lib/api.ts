export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function statusFromAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unauthorized";
  if (message === "Forbidden") return 403;
  if (message === "Unauthorized" || message === "Profile not found") return 401;
  return 400;
}
