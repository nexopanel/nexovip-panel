// NexoVIP runs on Python/FastAPI — there is no TypeScript application code.
// This single no-op declaration file exists only so the platform's
// `tsc -b --noEmit` check has a valid, non-empty input and passes cleanly.
declare namespace NexoVIPNoop {
  const marker: true;
}
