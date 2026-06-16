import {
  msDiffToDuracionStr,
  mysqlTimeToDuracionStr,
  normalizeMysqlTime,
} from 'src/common/mysql-time.util';
import { EnumEstatusTurno } from 'src/common/estatus.enum';

const KILOMETRAJE_ACTUAL_FALLBACK = '142.593 km';

const ESTADO_FALLBACK = {
  carroceria: 'Bueno',
  indicadores: 'Bueno',
  gasolina: '95 %',
  luces: 'Bueno',
  accesorios: 'Bueno',
  documentacion: 'En regla',
} as const;

export interface DetalleTurnoEstadoVehiculoItem {
  etiqueta: string;
  valor: string;
}

export interface DetalleTurnoView {
  estado: string;
  empleadoYVehiculo: {
    inicialOperador: string;
    operador: string | null;
    idEmpleado: string;
    vehiculo: string | null;
    noEconomico: string | null;
    placas: string | null;
    folio: string | null;
  };
  estadoVehiculo: DetalleTurnoEstadoVehiculoItem[];
  horarioTurno: {
    horaInicio: string | null;
    fechaInicio: string | null;
    horaFin: string | null;
    fechaFin: string | null;
    duracionStr: string | null;
  };
  odometro: {
    badge: string | null;
    lecturaInicial: string | null;
    lecturaFinal: string | null;
  };
  kilometrajeActual: string;
  distanciaRecorrida: {
    distanciaKm: string | null;
    progresoBarra: number;
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number | null {
  return value != null && value !== '' && Number.isFinite(Number(value))
    ? Number(value)
    : null;
}

function str(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function parseDate(value: unknown): Date | null {
  if (value == null) {
    return null;
  }
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatHora12h(date: Date): string {
  return date.toLocaleTimeString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFecha(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formato `142.593 km` (punto como separador de miles). */
export function formatKmDisplay(km: number): string {
  const rounded = Math.round(km);
  const withSep = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withSep} km`;
}

function kmFromBitacora(bitacora: Record<string, unknown> | null): number | null {
  const tablero = asRecord(bitacora?.tablero);
  return num(tablero?.kmActual);
}

function buildTituloVehiculo(vehiculoNext: Record<string, unknown> | null): string | null {
  if (!vehiculoNext) {
    return null;
  }
  const marca = str(vehiculoNext.marcaNombre ?? vehiculoNext.marca);
  const modelo = str(vehiculoNext.modeloNombre ?? vehiculoNext.modelo);
  const anio = num(vehiculoNext.anio);
  const descripcion = [marca, modelo].filter(Boolean).join(' ').trim();
  if (!descripcion) {
    return null;
  }
  if (anio != null) {
    return `${descripcion} - ${anio}`;
  }
  return descripcion;
}

function pickFolio(vehiculoNext: Record<string, unknown> | null): string | null {
  if (!vehiculoNext) {
    return null;
  }
  const grupo = str(
    vehiculoNext.grupoNombre ??
      vehiculoNext.grupo ??
      vehiculoNext.nombreGrupo,
  );
  const ruta = str(
    vehiculoNext.rutaNombre ?? vehiculoNext.ruta ?? vehiculoNext.nombreRuta,
  );
  if (grupo && ruta) {
    return `${grupo} - ${ruta}`;
  }
  return grupo ?? ruta ?? str(vehiculoNext.folio);
}

function pickInicialOperador(nombre: string | null): string {
  if (!nombre) {
    return 'O';
  }
  return nombre.trim().charAt(0).toUpperCase() || 'O';
}

function mapEstadoTurno(idEstatusTurno: number | null, nombre: string | null): string {
  if (idEstatusTurno === EnumEstatusTurno.FINALIZADO) {
    return 'Turno Completado';
  }
  if (idEstatusTurno === EnumEstatusTurno.EN_CURSO) {
    return 'Turno en curso';
  }
  if (idEstatusTurno === EnumEstatusTurno.PROGRAMADO) {
    return 'Turno programado';
  }
  if (idEstatusTurno === EnumEstatusTurno.CANCELADO) {
    return 'Turno cancelado';
  }
  return nombre ?? 'Turno';
}

function estadoPorEstatusAlerta(
  estatus: number | null | undefined,
  fallback: string,
): string {
  if (estatus == null) {
    return fallback;
  }
  if (estatus === 1) {
    return 'Malo';
  }
  if (estatus === 0) {
    return 'Bueno';
  }
  return fallback;
}

function estadoDocumentacion(estatus: number | null | undefined): string {
  if (estatus == null) {
    return ESTADO_FALLBACK.documentacion;
  }
  if (estatus === 1) {
    return 'Faltante';
  }
  if (estatus === 0) {
    return 'En regla';
  }
  return ESTADO_FALLBACK.documentacion;
}

function nivelGasolina(gasolina: number | null | undefined): string {
  if (gasolina == null) {
    return ESTADO_FALLBACK.gasolina;
  }
  return `${gasolina} %`;
}

function estadoCarroceria(
  inspecciones: Record<string, unknown>[],
): string {
  if (inspecciones.length === 0) {
    return ESTADO_FALLBACK.carroceria;
  }
  const severidades = inspecciones
    .map((i) => num(asRecord(i.catGradoSeveridad)?.id ?? i.idCatGradoSeveridad))
    .filter((s): s is number => s != null);

  if (severidades.some((s) => s === 3 || s === 4)) {
    return 'Malo';
  }
  const count1 = severidades.filter((s) => s === 1).length;
  const count2 = severidades.filter((s) => s === 2).length;
  if (count2 > count1) {
    return 'Regular';
  }
  if (count1 > count2) {
    return 'Bueno';
  }
  if (count1 > 0 || count2 > 0) {
    return 'Regular';
  }
  return ESTADO_FALLBACK.carroceria;
}

function buildEstadoVehiculo(
  bitacoraApertura: Record<string, unknown> | null,
  inspecciones: Record<string, unknown>[],
): DetalleTurnoEstadoVehiculoItem[] {
  const testigos = asRecord(bitacoraApertura?.testigosVehiculo);
  const fluidos = asRecord(bitacoraApertura?.nivelesFluidos);
  const luces = asRecord(bitacoraApertura?.lucesVehiculo);
  const accesorios = asRecord(bitacoraApertura?.accesoriosVehiculo);
  const documentacion = asRecord(bitacoraApertura?.documentacionVehiculo);

  return [
    {
      etiqueta: 'Estado de la carrocería',
      valor: estadoCarroceria(inspecciones),
    },
    {
      etiqueta: 'Estado de indicadores',
      valor: estadoPorEstatusAlerta(num(testigos?.estatus), ESTADO_FALLBACK.indicadores),
    },
    {
      etiqueta: 'Nivel de Gasolina',
      valor: nivelGasolina(num(fluidos?.gasolina)),
    },
    {
      etiqueta: 'Estado de las Luces',
      valor: estadoPorEstatusAlerta(num(luces?.estatus), ESTADO_FALLBACK.luces),
    },
    {
      etiqueta: 'Estado de accesorios',
      valor: estadoPorEstatusAlerta(num(accesorios?.estatus), ESTADO_FALLBACK.accesorios),
    },
    {
      etiqueta: 'Documentación',
      valor: estadoDocumentacion(num(documentacion?.estatus)),
    },
  ];
}

function resolveDuracionStr(
  duracion: string | null,
  inicio: Date | null,
  fin: Date | null,
): string | null {
  const fromTime = mysqlTimeToDuracionStr(duracion);
  if (fromTime) {
    return fromTime;
  }
  if (inicio && fin) {
    return msDiffToDuracionStr(fin.getTime() - inicio.getTime());
  }
  return null;
}

export function buildDetalleTurnoView(
  turno: Record<string, unknown>,
  vehiculoNext: Record<string, unknown> | null,
  operadorNombre: string | null,
): DetalleTurnoView {
  const idUsuario = num(turno.idUsuario);
  const placas =
    str(vehiculoNext?.placa ?? vehiculoNext?.placas) ?? str(turno.placas);
  const noEconomico = str(
    vehiculoNext?.numeroEconomico ?? vehiculoNext?.NumeroEconomico,
  );

  const bitacoraApertura = asRecord(turno.bitacoraApertura);
  const bitacoraCierre = asRecord(turno.bitacoraCierre);
  const inspecciones = Array.isArray(turno.inspeccionesVehiculoEx)
    ? (turno.inspeccionesVehiculoEx as Record<string, unknown>[])
    : [];

  const fechaInicio = parseDate(turno.fechaApertura);
  const fechaFin = parseDate(turno.fechaCierre);
  const duracion = normalizeMysqlTime(turno.duracion);

  const kmInicial = kmFromBitacora(bitacoraApertura);
  const kmFinal = kmFromBitacora(bitacoraCierre);
  const lecturaInicial =
    kmInicial != null ? formatKmDisplay(kmInicial) : null;
  const lecturaFinal = kmFinal != null ? formatKmDisplay(kmFinal) : null;

  let distanciaKmNum: number | null = null;
  if (kmInicial != null && kmFinal != null) {
    distanciaKmNum = Math.max(0, Math.round(kmFinal - kmInicial));
  }

  const distanciaKmStr =
    distanciaKmNum != null ? `${distanciaKmNum} km` : null;

  const operador = operadorNombre?.trim() || null;

  return {
    estado: mapEstadoTurno(num(turno.idEstatusTurno), str(turno.estatusTurnoNombre)),
    empleadoYVehiculo: {
      inicialOperador: pickInicialOperador(operador),
      operador,
      idEmpleado: idUsuario != null ? `ID: ${idUsuario}` : 'ID: —',
      vehiculo: buildTituloVehiculo(vehiculoNext),
      noEconomico,
      placas,
      folio: pickFolio(vehiculoNext),
    },
    estadoVehiculo: buildEstadoVehiculo(bitacoraApertura, inspecciones),
    horarioTurno: {
      horaInicio: fechaInicio ? formatHora12h(fechaInicio) : null,
      fechaInicio: fechaInicio ? formatFecha(fechaInicio) : null,
      horaFin: fechaFin ? formatHora12h(fechaFin) : null,
      fechaFin: fechaFin ? formatFecha(fechaFin) : null,
      duracionStr: resolveDuracionStr(duracion, fechaInicio, fechaFin),
    },
    odometro: {
      badge: distanciaKmNum != null ? `${distanciaKmNum} total` : null,
      lecturaInicial,
      lecturaFinal,
    },
    kilometrajeActual: lecturaFinal ?? KILOMETRAJE_ACTUAL_FALLBACK,
    distanciaRecorrida: {
      distanciaKm: distanciaKmStr,
      progresoBarra: 0.25,
    },
  };
}
