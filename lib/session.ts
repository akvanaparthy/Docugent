import { v4 as uuidv4 } from "uuid";

// Simple session management for multi-user support
// In production, you'd use proper session management with Redis or database

export function generateSessionId(): string {
  return uuidv4();
}

export function getSessionIdFromRequest(request: Request): string {
  // Try to get session ID from headers (client-side generated)
  const sessionId = request.headers.get("x-session-id");

  if (sessionId) {
    return sessionId;
  }

  // Fallback to default session (for backward compatibility)
  return "default";
}

export function createSessionResponse(
  response: Response,
  sessionId: string
): Response {
  // Add session ID to response headers so client can use it
  response.headers.set("x-session-id", sessionId);
  return response;
}
