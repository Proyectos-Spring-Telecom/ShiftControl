/**
 * Arma la URL pública a partir de la base configurada y segmentos relativos.
 * No hardcodea host ni path; `publicBaseUrl` debe venir del .env.
 */
export function buildPublicFileUrl(
  publicBaseUrl: string,
  ...segments: Array<string | number>
): string {
  const base = publicBaseUrl.replace(/\/+$/, '');
  const path = segments
    .map((s) => String(s).replace(/^\/+|\/+$/g, ''))
    .filter((s) => s.length > 0)
    .join('/');
  return `${base}/${path}`;
}
