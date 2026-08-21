import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EndpointProxyService } from 'src/integration/endpoint-proxy.service';
import { Vehiculos } from 'src/entities/Vehiculos';
import type { Request } from 'express';

@Injectable()
export class VehiculosService {
  private readonly logger = new Logger(VehiculosService.name);

  /** Texto plano o `{ nombre }` desde payload Next (list, placa, detalle). */
  private normalizeShadowText(
    raw: unknown,
    maxLen: number,
    allowNestedNombre = false,
  ): string | null | undefined {
    if (raw === undefined) {
      return undefined;
    }
    if (raw === null) {
      return null;
    }
    if (typeof raw === 'string') {
      const s = raw.trim().slice(0, maxLen);
      return s.length > 0 ? s : null;
    }
    if (allowNestedNombre && typeof raw === 'object') {
      const nombre = (raw as Record<string, unknown>)['nombre'];
      if (typeof nombre === 'string') {
        const s = nombre.trim().slice(0, maxLen);
        return s.length > 0 ? s : null;
      }
      return null;
    }
    return undefined;
  }

  private pickCatalogNombre(
    o: Record<string, unknown>,
    flatKeys: string[],
    nestedKeys: string[],
  ): string | null | undefined {
    for (const key of flatKeys) {
      const value = this.normalizeShadowText(o[key], 45);
      if (value !== undefined) {
        return value;
      }
    }
    for (const key of nestedKeys) {
      const value = this.normalizeShadowText(o[key], 45, true);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }

  /** URL de foto frontal desde payload Next (varias convenciones de nombre). */
  private pickFotoFrente(o: Record<string, unknown>): string | null | undefined {
    const raw =
      o['fotoFrente'] ??
      o['FotoFrente'] ??
      o['foto_frente'] ??
      o['fotoFrenteUrl'] ??
      o['fotoFrenteURL'] ??
      o['foto'] ??
      o['Foto'];
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (s.length > 500) {
      this.logger.warn(`FotoFrente truncada a 500 caracteres para vehículo id=${o['id']}`);
      return s.slice(0, 500);
    }
    return s;
  }

  private pickMarca(o: Record<string, unknown>): string | null | undefined {
    return this.pickCatalogNombre(
      o,
      ['marcaNombre', 'MarcaNombre', 'Marca'],
      ['marca'],
    );
  }

  private pickModelo(o: Record<string, unknown>): string | null | undefined {
    return this.pickCatalogNombre(
      o,
      ['modeloNombre', 'ModeloNombre', 'Modelo'],
      ['modelo'],
    );
  }

  private pickPlaca(o: Record<string, unknown>): string {
    const raw = o['placa'] ?? o['placas'] ?? o['Placa'] ?? o['Placas'];
    return raw != null ? String(raw).trim() : '';
  }

  private shadowFieldsFromNext(o: Record<string, unknown>): {
    fotoFrente?: string | null;
    marca?: string | null;
    modelo?: string | null;
  } {
    return {
      fotoFrente: this.pickFotoFrente(o),
      marca: this.pickMarca(o),
      modelo: this.pickModelo(o),
    };
  }

  constructor(
    private readonly endpointProxy: EndpointProxyService,
    @InjectRepository(Vehiculos)
    private readonly vehiculosRepository: Repository<Vehiculos>,
  ) {}

  /**
   * Lista todos los vehículos del cliente — proxy a Next GET /vehiculos/list
   * Además sincroniza la tabla sombra con los vehículos que llegan.
   */
  async findAllList(req: Request) {
    const r = await this.endpointProxy.forwardGet('vehiculos/list', req);

    if (r.status >= 200 && r.status < 300) {
      this.syncShadowFromList(r.data).catch((err) =>
        this.logger.warn(`Error sincronizando sombra: ${(err as Error).message}`),
      );
    }

    return { status: r.status, data: r.data };
  }

  /**
   * Lista paginada — proxy a Next GET /vehiculos/:page/:limit
   */
  async findAll(page: number, limit: number, req: Request) {
    const r = await this.endpointProxy.forwardGet(
      `vehiculos/${page}/${limit}`,
      req,
    );

    if (r.status >= 200 && r.status < 300) {
      this.syncShadowFromList(r.data).catch((err) =>
        this.logger.warn(`Error sincronizando sombra: ${(err as Error).message}`),
      );
    }

    return { status: r.status, data: r.data };
  }

  /**
   * Detalle de un vehículo — proxy a Next GET /vehiculos/:id
   * Sincroniza la tabla sombra con el vehículo recibido.
   */
  async findOne(id: number, req: Request) {
    const r = await this.endpointProxy.forwardGet(`vehiculos/${id}`, req);

    if (r.status >= 200 && r.status < 300) {
      const vehiculo = (r.data as { data?: Record<string, unknown> })?.data;
      if (vehiculo && typeof vehiculo === 'object') {
        const vid = Number(vehiculo['id']);
        const idCliente = Number(vehiculo['idCliente']);
        const placa = this.pickPlaca(vehiculo);
        if (Number.isFinite(vid) && vid > 0 && Number.isFinite(idCliente) && idCliente > 0 && placa) {
          const { fotoFrente, marca, modelo } = this.shadowFieldsFromNext(vehiculo);
          this.ensureShadow(vid, idCliente, placa, fotoFrente, marca, modelo).catch((err) =>
            this.logger.warn(
              `Error creando sombra vehiculo ${id}: ${(err as Error).message}`,
            ),
          );
        }
      }
    }

    return { status: r.status, data: r.data };
  }

  /**
   * Buscar vehículo por placa — proxy a Next GET /vehiculos/placa/:placa
   * Next retorna datos enriquecidos (marca, modelo, tipo, combustible, cliente).
   * Roles 1-3 buscan globalmente; otros roles filtran por idCliente del token (Next).
   */
  async findOneByPlaca(placa: string, req: Request) {
    const r = await this.endpointProxy.forwardGet(
      `vehiculos/placa/${encodeURIComponent(placa.trim())}`,
      req,
    );

    if (r.status >= 200 && r.status < 300) {
      const vehiculo = (r.data as { data?: Record<string, unknown> })?.data;
      if (vehiculo && typeof vehiculo === 'object') {
        const vid = Number(vehiculo['id']);
        const idCliente = Number(vehiculo['idCliente']);
        const placaNorm = this.pickPlaca(vehiculo);
        if (
          Number.isFinite(vid) &&
          vid > 0 &&
          Number.isFinite(idCliente) &&
          idCliente > 0 &&
          placaNorm
        ) {
          const { fotoFrente, marca, modelo } = this.shadowFieldsFromNext(vehiculo);
          this.ensureShadow(vid, idCliente, placaNorm, fotoFrente, marca, modelo).catch((err) =>
            this.logger.warn(
              `Error creando sombra vehiculo placa=${placa}: ${(err as Error).message}`,
            ),
          );
        }
      }
    }

    return { status: r.status, data: r.data };
  }

  /**
   * Crea o actualiza el registro sombra de un vehículo en shift_db.
   * Se usa internamente y también lo va a llamar TurnosService.
   */
  async ensureShadow(
    id: number,
    idCliente: number,
    placas: string,
    fotoFrente?: string | null,
    marca?: string | null,
    modelo?: string | null,
  ): Promise<void> {
    const placasNorm = placas.trim().slice(0, 10);
    if (!placasNorm) {
      this.logger.warn(`ensureShadow omitido: placas vacías id=${id}`);
      return;
    }

    const existing = await this.vehiculosRepository.findOne({ where: { id } });

    if (!existing) {
      await this.vehiculosRepository.save(
        this.vehiculosRepository.create({
          id,
          idCliente,
          placas: placasNorm,
          fotoFrente: fotoFrente === undefined ? null : fotoFrente,
          marca: marca === undefined ? null : marca,
          modelo: modelo === undefined ? null : modelo,
        }),
      );
      this.logger.log(`Vehículo sombra creado id=${id} placas=${placasNorm}`);
      return;
    }

    let changed = false;
    if (existing.placas !== placasNorm || existing.idCliente !== idCliente) {
      existing.placas = placasNorm;
      existing.idCliente = idCliente;
      changed = true;
    }
    if (fotoFrente !== undefined && existing.fotoFrente !== fotoFrente) {
      existing.fotoFrente = fotoFrente;
      changed = true;
    }
    if (marca !== undefined && existing.marca !== marca) {
      existing.marca = marca;
      changed = true;
    }
    if (modelo !== undefined && existing.modelo !== modelo) {
      existing.modelo = modelo;
      changed = true;
    }
    if (changed) {
      await this.vehiculosRepository.save(existing);
      this.logger.log(`Vehículo sombra actualizado id=${id} placas=${placasNorm}`);
    }
  }

  /**
   * Obtiene un vehículo de la tabla sombra local (sin llamar a Next).
   * Útil para JOINs rápidos en queries de turnos.
   */
  async findShadow(id: number): Promise<Vehiculos | null> {
    return this.vehiculosRepository.findOne({ where: { id } });
  }

  /**
   * Baja lógica recibida por webhook: elimina la sombra local.
   * No borra turnos históricos (solo dejan de resolverse joins a Vehiculos).
   */
  async removeShadow(id: number): Promise<void> {
    if (!Number.isFinite(id) || id <= 0) {
      this.logger.warn(`removeShadow omitido: id inválido ${id}`);
      return;
    }
    const result = await this.vehiculosRepository.delete({ id });
    if (result.affected && result.affected > 0) {
      this.logger.log(`Vehículo sombra eliminado id=${id}`);
    } else {
      this.logger.log(`Vehículo sombra no existía id=${id}`);
    }
  }

  /**
   * Sincroniza la tabla sombra desde una respuesta de lista de Next.
   * Se ejecuta en background (fire-and-forget) para no bloquear la respuesta.
   */
  private async syncShadowFromList(responseData: unknown): Promise<void> {
    const payload = responseData as { data?: unknown };
    const data = payload?.data;
    if (!Array.isArray(data)) return;

    for (const v of data) {
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        const id = Number(o['id']);
        const idCliente = Number(o['idCliente']);
        const placa = this.pickPlaca(o);
        if (Number.isFinite(id) && id > 0 && Number.isFinite(idCliente) && idCliente > 0 && placa) {
          const { fotoFrente, marca, modelo } = this.shadowFieldsFromNext(o);
          await this.ensureShadow(id, idCliente, placa, fotoFrente, marca, modelo);
        }
      }
    }
  }

  /**
   * Sincronización manual: llama a Next GET /vehiculos/list, trae TODOS los
   * vehículos activos del cliente del usuario y los copia a la tabla sombra.
   */
  async syncVehiculos(req: Request): Promise<{
    status: string;
    total: number;
    message: string;
  }> {
    const r = await this.endpointProxy.forwardGet(
      'vehiculos/list?soloActivos=true',
      req,
    );

    if (r.status < 200 || r.status >= 300) {
      this.logger.warn(`syncVehiculos: Next respondió con status ${r.status}`);
      return {
        status: 'error',
        total: 0,
        message: `Next respondió con status ${r.status}`,
      };
    }

    const data = (r.data as { data?: unknown })?.data;
    if (!Array.isArray(data)) {
      return {
        status: 'error',
        total: 0,
        message: 'Respuesta de Next no contiene array de vehículos',
      };
    }

    let count = 0;
    for (const v of data) {
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        const id = Number(o['id']);
        const idCliente = Number(o['idCliente']);
        const placa = this.pickPlaca(o);
        if (Number.isFinite(id) && id > 0 && Number.isFinite(idCliente) && idCliente > 0 && placa) {
          const { fotoFrente, marca, modelo } = this.shadowFieldsFromNext(o);
          await this.ensureShadow(id, idCliente, placa, fotoFrente, marca, modelo);
          count++;
        }
      }
    }

    this.logger.log(`syncVehiculos: ${count} vehículos sincronizados`);
    return {
      status: 'success',
      total: count,
      message: `${count} vehículos sincronizados correctamente`,
    };
  }
}
