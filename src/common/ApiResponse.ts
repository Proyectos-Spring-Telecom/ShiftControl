export interface ApiResponseCommon {
  data: any[];
  paginated?: Paginated;
}

export interface Paginated {
  total: number;
  page: number;
  lastPage: number;
}

export interface ApiDerroteroResponse {
  status: string;
  message: string;
  id: number;
  nombre: string;
  distancia: number;
  estatus: number | string;
}

export interface ApiCrudResponse {
  status: string;
  message: string;
  estatus?: ApiEstatus;
  data?: ApiData;
}

export interface ApiData {
  id: number;
  nombre?: string;
  /** Cliente maestro (Next) en tabla sombra Clientes */
  idClienteNext?: number | null;
  idPadre?: number | null;
  idBitacoraApertura?: number | null;
  idBitacoraCierre?: number | null;
  duracion?: string | null;
  idTablero?: number | null;
  idBitacoraVehiculo?: number | null;
  idTestigosVehiculo?: number | null;
  idNivelesFluidos?: number | null;
  idLucesVehiculo?: number | null;
  idDocumentacionVehiculo?: number | null;
  idAccesoriosVehiculo?: number | null;
  idInspeccionVehiculoEx?: number | null;
  idTurno?: number | null;
  idVehiculo?: number | null;
  /** Respuesta proxy GET vehículo por placa (Next) al crear turno */
  vehiculoPorPlaca?: { status: number; data: unknown };
  /** Subflujo de cierre de bitácora: apertura | cierre */
  flujo?: string;
  idVistaVehiculo?: number;
  vistaVehiculo?: { id: number; nombre: string } | null;
  estatus?: number;
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}

export interface ApiEstatus {
  estatus: number;
}

export interface Punto {
  lat: number;
  lng: number;
}

export interface ResultadoRecorrido {
  recorridoDetallado: Punto[];
  distanciaKm: number;
}

export enum EstatusEnumBitcora {
  SUCCESS = 'success',
  ERROR = 'error',
}
