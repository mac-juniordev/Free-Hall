/* Minimal structured logger — no external dep. */
type Level = 'info' | 'warn' | 'error' | 'debug';

function emit(level: Level, payload: unknown, msg?: string) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(typeof payload === 'object' && payload !== null ? payload : { detail: payload }),
  };
  const out = JSON.stringify(line);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
}

export const logger = {
  info: (p: unknown, m?: string) => emit('info', p, m),
  warn: (p: unknown, m?: string) => emit('warn', p, m),
  error: (p: unknown, m?: string) => emit('error', p, m),
  debug: (p: unknown, m?: string) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', p, m);
  },
};