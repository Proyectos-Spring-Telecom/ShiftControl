/** Claims mínimos del access JWT emitido por Next (alineado con `jwt.strategy.ts`). */
export interface JwtAccessPayload {
  id?: string | number;
  idCliente?: string | number;
  rol?: string | number;
  /** Id del rostro en BehaviorIQ (IdFaceAuth en usuario sombra). */
  face?: string | number | null;
  idOperador?: string | number;
  iat?: number;
  exp?: number;
}
