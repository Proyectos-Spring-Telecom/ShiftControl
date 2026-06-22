import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Turnos } from 'src/entities/Turnos';
import { BitacoraVehiculo } from 'src/entities/BitacoraVehiculo';
import { IncidenciaAccidente } from 'src/entities/IncidenciaAccidente';
import { IncidenciaGasolina } from 'src/entities/IncidenciaGasolina';
import { InspeccionVehiculoEx } from 'src/entities/InspeccionVehiculoEx';
import { normalizeMysqlTime } from 'src/common/mysql-time.util';
import { VehiculosService } from 'src/vehiculos/vehiculos.service';
import { EndpointProxyService } from 'src/integration/endpoint-proxy.service';
import { ReporteImagenService } from './reporte-imagen.service';

const BITACORA_RELACIONES = [
  'tablero',
  'testigosVehiculo',
  'nivelesFluidos',
  'lucesVehiculo',
  'accesoriosVehiculo',
  'documentacionVehiculo',
] as const;

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export interface DatosTurnoPdf {
  turno: Record<string, unknown>;
}

@Injectable()
export class ReportesPdfService {
  private readonly logger = new Logger(ReportesPdfService.name);

  constructor(
    @InjectRepository(Turnos)
    private readonly turnosRepo: Repository<Turnos>,
    @InjectRepository(BitacoraVehiculo)
    private readonly bitacoraRepo: Repository<BitacoraVehiculo>,
    @InjectRepository(IncidenciaAccidente)
    private readonly incidenciaAccidenteRepo: Repository<IncidenciaAccidente>,
    @InjectRepository(IncidenciaGasolina)
    private readonly incidenciaGasolinaRepo: Repository<IncidenciaGasolina>,
    @InjectRepository(InspeccionVehiculoEx)
    private readonly inspeccionRepo: Repository<InspeccionVehiculoEx>,
    private readonly vehiculosService: VehiculosService,
    private readonly endpointProxy: EndpointProxyService,
    private readonly reporteImagenService: ReporteImagenService,
  ) { }

  async obtenerDatosTurno(
    idTurno: number,
    idCliente: number,
    req: Request,
  ): Promise<DatosTurnoPdf> {
    const turno = await this.turnosRepo.findOne({
      where: { id: idTurno },
      relations: ['vehiculo', 'estatusTurno'],
    });
    if (!turno) {
      throw new NotFoundException({ message: 'Turno no encontrado' });
    }

    const idClienteTurno = turno.idCliente ?? idCliente;
    const idBitacoraApertura =
      turno.idBitacoraApertura != null ? Number(turno.idBitacoraApertura) : null;
    const idBitacoraCierre =
      turno.idBitacoraCierre != null ? Number(turno.idBitacoraCierre) : null;
    const placa = turno.vehiculo?.placas?.trim() ?? '';

    const [bitacoraApertura, bitacoraCierre, inspecciones, incidenciasAccidente, incidenciasGasolina, vehiculoDetalle, usuarioDetalle] =
      await Promise.all([
        this.cargarBitacoraCompleta(idBitacoraApertura, idTurno, idClienteTurno),
        this.cargarBitacoraCompleta(idBitacoraCierre, idTurno, idClienteTurno),
        this.inspeccionRepo.find({
          where: { idTurno },
          relations: ['catVistaVehiculo', 'catTipoDano', 'catGradoSeveridad'],
          order: { id: 'ASC' },
        }),
        this.incidenciaAccidenteRepo.find({
          where: { idTurno },
          relations: ['catTipoIncidente'],
          order: { id: 'ASC' },
        }),
        this.incidenciaGasolinaRepo.find({
          where: { idTurno },
          order: { id: 'ASC' },
        }),
        placa ? this.tryVehiculoPorPlaca(placa, req) : Promise.resolve(null),
        turno.idUsuario != null
          ? this.tryUsuarioById(Number(turno.idUsuario), req)
          : Promise.resolve(null),
      ]);

    const placas =
      (typeof vehiculoDetalle?.['placa'] === 'string' && vehiculoDetalle['placa'].trim()) ||
      (typeof vehiculoDetalle?.['placas'] === 'string' && vehiculoDetalle['placas'].trim()) ||
      placa;

    return {
      turno: {
        id: Number(turno.id),
        idVehiculo: turno.idVehiculo,
        idCliente: turno.idCliente,
        idUsuario: turno.idUsuario,
        idBitacoraApertura: turno.idBitacoraApertura,
        evidenciaApertura: turno.evidenciaApertura,
        longitudApertura: turno.longitudApertura,
        latitudApertura: turno.latitudApertura,
        fechaApertura: turno.fechaApertura,
        idBitacoraCierre: turno.idBitacoraCierre,
        evidenciaCierre: turno.evidenciaCierre,
        longitudCierre: turno.longitudCierre,
        latitudCierre: turno.latitudCierre,
        fechaCierre: turno.fechaCierre,
        duracion: normalizeMysqlTime(turno.duracion),
        estatus: turno.estatus,
        idEstatusTurno: turno.idEstatusTurno,
        placas,
        estatusTurnoNombre: turno.estatusTurno?.nombre ?? null,
        operadorNombre: this.formatOperadorNombre(usuarioDetalle),
        operadorId: this.formatOperadorId(usuarioDetalle),
        vehiculoDetalle,
        bitacoraApertura,
        bitacoraCierre,
        inspeccionesVehiculoEx: inspecciones.map((i) => this.mapInspeccionEntity(i)),
        incidenciasAccidente: incidenciasAccidente.map((ia) =>
          this.mapIncidenciaAccidenteEntity(ia),
        ),
        incidenciasGasolina: incidenciasGasolina.map((ig) =>
          this.mapIncidenciaGasolinaEntity(ig),
        ),
      },
    };
  }

  async generarHtmlTurno(data: DatosTurnoPdf): Promise<string> {
    const imageUrls = this.collectImageUrls(data);
    const imageSrcMap = await this.reporteImagenService.comprimirUrls(imageUrls);

    const t = data.turno;
    const id = Number(t.id);
    const placa = escapeHtml(String(t.placas ?? '—'));
    const body = `
${this.estilosBase()}
<div class="header">
  <h1>Reporte de turno Folio: ${id} Placa: ${placa}</h1>
  <p class="sub">Generado: ${escapeHtml(this.formatFecha(new Date()))}</p>
</div>

<div class="section">
  <h2>Información general</h2>
  <table class="data-table">
    <tbody>
      <tr><th>ID</th><td>${id}</td></tr>
      <tr><th>Placas</th><td>${placa}</td></tr>
      <tr><th>Operador</th><td>${escapeHtml(String(t.operadorNombre ?? '—'))} ${t.operadorId ? `<span class="badge">${escapeHtml(String(t.operadorId))}</span>` : ''}</td></tr>
      <tr><th>Estatus turno</th><td><span class="badge">${escapeHtml(String(t.estatusTurnoNombre ?? '—'))}</span></td></tr>
      <tr><th>Apertura</th><td>${escapeHtml(this.formatFecha(t.fechaApertura as Date | null))}</td></tr>
      <tr><th>Cierre</th><td>${escapeHtml(this.formatFecha(t.fechaCierre as Date | null))}</td></tr>
      <tr><th>Duración</th><td>${escapeHtml(String(t.duracion ?? '—'))}</td></tr>
      <tr><th>Coord. apertura</th><td>${escapeHtml(String(t.latitudApertura ?? ''))}, ${escapeHtml(String(t.longitudApertura ?? ''))}</td></tr>
      <tr><th>Coord. cierre</th><td>${escapeHtml(String(t.latitudCierre ?? ''))}, ${escapeHtml(String(t.longitudCierre ?? ''))}</td></tr>
      ${this.renderFilaImagen('Evidencia apertura', t.evidenciaApertura, imageSrcMap)}
      ${this.renderFilaImagen('Evidencia cierre', t.evidenciaCierre, imageSrcMap)}
    </tbody>
  </table>
</div>

${this.seccionBitacora('Bitácora de apertura', t.bitacoraApertura, imageSrcMap)}
${this.seccionBitacora('Bitácora de cierre', t.bitacoraCierre, imageSrcMap)}

<div class="section">
  <h2>Inspecciones exteriores</h2>
  ${this.tablaInspecciones(t.inspeccionesVehiculoEx, imageSrcMap)}
</div>

<div class="section">
  <h2>Incidencias de accidente</h2>
  ${this.tablaIncidenciasAccidente(t.incidenciasAccidente, imageSrcMap)}
</div>

<div class="section">
  <h2>Incidencias de gasolina</h2>
  ${this.tablaIncidenciasGasolina(t.incidenciasGasolina, imageSrcMap)}
</div>

<footer class="footer">ShiftControl — Reporte generado automáticamente</footer>
`;
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Reporte de turno Folio: ${id} Placa: ${placa}</title></head><body>${body}</body></html>`;
  }

  private collectImageUrls(data: DatosTurnoPdf): string[] {
    const t = data.turno;
    const urls: string[] = [];
    const add = (value: unknown) => {
      const url = this.reporteImagenService.normalizeImageUrl(value);
      if (url) {
        urls.push(url);
      }
    };

    add(t.evidenciaApertura);
    add(t.evidenciaCierre);

    for (const bit of [t.bitacoraApertura, t.bitacoraCierre]) {
      const tab = asRecord(asRecord(bit)?.tablero);
      add(tab?.fotoTablero);
    }

    if (Array.isArray(t.inspeccionesVehiculoEx)) {
      for (const raw of t.inspeccionesVehiculoEx) {
        add(asRecord(raw)?.evidenciaFotografica);
      }
    }

    if (Array.isArray(t.incidenciasAccidente)) {
      for (const raw of t.incidenciasAccidente) {
        const i = asRecord(raw);
        if (!i) continue;
        add(i.fotoEvidencia1);
        add(i.fotoEvidencia2);
        add(i.fotoEvidencia3);
      }
    }

    if (Array.isArray(t.incidenciasGasolina)) {
      for (const raw of t.incidenciasGasolina) {
        const i = asRecord(raw);
        if (!i) continue;
        add(i.fotoTableroAntes);
        add(i.fotoTableroDespues);
        add(i.fotoBomba);
      }
    }

    return [...new Set(urls)];
  }

  private estilosBase(): string {
    return `<style>
body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 12px; color: #1a1a2e; margin: 0; padding: 16px; }
.header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; }
.header h1 { margin: 0 0 8px 0; font-size: 22px; }
.sub { margin: 0; opacity: 0.9; font-size: 12px; }
.section { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
.section h2 { margin: 0 0 12px 0; font-size: 15px; border-bottom: 2px solid #4a5568; padding-bottom: 6px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
.data-table th { background: #edf2f7; width: 28%; }
.data-table tr:nth-child(even) { background: #f7fafc; }
.warning { color: #c05621; font-weight: 600; }
.ok { color: #276749; font-weight: 600; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #edf2f7; }
.report-img { max-width: 280px; max-height: 220px; object-fit: contain; display: block; margin: 4px 0; border: 1px solid #e2e8f0; border-radius: 4px; }
.report-imgs { display: flex; flex-wrap: wrap; gap: 8px; }
.footer { text-align: center; color: #718096; font-size: 11px; margin-top: 24px; }
@media print { .section { break-inside: avoid; } }
</style>`;
  }

  private resolveImageSrc(url: unknown, imageSrcMap: Map<string, string>): string | null {
    const original = this.reporteImagenService.normalizeImageUrl(url);
    if (!original) {
      return null;
    }
    return imageSrcMap.get(original) ?? original;
  }

  private renderImagenHtml(
    url: unknown,
    alt: string,
    imageSrcMap: Map<string, string>,
  ): string {
    const src = this.resolveImageSrc(url, imageSrcMap);
    if (!src) {
      return '';
    }
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="report-img" />`;
  }

  private renderImagenesHtml(
    urls: unknown[],
    alt: string,
    imageSrcMap: Map<string, string>,
  ): string {
    const imgs = urls
      .map((url) => this.renderImagenHtml(url, alt, imageSrcMap))
      .filter((html) => html.length > 0);
    if (imgs.length === 0) {
      return '';
    }
    return `<div class="report-imgs">${imgs.join('')}</div>`;
  }

  private renderFilaImagen(
    etiqueta: string,
    url: unknown,
    imageSrcMap: Map<string, string>,
  ): string {
    const img = this.renderImagenHtml(url, etiqueta, imageSrcMap);
    if (!img) {
      return '';
    }
    return `<tr><th>${escapeHtml(etiqueta)}</th><td>${img}</td></tr>`;
  }

  private formatFecha(fecha: Date | null | undefined): string {
    if (fecha == null) return 'N/A';
    try {
      return new Date(fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    } catch {
      return 'N/A';
    }
  }

  private renderFilaFluido(nombre: string, valor: unknown): string {
    const n = valor != null && valor !== '' ? Number(valor) : null;
    if (n == null || Number.isNaN(n)) {
      return `<tr><th>${escapeHtml(nombre)}</th><td>—</td></tr>`;
    }
    const low = n < 25;
    const cls = low ? 'warning' : 'ok';
    const icon = low ? '⚠️ Bajo' : '✅ OK';
    return `<tr><th>${escapeHtml(nombre)}</th><td><span class="${cls}">${n}% — ${icon}</span></td></tr>`;
  }

  /** Testigos: valor 1 = alerta encendido */
  private renderFilaEstatus(nombre: string, valor: unknown): string {
    const v = valor != null ? Number(valor) : null;
    if (v == null || Number.isNaN(v)) {
      return `<tr><th>${escapeHtml(nombre)}</th><td>—</td></tr>`;
    }
    const alerta = v === 1;
    const cls = alerta ? 'warning' : 'ok';
    const txt = alerta ? '⚠️ Encendido / alerta' : '✅ OK';
    return `<tr><th>${escapeHtml(nombre)}</th><td><span class="${cls}">${txt}</span></td></tr>`;
  }

  /** Luces: valor 1 = normal; 0 = alerta */
  private renderFilaLuz(nombre: string, valor: unknown): string {
    const v = valor != null ? Number(valor) : null;
    if (v == null || Number.isNaN(v)) {
      return `<tr><th>${escapeHtml(nombre)}</th><td>—</td></tr>`;
    }
    const alerta = v === 0;
    const cls = alerta ? 'warning' : 'ok';
    const txt = alerta ? '⚠️ Alerta' : '✅ Normal';
    return `<tr><th>${escapeHtml(nombre)}</th><td><span class="${cls}">${txt}</span></td></tr>`;
  }

  private renderFilaAccesorioDoc(nombre: string, valor: unknown): string {
    const v = valor != null ? Number(valor) : null;
    if (v == null || Number.isNaN(v)) {
      return `<tr><th>${escapeHtml(nombre)}</th><td>—</td></tr>`;
    }
    const ok = v === 1;
    const cls = ok ? 'ok' : 'warning';
    const txt = ok ? '✅ Sí' : '— No';
    return `<tr><th>${escapeHtml(nombre)}</th><td><span class="${cls}">${txt}</span></td></tr>`;
  }

  private seccionBitacora(
    titulo: string,
    bit: unknown,
    imageSrcMap: Map<string, string>,
  ): string {
    const b = asRecord(bit);
    if (!b) {
      return `<div class="section"><h2>${escapeHtml(titulo)}</h2><p>Sin datos.</p></div>`;
    }
    const tab = asRecord(b.tablero);
    const nf = asRecord(b.nivelesFluidos);
    const lv = asRecord(b.lucesVehiculo);
    const tv = asRecord(b.testigosVehiculo);
    const av = asRecord(b.accesoriosVehiculo);
    const dv = asRecord(b.documentacionVehiculo);

    let tableroRows = '';
    if (tab) {
      tableroRows = `<tr><th>Km actual</th><td>${escapeHtml(String(tab.kmActual ?? '—'))}</td></tr>`;
      tableroRows += this.renderFilaImagen('Foto tablero', tab.fotoTablero, imageSrcMap);
    }

    const fluidLabels: [string, string][] = [
      ['Gasolina', 'gasolina'],
      ['Aceite', 'aceite'],
      ['Batería', 'bateria'],
      ['Anticongelante', 'anticongelante'],
      ['Líquido de frenos', 'liquidoFrenos'],
    ];
    let fluidRows = '';
    if (nf) {
      for (const [label, key] of fluidLabels) {
        fluidRows += this.renderFilaFluido(label, nf[key]);
      }
    }

    const lucesKeys: [string, string][] = [
      ['Altas', 'altas'],
      ['Cortas', 'cortas'],
      ['Intermitentes delanteras', 'intermitentesDelanteras'],
      ['Intermitentes traseras', 'intermitentesTraseras'],
      ['Direccionales delanteras', 'direccionalesDelanteras'],
      ['Direccionales traseras', 'direccionalesTraseras'],
      ['Intermitentes laterales', 'intermitentesLaterales'],
    ];
    let lucesRows = '';
    if (lv) {
      for (const [label, key] of lucesKeys) {
        lucesRows += this.renderFilaLuz(label, lv[key]);
      }
    }

    const testigoKeys: [string, string][] = [
      ['ABS', 'abs'],
      ['Potencia', 'potencia'],
      ['Cinturón seguridad', 'cinturonSeguridad'],
      ['Luces', 'luces'],
      ['Presión aceite', 'presionAceite'],
      ['Batería', 'bateria'],
      ['Check engine', 'checkEngine'],
      ['Airbag', 'airbag'],
      ['Presión neumático', 'presionNeumatico'],
      ['Sistema de frenos', 'sistemaFrenos'],
      ['Temperatura motor', 'temperaturaMotor'],
      ['Falla dirección asistida', 'fallaDireccionAsistida'],
    ];
    let testigosRows = '';
    if (tv) {
      for (const [label, key] of testigoKeys) {
        testigosRows += this.renderFilaEstatus(label, tv[key]);
      }
    }

    const accKeys: [string, string][] = [
      ['Limpiaparabrisas', 'limpiaparabrisas'],
      ['Aguas', 'aguas'],
      ['Extintor', 'extintor'],
      ['Triángulos', 'tringulosSeguridad'],
      ['Stereo', 'stereo'],
      ['Tapetes', 'tapetes'],
      ['Herramienta', 'herramienta'],
      ['Refacción', 'refaccion'],
      ['Impermeable', 'impermeable'],
    ];
    let accRows = '';
    if (av) {
      for (const [label, key] of accKeys) {
        accRows += this.renderFilaAccesorioDoc(label, av[key]);
      }
    }

    const docKeys: [string, string][] = [
      ['Bitácora vehicular', 'bitacoraVehicular'],
      ['Certificado ecológico', 'certificadoEcologico'],
      ['Póliza seguro', 'polizaSeguro'],
      ['Tarjeta circulación', 'tarjetaCirculacion'],
      ['Verificación', 'verificacion'],
    ];
    let docRows = '';
    if (dv) {
      for (const [label, key] of docKeys) {
        docRows += this.renderFilaAccesorioDoc(label, dv[key]);
      }
    }

    return `
<div class="section">
  <h2>${escapeHtml(titulo)}</h2>
  <p><strong>Tipo:</strong> ${escapeHtml(String(b.tipo ?? '—'))} · <strong>ID bitácora:</strong> ${escapeHtml(String(b.id ?? ''))}</p>
  <h3>Tablero</h3>
  <table class="data-table"><tbody>${tableroRows || '<tr><td colspan="2">Sin tablero</td></tr>'}</tbody></table>
  <h3>Niveles de fluidos</h3>
  <table class="data-table"><tbody>${fluidRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
  <h3>Luces</h3>
  <table class="data-table"><tbody>${lucesRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
  <h3>Testigos</h3>
  <table class="data-table"><tbody>${testigosRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
  <h3>Accesorios</h3>
  <table class="data-table"><tbody>${accRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
  <h3>Documentación</h3>
  <table class="data-table"><tbody>${docRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
</div>`;
  }

  private tablaInspecciones(arr: unknown, imageSrcMap: Map<string, string>): string {
    if (!Array.isArray(arr) || arr.length === 0) {
      return '<p>Sin inspecciones.</p>';
    }
    const rows = arr
      .map((raw) => {
        const i = asRecord(raw);
        if (!i) return '';
        const cv = asRecord(i.catVistaVehiculo);
        const ctd = asRecord(i.catTipoDano);
        const cgs = asRecord(i.catGradoSeveridad);
        return `<tr>
          <td>${Number(i.id)}</td>
          <td>${escapeHtml(String(cv?.nombre ?? '—'))}</td>
          <td>${escapeHtml(String(i.partesVehiculoEx ?? '—'))}</td>
          <td>${escapeHtml(String(ctd?.nombre ?? '—'))}</td>
          <td>${escapeHtml(String(cgs?.nombre ?? '—'))}</td>
          <td>${this.renderImagenHtml(i.evidenciaFotografica, 'Evidencia inspección', imageSrcMap) || '—'}</td>
          <td>${escapeHtml(this.formatFecha(i.fechaCreacion as Date))}</td>
        </tr>`;
      })
      .join('');
    return `<table class="data-table"><thead><tr><th>ID</th><th>Vista</th><th>Parte</th><th>Tipo daño</th><th>Severidad</th><th>Evidencia</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private tablaIncidenciasAccidente(arr: unknown, imageSrcMap: Map<string, string>): string {
    if (!Array.isArray(arr) || arr.length === 0) {
      return '<p>Sin incidencias.</p>';
    }
    const rows = arr
      .map((raw) => {
        const i = asRecord(raw);
        if (!i) return '';
        const desc = String(i.descripcion ?? '');
        const short = desc.length > 80 ? `${desc.slice(0, 80)}…` : desc;
        const cti = asRecord(i.catTipoIncidente);
        const fotos = this.renderImagenesHtml(
          [i.fotoEvidencia1, i.fotoEvidencia2, i.fotoEvidencia3],
          'Evidencia accidente',
          imageSrcMap,
        );
        return `<tr>
          <td>${Number(i.id)}</td>
          <td>${escapeHtml(short)}</td>
          <td>${escapeHtml(String(cti?.nombre ?? '—'))}</td>
          <td>${fotos || '—'}</td>
          <td>${escapeHtml(this.formatFecha(i.fechaRegistro as Date))}</td>
        </tr>`;
      })
      .join('');
    return `<table class="data-table"><thead><tr><th>ID</th><th>Descripción</th><th>Tipo incidente</th><th>Evidencias</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private tablaIncidenciasGasolina(arr: unknown, imageSrcMap: Map<string, string>): string {
    if (!Array.isArray(arr) || arr.length === 0) {
      return '<p>Sin incidencias.</p>';
    }
    const rows = arr
      .map((raw) => {
        const i = asRecord(raw);
        if (!i) return '';
        const fotos = this.renderImagenesHtml(
          [i.fotoTableroAntes, i.fotoTableroDespues, i.fotoBomba],
          'Evidencia gasolina',
          imageSrcMap,
        );
        return `<tr>
          <td>${Number(i.id)}</td>
          <td>${escapeHtml(String(i.kilometraje ?? '—'))}</td>
          <td>${escapeHtml(String(i.litrosCargados ?? '—'))}</td>
          <td>$ ${escapeHtml(String(i.totalPagado ?? '—'))}</td>
          <td>${fotos || '—'}</td>
          <td>${escapeHtml(this.formatFecha(i.fechaRegistro as Date))}</td>
        </tr>`;
      })
      .join('');
    return `<table class="data-table"><thead><tr><th>ID</th><th>Km</th><th>Litros</th><th>Total</th><th>Fotos</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private async cargarBitacoraCompleta(
    idBitacora: number | null,
    idTurno: number,
    idCliente: number,
  ): Promise<Record<string, unknown> | null> {
    if (idBitacora == null) {
      return null;
    }
    const bitacora = await this.bitacoraRepo.findOne({
      where: { id: idBitacora, idTurno, idCliente },
      relations: [...BITACORA_RELACIONES],
    });
    return this.mapBitacoraEntity(bitacora);
  }

  private mapBitacoraEntity(
    bitacora: BitacoraVehiculo | null,
  ): Record<string, unknown> | null {
    if (!bitacora) {
      return null;
    }
    return {
      id: Number(bitacora.id),
      idVehiculo: bitacora.idVehiculo,
      idCliente: bitacora.idCliente,
      tipo: bitacora.tipo,
      idTablero: bitacora.idTablero,
      idTestigosVehiculo: bitacora.idTestigosVehiculo,
      idNivelesFluidos: bitacora.idNivelesFluidos,
      idLucesVehiculo: bitacora.idLucesVehiculo,
      idAccesoriosVehiculo: bitacora.idAccesoriosVehiculo,
      idDocumentacionVehiculo: bitacora.idDocumentacionVehiculo,
      fechaCreacion: bitacora.fechaCreacion,
      estatus: bitacora.estatus,
      idTurno: bitacora.idTurno,
      tablero: this.toPlainRecord(bitacora.tablero),
      testigosVehiculo: this.toPlainRecord(bitacora.testigosVehiculo),
      nivelesFluidos: this.toPlainRecord(bitacora.nivelesFluidos),
      lucesVehiculo: this.toPlainRecord(bitacora.lucesVehiculo),
      accesoriosVehiculo: this.toPlainRecord(bitacora.accesoriosVehiculo),
      documentacionVehiculo: this.toPlainRecord(bitacora.documentacionVehiculo),
    };
  }

  private toPlainRecord(
    entity: object | null | undefined,
  ): Record<string, unknown> | null {
    if (!entity) {
      return null;
    }
    const plain = JSON.parse(JSON.stringify(entity)) as Record<string, unknown>;
    delete plain['vehiculo'];
    delete plain['turno'];
    delete plain['bitacoraVehiculo'];
    return plain;
  }

  private mapInspeccionEntity(i: InspeccionVehiculoEx): Record<string, unknown> {
    const cv = i.catVistaVehiculo;
    const ctd = i.catTipoDano;
    const cgs = i.catGradoSeveridad;
    return {
      id: Number(i.id),
      idTurno: i.idTurno,
      idBitacoraVehiculo: i.idBitacoraVehiculo,
      idVehiculo: i.idVehiculo,
      partesVehiculoEx: i.partesVehiculoEx,
      evidenciaFotografica: i.evidenciaFotografica,
      fechaCreacion: i.fechaCreacion,
      catVistaVehiculo: cv
        ? { id: Number(cv.id), nombre: cv.nombre }
        : null,
      catTipoDano: ctd ? { id: Number(ctd.id), nombre: ctd.nombre } : null,
      catGradoSeveridad: cgs
        ? { id: Number(cgs.id), nombre: cgs.nombre }
        : null,
    };
  }

  private mapIncidenciaAccidenteEntity(
    ia: IncidenciaAccidente,
  ): Record<string, unknown> {
    const cat = ia.catTipoIncidente;
    return {
      id: Number(ia.id),
      idTurno: ia.idTurno,
      idCliente: ia.idCliente,
      idVehiculo: ia.idVehiculo,
      descripcion: ia.descripcion,
      fotoEvidencia1: ia.fotoEvidencia1,
      fotoEvidencia2: ia.fotoEvidencia2,
      fotoEvidencia3: ia.fotoEvidencia3,
      latitud: ia.latitud,
      longitud: ia.longitud,
      fechaRegistro: ia.fechaRegistro,
      estatus: ia.estatus,
      fechaCreacion: ia.fechaCreacion,
      fechaActualizacion: ia.fechaActualizacion,
      catTipoIncidente: cat
        ? {
          id: Number(cat.id),
          nombre: cat.nombre,
          estatus: cat.estatus,
          fechaCreacion: cat.fechaCreacion,
          fechaActualizacion: cat.fechaActualizacion,
        }
        : null,
    };
  }

  private mapIncidenciaGasolinaEntity(
    ig: IncidenciaGasolina,
  ): Record<string, unknown> {
    return {
      id: Number(ig.id),
      idTurno: ig.idTurno,
      idCliente: ig.idCliente,
      idVehiculo: ig.idVehiculo,
      fotoTableroAntes: ig.fotoTableroAntes,
      fotoTableroDespues: ig.fotoTableroDespues,
      fotoBomba: ig.fotoBomba,
      kilometraje: ig.kilometraje,
      litrosCargados: ig.litrosCargados,
      totalPagado: ig.totalPagado,
      observaciones: ig.observaciones,
      latitud: ig.latitud,
      longitud: ig.longitud,
      fechaRegistro: ig.fechaRegistro,
      estatus: ig.estatus,
      fechaCreacion: ig.fechaCreacion,
      fechaActualizacion: ig.fechaActualizacion,
    };
  }

  private async tryVehiculoPorPlaca(
    placa: string,
    req: Request,
  ): Promise<Record<string, unknown> | null> {
    try {
      const r = await this.vehiculosService.findOneByPlaca(placa, req);
      if (r.status < 200 || r.status >= 300) {
        return null;
      }
      const payload = r.data as { data?: Record<string, unknown> };
      const vehiculo = payload?.data;
      if (vehiculo && typeof vehiculo === 'object') {
        return vehiculo;
      }
      return null;
    } catch (err) {
      this.logger.warn(
        `vehiculos/placa omitido placa=${placa}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private async tryUsuarioById(
    idUsuario: number,
    req: Request,
  ): Promise<Record<string, unknown> | null> {
    try {
      const r = await this.endpointProxy.forwardGet(`usuarios/${idUsuario}`, req);
      if (r.status < 200 || r.status >= 300) {
        return null;
      }
      const root = r.data as { data?: { usuario?: unknown[] } };
      const usuarioArr = root?.data?.usuario;
      if (
        !Array.isArray(usuarioArr) ||
        usuarioArr[0] == null ||
        typeof usuarioArr[0] !== 'object'
      ) {
        return null;
      }
      const { permiso, permisos, ...rest } = usuarioArr[0] as Record<
        string,
        unknown
      >;
      return rest;
    } catch (err) {
      this.logger.warn(
        `usuarios/${idUsuario} omitido: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private formatOperadorNombre(
    usuario: Record<string, unknown> | null,
  ): string | null {
    if (!usuario) {
      return null;
    }
    const nombreParts = [
      usuario['nombre'],
      usuario['apellidoPaterno'],
      usuario['apellidoMaterno'],
    ]
      .filter((v) => typeof v === 'string' && v.trim())
      .map((v) => String(v).trim());
    if (nombreParts.length > 0) {
      return nombreParts.join(' ');
    }
    const userName = usuario['userName'];
    return typeof userName === 'string' && userName.trim()
      ? userName.trim()
      : null;
  }

  private formatOperadorId(usuario: Record<string, unknown> | null): string | null {
    if (!usuario) {
      return null;
    }
    const idRaw = usuario['id'];
    return idRaw != null && String(idRaw).trim() !== ''
      ? `ID: ${String(idRaw).trim()}`
      : null;
  }

}
