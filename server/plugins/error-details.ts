import { definePlugin } from "nitro";

// Log Error fields explicitly: HTTPError.toJSON() deliberately hides them.
// Keep the details in server logs; do not change responses or log requests.
function describeError(error: Error, depth = 0): Record<string, unknown> {
  const result: Record<string, unknown> = {
    name: error.name,
    message: error.message.replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1[redacted]@"),
    stack: error.stack?.replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1[redacted]@"),
  };
  if (error.cause instanceof Error && depth < 4) {
    result.cause = describeError(error.cause, depth + 1);
  }
  return result;
}

export default definePlugin(() => {
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalError(...args.map((value) => value instanceof Error ? describeError(value) : value));
  };
});
