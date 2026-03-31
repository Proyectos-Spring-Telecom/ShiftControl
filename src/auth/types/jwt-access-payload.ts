/** Claims mínimos del access JWT emitido por Next (alineado con `jwt.strategy.ts`). */
export interface JwtAccessPayload {
  id?: string | number;
  idCliente?: string | number;
  rol?: string | number;
  idOperador?: string | number;
  iat?: number;
  exp?: number;
}
