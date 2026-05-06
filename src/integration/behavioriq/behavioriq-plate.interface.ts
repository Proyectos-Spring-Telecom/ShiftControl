/** Respuesta de POST /plate/read (behaviorIQ). */
export interface BehaviorIqPlateReadResponse {
  plate_number: string;
  confidence: number;
}

/** Body de POST /placas (behaviorIQ). */
export interface BehaviorIqCreatePlacaBody {
  numeroPlaca: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  color?: string;
  economico?: string;
  idCliente?: number;
  idSolucion?: number;
}

/** Respuesta de POST /placas (behaviorIQ). */
export interface BehaviorIqCreatePlacaResponse {
  idPlaca?: number;
  numeroPlaca?: string;
  economico?: string;
  [key: string]: unknown;
}

export interface BehaviorIqCreatePlacaResult {
  status: number;
  data: BehaviorIqCreatePlacaResponse;
}

/** Query de GET /placas/validar (behaviorIQ). */
export interface BehaviorIqValidarPlacaQuery {
  numeroPlaca: string;
  idCliente?: number | string;
  idSolucion?: number | string;
  latitud?: number | string;
  longitud?: number | string;
}

/** Respuesta de GET /placas/validar (behaviorIQ). */
export interface BehaviorIqValidarPlacaResponse {
  registered: boolean;
  idPlaca?: number;
  placa?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  color?: string;
  economico?: string;
  [key: string]: unknown;
}
