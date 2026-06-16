/** Convierte milisegundos a formato MySQL TIME `HH:MM:SS`. */
export function msToMysqlTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Normaliza valores TIME leídos de MySQL/TypeORM (string o Date del driver). */
export function normalizeMysqlTime(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return msToMysqlTime(
      value.getUTCHours() * 3600000 +
        value.getUTCMinutes() * 60000 +
        value.getUTCSeconds() * 1000,
    );
  }
  const asString = String(value).trim();
  return asString.length > 0 ? asString : null;
}

/** Convierte TIME `HH:MM:SS` a texto legible (ej. `9h 30m`). */
export function mysqlTimeToDuracionStr(time: string | null | undefined): string | null {
  if (!time) {
    return null;
  }
  const parts = time.trim().split(':');
  if (parts.length < 2) {
    return null;
  }
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  const chunks: string[] = [];
  if (hours > 0) {
    chunks.push(`${hours}h`);
  }
  if (minutes > 0) {
    chunks.push(`${minutes}m`);
  }
  return chunks.length > 0 ? chunks.join(' ') : '0m';
}

/** Milisegundos entre dos fechas → `9h 30m`. */
export function msDiffToDuracionStr(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const chunks: string[] = [];
  if (hours > 0) {
    chunks.push(`${hours}h`);
  }
  if (minutes > 0) {
    chunks.push(`${minutes}m`);
  }
  return chunks.length > 0 ? chunks.join(' ') : '0m';
}
