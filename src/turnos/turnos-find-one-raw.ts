import { EstatusEnum } from 'src/common/estatus.enum';

export type RawQueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<Record<string, unknown>[]>;

function num(v: unknown): number | null {
  return v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
}

function str(v: unknown): string | null {
  return v != null ? String(v) : null;
}

/** Turno + vehículo + estatus + usuario + cliente (una fila). */
const SQL_TURNO_MAESTRO = `
SELECT
  t.Id AS id,
  t.IdVehiculo AS idVehiculo,
  t.IdCliente AS idCliente,
  t.IdUsuario AS idUsuario,
  t.IdBitacoraApertura AS idBitacoraApertura,
  t.EvidenciaApertura AS evidenciaApertura,
  t.LongitudApertura AS longitudApertura,
  t.LatitudApertura AS latitudApertura,
  t.FechaApertura AS fechaApertura,
  t.IdBitacoraCierre AS idBitacoraCierre,
  t.EvidenciaCierre AS evidenciaCierre,
  t.LongitudCierre AS longitudCierre,
  t.LatitudCierre AS latitudCierre,
  t.FechaCierre AS fechaCierre,
  t.Duracion AS duracion,
  t.Estatus AS estatus,
  t.IDEstatusTurno AS idEstatusTurno,
  t.FechaCreacion AS fechaCreacion,
  t.FechaActualizacion AS fechaActualizacion,
  v.Placas AS placas,
  v.FotoFrente AS fotoFrente,
  v.Id AS vehiculoId,
  v.IdCliente AS vehiculoIdCliente,
  v.FechaCreacion AS v_fechaCreacion,
  v.FechaActualizacion AS v_fechaActualizacion,
  et.Id AS etId,
  et.Nombre AS etNombre,
  et.Estatus AS et_estatus,
  et.FechaCreacion AS et_fechaCreacion,
  et.FechaActualizacion AS et_fechaActualizacion,
  u.Id AS u_id,
  u.IdCliente AS u_idCliente,
  u.IdRol AS u_idRol,
  u.IdSolucion AS u_idSolucion,
  u.IdClienteGeneral AS u_idClienteGeneral,
  u.IdFaceAuth AS u_idFaceAuth,
  c.Id AS c_id,
  c.IdPadre AS c_idPadre
FROM Turnos t
LEFT JOIN Vehiculos v ON v.Id = t.IdVehiculo
LEFT JOIN CatEstatusTurno et ON et.Id = t.IDEstatusTurno
LEFT JOIN Usuarios u ON u.Id = t.IdUsuario AND u.IdCliente = t.IdCliente
LEFT JOIN Clientes c ON c.Id = t.IdCliente
WHERE t.Id = ? AND t.IdCliente = ?
LIMIT 1
`;

/** Bitácora con tablero, testigos, fluidos, luces, accesorios y documentación en un solo JOIN. */
const SQL_BITACORA_COMPLETA = `
SELECT
  b.Id AS b_id,
  b.IdVehiculo AS b_idVehiculo,
  b.IdCliente AS b_idCliente,
  b.Tipo AS b_tipo,
  b.IdTablero AS b_idTablero,
  b.IdTestigosVehiculo AS b_idTestigosVehiculo,
  b.IdNivelesFluidos AS b_idNivelesFluidos,
  b.IdLucesVehiculo AS b_idLucesVehiculo,
  b.IdAccesoriosVehiculo AS b_idAccesoriosVehiculo,
  b.IdDocumentacionVehiculo AS b_idDocumentacionVehiculo,
  b.FechaCreacion AS b_fechaCreacion,
  b.Estatus AS b_estatus,
  b.IdTurno AS b_idTurno,
  tbl.Id AS tbl_id,
  tbl.FotoTablero AS tbl_fotoTablero,
  tbl.IdTurno AS tbl_idTurno,
  tbl.IdVehiculo AS tbl_idVehiculo,
  tbl.KmActual AS tbl_kmActual,
  tv.Id AS tv_id,
  tv.IdTurno AS tv_idTurno,
  tv.IdVehiculo AS tv_idVehiculo,
  tv.Estatus AS tv_estatus,
  tv.FechaCreacion AS tv_fechaCreacion,
  tv.FechaActualizacion AS tv_fechaActualizacion,
  tv.TemperaturaMotorAlta AS tv_temperaturaMotorAlta,
  tv.PresionAceite AS tv_presionAceite,
  tv.Bateria AS tv_bateria,
  tv.Airbag AS tv_airbag,
  tv.CheckEngine AS tv_checkEngine,
  tv.ABS AS tv_abs,
  tv.SistemaFrenos AS tv_sistemaFrenos,
  tv.ControlEstabilidad AS tv_controlEstabilidad,
  tv.ControlTraccion AS tv_controlTraccion,
  tv.NivelCombustible AS tv_nivelCombustible,
  tv.FiltroParticulas AS tv_filtroParticulas,
  tv.BujiasIncandecentes AS tv_bujiasIncandecentes,
  tv.PresionNeumatico AS tv_presionNeumatico,
  tv.FallaDireccionAsistida AS tv_fallaDireccionAsistida,
  tv.RefrigeranteMotor AS tv_refrigeranteMotor,
  tv.BloqueoDiferencial AS tv_bloqueoDiferencial,
  tv.ControlAcelerador AS tv_controlAcelerador,
  tv.LlavePresencia AS tv_llavePresencia,
  tv.NivelLuiquidoFrenos AS tv_nivelLiquidoFrenos,
  tv.Cajuela AS tv_cajuela,
  tv.Puerta AS tv_puerta,
  tv.CinturonSeguridad AS tv_cinturonSeguridad,
  tv.CambioAceite AS tv_cambioAceite,
  tv.Servicio AS tv_servicio,
  nf.Id AS nf_id,
  nf.IdTurno AS nf_idTurno,
  nf.IdVehiculo AS nf_idVehiculo,
  nf.Gasolina AS nf_gasolina,
  nf.Aceite AS nf_aceite,
  nf.Bateria AS nf_bateria,
  nf.Anticongelante AS nf_anticongelante,
  nf.LiquidoFrenos AS nf_liquidoFrenos,
  nf.Estatus AS nf_estatus,
  nf.FechaCreacion AS nf_fechaCreacion,
  nf.FechaActualizacion AS nf_fechaActualizacion,
  lv.Id AS lv_id,
  lv.IdTurno AS lv_idTurno,
  lv.IdVehiculo AS lv_idVehiculo,
  lv.Altas AS lv_altas,
  lv.Cortas AS lv_cortas,
  lv.IntermitentesDelanteras AS lv_intermitentesDelanteras,
  lv.IntermitentesTraseras AS lv_intermitentesTraseras,
  lv.DireccionalesDelanteras AS lv_direccionalesDelanteras,
  lv.DireccionalesTraseras AS lv_direccionalesTraseras,
  lv.IntermitentesLaterales AS lv_intermitentesLaterales,
  lv.Estatus AS lv_estatus,
  lv.FechaCreacion AS lv_fechaCreacion,
  lv.FechaActualizacion AS lv_fechaActualizacion,
  av.Id AS av_id,
  av.IdTurno AS av_idTurno,
  av.IdVehiculo AS av_idVehiculo,
  av.Limpiaparabrisas AS av_limpiaparabrisas,
  av.Extintor AS av_extintor,
  av.TringulosSeguridad AS av_tringulosSeguridad,
  av.Stereo AS av_stereo,
  av.Tapetes AS av_tapetes,
  av.Refaccion AS av_refaccion,
  av.Gato AS av_gato,
  av.BirloSeguridad AS av_birloSeguridad,
  av.Estatus AS av_estatus,
  av.FechaCreacion AS av_fechaCreacion,
  av.FechaActualizacion AS av_fechaActualizacion,
  dv.Id AS dv_id,
  dv.IdTurno AS dv_idTurno,
  dv.IdVehiculo AS dv_idVehiculo,
  dv.TarjetaCirculacion AS dv_tarjetaCirculacion,
  dv.Verificacion AS dv_verificacion,
  dv.PolizaSeguro AS dv_polizaSeguro,
  dv.Tenencia AS dv_tenencia,
  dv.CertificadoEcologico AS dv_certificadoEcologico,
  dv.Manual AS dv_manual,
  dv.PermisoCarga AS dv_permisoCarga,
  dv.CartaPorte AS dv_cartaPorte,
  dv.Estatus AS dv_estatus,
  dv.FechaCreacion AS dv_fechaCreacion,
  dv.FechaActualizacion AS dv_fechaActualizacion
FROM BitacoraVehiculo b
LEFT JOIN Tablero tbl ON tbl.Id = b.IdTablero
LEFT JOIN TestigosVehiculo tv ON tv.Id = b.IdTestigosVehiculo
LEFT JOIN NivelesFluidos nf ON nf.Id = b.IdNivelesFluidos
LEFT JOIN LucesVehiculo lv ON lv.Id = b.IdLucesVehiculo
LEFT JOIN AccesoriosVehiculo av ON av.Id = b.IdAccesoriosVehiculo
LEFT JOIN DocumentacionVehiculo dv ON dv.Id = b.IdDocumentacionVehiculo
WHERE b.Id = ? AND b.IdTurno = ? AND b.IdCliente = ?
LIMIT 1
`;

const SQL_INSPECCIONES = `
SELECT
  iv.Id AS iv_id,
  iv.IdTurno AS iv_idTurno,
  iv.IdBitacoraVehiculo AS iv_idBitacoraVehiculo,
  iv.IdVehiculo AS iv_idVehiculo,
  iv.IdCatVistaVehiculo AS iv_idCatVistaVehiculo,
  iv.PartesVehiculoEx AS iv_partesVehiculoEx,
  iv.IdCatTipoDano AS iv_idCatTipoDano,
  iv.IdCatGradoSeveridad AS iv_idCatGradoSeveridad,
  iv.EvidenciaFotografica AS iv_evidenciaFotografica,
  iv.FechaCreacion AS iv_fechaCreacion,
  iv.FechaActualizacion AS iv_fechaActualizacion,
  cv.Id AS cv_id,
  cv.Nombre AS cv_nombre,
  cv.Estatus AS cv_estatus,
  cv.FechaCreacion AS cv_fechaCreacion,
  cv.FechaActualizacion AS cv_fechaActualizacion,
  ctd.Id AS ctd_id,
  ctd.Nombre AS ctd_nombre,
  ctd.Estatus AS ctd_estatus,
  ctd.FechaCreacion AS ctd_fechaCreacion,
  ctd.FechaActualizacion AS ctd_fechaActualizacion,
  cgs.Id AS cgs_id,
  cgs.Nombre AS cgs_nombre,
  cgs.Estatus AS cgs_estatus,
  cgs.FechaCreacion AS cgs_fechaCreacion,
  cgs.FechaActualizacion AS cgs_fechaActualizacion
FROM InspeccionVehiculoEx iv
LEFT JOIN CatVistaVehiculo cv ON cv.Id = iv.IdCatVistaVehiculo
LEFT JOIN CatTipoDano ctd ON ctd.Id = iv.IdCatTipoDano
LEFT JOIN CatGradoSeveridad cgs ON cgs.Id = iv.IdCatGradoSeveridad
WHERE iv.IdTurno = ?
ORDER BY iv.Id ASC
`;

const SQL_INCIDENCIAS_ACCIDENTE = `
SELECT
  ia.Id AS ia_id,
  ia.IdTurno AS ia_idTurno,
  ia.IdCliente AS ia_idCliente,
  ia.IdVehiculo AS ia_idVehiculo,
  ia.Descripcion AS ia_descripcion,
  ia.FotoEvidencia1 AS ia_fotoEvidencia1,
  ia.FotoEvidencia2 AS ia_fotoEvidencia2,
  ia.FotoEvidencia3 AS ia_fotoEvidencia3,
  ia.Latitud AS ia_latitud,
  ia.Longitud AS ia_longitud,
  ia.FechaRegistro AS ia_fechaRegistro,
  ia.Estatus AS ia_estatus,
  ia.FechaCreacion AS ia_fechaCreacion,
  ia.FechaActualizacion AS ia_fechaActualizacion,
  ctd.Id AS iactd_id,
  ctd.Nombre AS iactd_nombre,
  ctd.Estatus AS iactd_estatus,
  ctd.FechaCreacion AS iactd_fechaCreacion,
  ctd.FechaActualizacion AS iactd_fechaActualizacion,
  cgs.Id AS iacgs_id,
  cgs.Nombre AS iacgs_nombre,
  cgs.Estatus AS iacgs_estatus,
  cgs.FechaCreacion AS iacgs_fechaCreacion,
  cgs.FechaActualizacion AS iacgs_fechaActualizacion
FROM IncidenciaAccidente ia
LEFT JOIN CatTipoDano ctd ON ctd.Id = ia.IdCatTipoDano
LEFT JOIN CatGradoSeveridad cgs ON cgs.Id = ia.IdCatGradoSeveridad
WHERE ia.IdTurno = ? AND ia.IdCliente = ? AND ia.Estatus = ?
ORDER BY ia.Id ASC
`;

const SQL_INCIDENCIAS_GASOLINA = `
SELECT
  ig.Id AS ig_id,
  ig.IdTurno AS ig_idTurno,
  ig.IdCliente AS ig_idCliente,
  ig.IdVehiculo AS ig_idVehiculo,
  ig.FotoTableroAntes AS ig_fotoTableroAntes,
  ig.FotoTableroDespues AS ig_fotoTableroDespues,
  ig.FotoBomba AS ig_fotoBomba,
  ig.Kilometraje AS ig_kilometraje,
  ig.LitrosCargados AS ig_litrosCargados,
  ig.TotalPagado AS ig_totalPagado,
  ig.Observaciones AS ig_observaciones,
  ig.Latitud AS ig_latitud,
  ig.Longitud AS ig_longitud,
  ig.FechaRegistro AS ig_fechaRegistro,
  ig.Estatus AS ig_estatus,
  ig.FechaCreacion AS ig_fechaCreacion,
  ig.FechaActualizacion AS ig_fechaActualizacion
FROM IncidenciaGasolina ig
WHERE ig.IdTurno = ? AND ig.IdCliente = ? AND ig.Estatus = ?
ORDER BY ig.Id ASC
`;

function mapCat(
  row: Record<string, unknown>,
  prefix: string,
): Record<string, unknown> | null {
  const id = num(row[`${prefix}_id`]);
  if (id == null) return null;
  return {
    id,
    nombre: str(row[`${prefix}_nombre`]) ?? '',
    estatus: num(row[`${prefix}_estatus`]),
    fechaCreacion: row[`${prefix}_fechaCreacion`] ?? null,
    fechaActualizacion: row[`${prefix}_fechaActualizacion`] ?? null,
  };
}

function mapTableroFromRow(r: Record<string, unknown>): Record<string, unknown> | null {
  const id = num(r.tbl_id);
  if (id == null) return null;
  return {
    id,
    fotoTablero: str(r.tbl_fotoTablero),
    idTurno: num(r.tbl_idTurno),
    idVehiculo: num(r.tbl_idVehiculo),
    kmActual: r.tbl_kmActual != null ? Number(r.tbl_kmActual as number | string) : null,
  };
}

function mapTestigosFromRow(r: Record<string, unknown>): Record<string, unknown> | null {
  const id = num(r.tv_id);
  if (id == null) return null;
  return {
    id,
    idTurno: num(r.tv_idTurno),
    idVehiculo: num(r.tv_idVehiculo),
    estatus: num(r.tv_estatus),
    fechaCreacion: r.tv_fechaCreacion ?? null,
    fechaActualizacion: r.tv_fechaActualizacion ?? null,
    temperaturaMotorAlta: num(r.tv_temperaturaMotorAlta),
    presionAceite: num(r.tv_presionAceite),
    bateria: num(r.tv_bateria),
    airbag: num(r.tv_airbag),
    checkEngine: num(r.tv_checkEngine),
    abs: num(r.tv_abs),
    sistemaFrenos: num(r.tv_sistemaFrenos),
    controlEstabilidad: num(r.tv_controlEstabilidad),
    controlTraccion: num(r.tv_controlTraccion),
    nivelCombustible: num(r.tv_nivelCombustible),
    filtroParticulas: num(r.tv_filtroParticulas),
    bujiasIncandecentes: num(r.tv_bujiasIncandecentes),
    presionNeumatico: num(r.tv_presionNeumatico),
    fallaDireccionAsistida: num(r.tv_fallaDireccionAsistida),
    refrigeranteMotor: num(r.tv_refrigeranteMotor),
    bloqueoDiferencial: num(r.tv_bloqueoDiferencial),
    controlAcelerador: num(r.tv_controlAcelerador),
    llavePresencia: num(r.tv_llavePresencia),
    nivelLiquidoFrenos: num(r.tv_nivelLiquidoFrenos),
    cajuela: num(r.tv_cajuela),
    puerta: num(r.tv_puerta),
    cinturonSeguridad: num(r.tv_cinturonSeguridad),
    cambioAceite: num(r.tv_cambioAceite),
    servicio: num(r.tv_servicio),
  };
}

function mapNivelesFromRow(r: Record<string, unknown>): Record<string, unknown> | null {
  const id = num(r.nf_id);
  if (id == null) return null;
  return {
    id,
    idTurno: num(r.nf_idTurno),
    idVehiculo: num(r.nf_idVehiculo),
    gasolina: num(r.nf_gasolina),
    aceite: num(r.nf_aceite),
    bateria: num(r.nf_bateria),
    anticongelante: num(r.nf_anticongelante),
    liquidoFrenos: num(r.nf_liquidoFrenos),
    estatus: num(r.nf_estatus),
    fechaCreacion: r.nf_fechaCreacion ?? null,
    fechaActualizacion: r.nf_fechaActualizacion ?? null,
  };
}

function mapLucesFromRow(r: Record<string, unknown>): Record<string, unknown> | null {
  const id = num(r.lv_id);
  if (id == null) return null;
  return {
    id,
    idTurno: num(r.lv_idTurno),
    idVehiculo: num(r.lv_idVehiculo),
    altas: num(r.lv_altas),
    cortas: num(r.lv_cortas),
    intermitentesDelanteras: num(r.lv_intermitentesDelanteras),
    intermitentesTraseras: num(r.lv_intermitentesTraseras),
    direccionalesDelanteras: num(r.lv_direccionalesDelanteras),
    direccionalesTraseras: num(r.lv_direccionalesTraseras),
    intermitentesLaterales: num(r.lv_intermitentesLaterales),
    estatus: num(r.lv_estatus),
    fechaCreacion: r.lv_fechaCreacion ?? null,
    fechaActualizacion: r.lv_fechaActualizacion ?? null,
  };
}

function mapAccesoriosFromRow(r: Record<string, unknown>): Record<string, unknown> | null {
  const id = num(r.av_id);
  if (id == null) return null;
  return {
    id,
    idTurno: num(r.av_idTurno),
    idVehiculo: num(r.av_idVehiculo),
    limpiaparabrisas: num(r.av_limpiaparabrisas),
    extintor: num(r.av_extintor),
    tringulosSeguridad: num(r.av_tringulosSeguridad),
    stereo: num(r.av_stereo),
    tapetes: num(r.av_tapetes),
    refaccion: num(r.av_refaccion),
    gato: num(r.av_gato),
    birloSeguridad: num(r.av_birloSeguridad),
    estatus: num(r.av_estatus),
    fechaCreacion: r.av_fechaCreacion ?? null,
    fechaActualizacion: r.av_fechaActualizacion ?? null,
  };
}

function mapDocumentacionFromRow(r: Record<string, unknown>): Record<string, unknown> | null {
  const id = num(r.dv_id);
  if (id == null) return null;
  return {
    id,
    idTurno: num(r.dv_idTurno),
    idVehiculo: num(r.dv_idVehiculo),
    tarjetaCirculacion: num(r.dv_tarjetaCirculacion),
    verificacion: num(r.dv_verificacion),
    polizaSeguro: num(r.dv_polizaSeguro),
    tenencia: num(r.dv_tenencia),
    certificadoEcologico: num(r.dv_certificadoEcologico),
    manual: num(r.dv_manual),
    permisoCarga: num(r.dv_permisoCarga),
    cartaPorte: num(r.dv_cartaPorte),
    estatus: num(r.dv_estatus),
    fechaCreacion: r.dv_fechaCreacion ?? null,
    fechaActualizacion: r.dv_fechaActualizacion ?? null,
  };
}

/** Objeto JSON único por bitácora: fila base + tablero + testigos + fluidos + luces + accesorios + documentación. */
function mapBitacoraCompletaJson(r: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!r || r.b_id == null) return null;
  return {
    id: num(r.b_id),
    idVehiculo: num(r.b_idVehiculo),
    idCliente: num(r.b_idCliente),
    tipo: num(r.b_tipo),
    idTablero: num(r.b_idTablero),
    idTestigosVehiculo: num(r.b_idTestigosVehiculo),
    idNivelesFluidos: num(r.b_idNivelesFluidos),
    idLucesVehiculo: num(r.b_idLucesVehiculo),
    idAccesoriosVehiculo: num(r.b_idAccesoriosVehiculo),
    idDocumentacionVehiculo: num(r.b_idDocumentacionVehiculo),
    fechaCreacion: r.b_fechaCreacion ?? null,
    estatus: num(r.b_estatus),
    idTurno: num(r.b_idTurno),
    tablero: mapTableroFromRow(r),
    testigosVehiculo: mapTestigosFromRow(r),
    nivelesFluidos: mapNivelesFromRow(r),
    lucesVehiculo: mapLucesFromRow(r),
    accesoriosVehiculo: mapAccesoriosFromRow(r),
    documentacionVehiculo: mapDocumentacionFromRow(r),
  };
}

function mapTurnoBasePlano(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: Number(row.id),
    idVehiculo: num(row.idVehiculo),
    idCliente: num(row.idCliente),
    idUsuario: num(row.idUsuario),
    idBitacoraApertura: num(row.idBitacoraApertura),
    evidenciaApertura: str(row.evidenciaApertura),
    longitudApertura: num(row.longitudApertura),
    latitudApertura: num(row.latitudApertura),
    fechaApertura: row.fechaApertura ?? null,
    idBitacoraCierre: num(row.idBitacoraCierre),
    evidenciaCierre: str(row.evidenciaCierre),
    longitudCierre: num(row.longitudCierre),
    latitudCierre: num(row.latitudCierre),
    fechaCierre: row.fechaCierre ?? null,
    duracion: num(row.duracion),
    estatus: num(row.estatus),
    idEstatusTurno: num(row.idEstatusTurno),
    fechaCreacion: row.fechaCreacion ?? null,
    fechaActualizacion: row.fechaActualizacion ?? null,
    placas: str(row.placas),
    fotoFrente: str(row.fotoFrente),
    vehiculoId: num(row.vehiculoId),
    vehiculoIdCliente: num(row.vehiculoIdCliente),
    estatusTurnoId: num(row.etId),
    estatusTurnoNombre: str(row.etNombre),
  };
}

function mapVehiculoNested(row: Record<string, unknown>): Record<string, unknown> | null {
  const vid = num(row.vehiculoId);
  if (vid == null) return null;
  return {
    id: vid,
    idCliente: num(row.vehiculoIdCliente),
    placas: str(row.placas),
    fotoFrente: str(row.fotoFrente),
    fechaCreacion: row.v_fechaCreacion ?? null,
    fechaActualizacion: row.v_fechaActualizacion ?? null,
  };
}

function mapEstatusTurnoNested(row: Record<string, unknown>): Record<string, unknown> | null {
  const id = num(row.etId);
  if (id == null) return null;
  return {
    id,
    nombre: str(row.etNombre) ?? '',
    estatus: num(row.et_estatus),
    fechaCreacion: row.et_fechaCreacion ?? null,
    fechaActualizacion: row.et_fechaActualizacion ?? null,
  };
}

function mapUsuarioNested(row: Record<string, unknown>): Record<string, unknown> | null {
  const id = num(row.u_id);
  if (id == null) return null;
  return {
    id,
    idCliente: num(row.u_idCliente),
    idRol: num(row.u_idRol),
    idSolucion: num(row.u_idSolucion),
    idClienteGeneral: num(row.u_idClienteGeneral),
    idFaceAuth: num(row.u_idFaceAuth),
  };
}

function mapClienteNested(row: Record<string, unknown>): Record<string, unknown> | null {
  const id = num(row.c_id);
  if (id == null) return null;
  return {
    id,
    idPadre: num(row.c_idPadre),
  };
}

function mapInspeccionRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: Number(r.iv_id),
    idTurno: num(r.iv_idTurno),
    idBitacoraVehiculo: num(r.iv_idBitacoraVehiculo),
    idVehiculo: num(r.iv_idVehiculo),
    idCatVistaVehiculo: num(r.iv_idCatVistaVehiculo),
    partesVehiculoEx: str(r.iv_partesVehiculoEx) ?? '',
    idCatTipoDano: num(r.iv_idCatTipoDano),
    idCatGradoSeveridad: num(r.iv_idCatGradoSeveridad),
    evidenciaFotografica: str(r.iv_evidenciaFotografica) ?? '',
    fechaCreacion: r.iv_fechaCreacion ?? null,
    fechaActualizacion: r.iv_fechaActualizacion ?? null,
    catVistaVehiculo: mapCat(r, 'cv'),
    catTipoDano: mapCat(r, 'ctd'),
    catGradoSeveridad: mapCat(r, 'cgs'),
  };
}

function mapIncidenciaAccidenteRow(r: Record<string, unknown>): Record<string, unknown> {
  const catTipoDano =
    r.iactd_id != null
      ? {
          id: num(r.iactd_id),
          nombre: str(r.iactd_nombre) ?? '',
          estatus: num(r.iactd_estatus),
          fechaCreacion: r.iactd_fechaCreacion ?? null,
          fechaActualizacion: r.iactd_fechaActualizacion ?? null,
        }
      : null;
  const catGradoSeveridad =
    r.iacgs_id != null
      ? {
          id: num(r.iacgs_id),
          nombre: str(r.iacgs_nombre) ?? '',
          estatus: num(r.iacgs_estatus),
          fechaCreacion: r.iacgs_fechaCreacion ?? null,
          fechaActualizacion: r.iacgs_fechaActualizacion ?? null,
        }
      : null;
  return {
    id: Number(r.ia_id),
    idTurno: num(r.ia_idTurno),
    idCliente: num(r.ia_idCliente),
    idVehiculo: num(r.ia_idVehiculo),
    descripcion: str(r.ia_descripcion) ?? '',
    fotoEvidencia1: str(r.ia_fotoEvidencia1),
    fotoEvidencia2: str(r.ia_fotoEvidencia2),
    fotoEvidencia3: str(r.ia_fotoEvidencia3),
    latitud: num(r.ia_latitud),
    longitud: num(r.ia_longitud),
    fechaRegistro: r.ia_fechaRegistro ?? null,
    estatus: num(r.ia_estatus),
    fechaCreacion: r.ia_fechaCreacion ?? null,
    fechaActualizacion: r.ia_fechaActualizacion ?? null,
    catTipoDano,
    catGradoSeveridad,
  };
}

function mapIncidenciaGasolinaRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: Number(r.ig_id),
    idTurno: num(r.ig_idTurno),
    idCliente: num(r.ig_idCliente),
    idVehiculo: num(r.ig_idVehiculo),
    fotoTableroAntes: str(r.ig_fotoTableroAntes),
    fotoTableroDespues: str(r.ig_fotoTableroDespues),
    fotoBomba: str(r.ig_fotoBomba),
    kilometraje: r.ig_kilometraje != null ? Number(r.ig_kilometraje as number | string) : null,
    litrosCargados: r.ig_litrosCargados != null ? Number(r.ig_litrosCargados as number | string) : null,
    totalPagado: num(r.ig_totalPagado),
    observaciones: str(r.ig_observaciones),
    latitud: num(r.ig_latitud),
    longitud: num(r.ig_longitud),
    fechaRegistro: r.ig_fechaRegistro ?? null,
    estatus: num(r.ig_estatus),
    fechaCreacion: r.ig_fechaCreacion ?? null,
    fechaActualizacion: r.ig_fechaActualizacion ?? null,
  };
}

async function cargarBitacora(
  query: RawQueryFn,
  idBitacora: number | null,
  idTurno: number,
  idCliente: number,
): Promise<Record<string, unknown> | null> {
  if (idBitacora == null) return null;
  const rows = await query(SQL_BITACORA_COMPLETA, [idBitacora, idTurno, idCliente]);
  return mapBitacoraCompletaJson(rows[0] as Record<string, unknown> | undefined);
}

/**
 * Detalle de turno vía SQL crudo: bitácoras de apertura/cierre como un objeto JSON cada una
 * (con tablero, testigos, fluidos, luces, accesorios, documentación anidados).
 */
export async function loadTurnoDetalleSql(
  query: RawQueryFn,
  idTurno: number,
  idCliente: number,
): Promise<Record<string, unknown> | null> {
  const turnoRows = await query(SQL_TURNO_MAESTRO, [idTurno, idCliente]);
  const master = turnoRows[0] as Record<string, unknown> | undefined;
  if (!master) return null;

  const idAper = num(master.idBitacoraApertura);
  const idCie = num(master.idBitacoraCierre);

  const [bitAper, bitCie, inspRows, accRows, gasRows] = await Promise.all([
    cargarBitacora(query, idAper, idTurno, idCliente),
    cargarBitacora(query, idCie, idTurno, idCliente),
    query(SQL_INSPECCIONES, [idTurno]),
    query(SQL_INCIDENCIAS_ACCIDENTE, [idTurno, idCliente, EstatusEnum.ACTIVO]),
    query(SQL_INCIDENCIAS_GASOLINA, [idTurno, idCliente, EstatusEnum.ACTIVO]),
  ]);

  return {
    ...mapTurnoBasePlano(master),
    vehiculo: mapVehiculoNested(master),
    estatusTurno: mapEstatusTurnoNested(master),
    usuario: mapUsuarioNested(master),
    cliente: mapClienteNested(master),
    bitacoraApertura: bitAper,
    bitacoraCierre: bitCie,
    inspeccionesVehiculoEx: inspRows.map((r) => mapInspeccionRow(r as Record<string, unknown>)),
    incidenciasAccidente: accRows.map((r) => mapIncidenciaAccidenteRow(r as Record<string, unknown>)),
    incidenciasGasolina: gasRows.map((r) => mapIncidenciaGasolinaRow(r as Record<string, unknown>)),
  };
}
