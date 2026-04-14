import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EndpointProxyService } from 'src/integration/endpoint-proxy.service';
import { Clientes } from 'src/entities/Clientes';
import type { Request } from 'express';

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);

  constructor(
    private readonly endpointProxy: EndpointProxyService,
    @InjectRepository(Clientes)
    private readonly clientesRepository: Repository<Clientes>,
  ) {}

  /**
   * Lista de clientes — proxy a Next GET /clientes/list
   */
  async findAllList(req: Request) {
    const r = await this.endpointProxy.forwardGet('clientes/list', req);

    const mensaje = 'hola mundo';

    if (r.status >= 200 && r.status < 300) {
      this.syncShadowFromList(r.data).catch((err) =>
        this.logger.warn(
          `Error sincronizando sombra clientes: ${(err as Error).message}`,
        ),
      );
    }

    return { status: r.status, data: r.data };
  }

  /**
   * Lista de clientes por ID — proxy a Next GET /clientes/list/:cliente
   */
  async findAllListById(clienteId: number, req: Request) {
    const r = await this.endpointProxy.forwardGet(`clientes/list/${clienteId}`, req);

    if (r.status >= 200 && r.status < 300) {
      this.syncShadowFromList(r.data).catch((err) =>
        this.logger.warn(
          `Error sincronizando sombra clientes: ${(err as Error).message}`,
        ),
      );
    }

    return { status: r.status, data: r.data };
  }

  /**
   * Lista paginada — proxy a Next GET /clientes/:page/:limit
   */
  async findAll(page: number, limit: number, req: Request) {
    const r = await this.endpointProxy.forwardGet(`clientes/${page}/${limit}`, req);

    if (r.status >= 200 && r.status < 300) {
      this.syncShadowFromList(r.data).catch((err) =>
        this.logger.warn(
          `Error sincronizando sombra clientes: ${(err as Error).message}`,
        ),
      );
    }

    return { status: r.status, data: r.data };
  }

  /**
   * Detalle de un cliente — proxy a Next GET /clientes/:id
   */
  async findOne(id: number, req: Request) {
    const r = await this.endpointProxy.forwardGet(`clientes/${id}`, req);

    if (r.status >= 200 && r.status < 300) {
      const cliente = (r.data as { data?: Record<string, unknown> })?.data;
      if (cliente && typeof cliente === 'object' && cliente['id'] != null) {
        const cid = Number(cliente['id']);
        const idPadreRaw = cliente['idPadre'];
        const idPadre =
          idPadreRaw != null && idPadreRaw !== '' ? Number(idPadreRaw) : null;
        if (Number.isFinite(cid) && cid > 0) {
          this.ensureShadow(
            cid,
            idPadre != null && Number.isFinite(idPadre) ? idPadre : null,
          ).catch((err) =>
            this.logger.warn(
              `Error creando sombra cliente ${id}: ${(err as Error).message}`,
            ),
          );
        }
      }
    }

    return { status: r.status, data: r.data };
  }

  /**
   * Sincronización manual: llama a Next GET /clientes/list, trae todos los
   * clientes del usuario y los copia a la tabla sombra.
   */
  async syncClientes(req: Request): Promise<{
    status: string;
    total: number;
    message: string;
  }> {
    const r = await this.endpointProxy.forwardGet('clientes/list', req);

    if (r.status < 200 || r.status >= 300) {
      this.logger.warn(`syncClientes: Next respondió con status ${r.status}`);
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
        message: 'Respuesta de Next no contiene array de clientes',
      };
    }

    let count = 0;
    for (const c of data) {
      if (c && typeof c === 'object') {
        const o = c as Record<string, unknown>;
        if (o['id'] != null) {
          const id = Number(o['id']);
          const idPadreRaw = o['idPadre'];
          const idPadre =
            idPadreRaw != null && idPadreRaw !== '' ? Number(idPadreRaw) : null;
          await this.ensureShadow(
            id,
            idPadre != null && Number.isFinite(idPadre) ? idPadre : null,
          );
          count++;
        }
      }
    }

    this.logger.log(`syncClientes: ${count} clientes sincronizados`);
    return {
      status: 'success',
      total: count,
      message: `${count} clientes sincronizados correctamente`,
    };
  }

  /**
   * Crea o actualiza el registro sombra de un cliente en shift_db.
   */
  async ensureShadow(id: number, idPadre: number | null): Promise<void> {
    if (!Number.isFinite(id) || id <= 0) {
      this.logger.warn(`ensureShadow omitido: id inválido ${id}`);
      return;
    }

    const existing = await this.clientesRepository.findOne({ where: { id } });

    if (!existing) {
      await this.clientesRepository.save(this.clientesRepository.create({ id, idPadre }));
      this.logger.log(`Cliente sombra creado id=${id} idPadre=${idPadre}`);
      return;
    }

    const padreNorm =
      idPadre != null && Number.isFinite(idPadre) && idPadre > 0 ? idPadre : null;

    if (existing.idPadre !== padreNorm) {
      existing.idPadre = padreNorm;
      await this.clientesRepository.save(existing);
      this.logger.log(`Cliente sombra actualizado id=${id} idPadre=${padreNorm}`);
    }
  }

  /**
   * Obtiene un cliente de la tabla sombra local (sin llamar a Next).
   */
  async findShadow(id: number): Promise<Clientes | null> {
    return this.clientesRepository.findOne({ where: { id } });
  }

  /**
   * Sincroniza la tabla sombra desde una respuesta de lista de Next.
   */
  private async syncShadowFromList(responseData: unknown): Promise<void> {
    const data = (responseData as { data?: unknown })?.data;
    if (!Array.isArray(data)) return;

    for (const c of data) {
      if (c && typeof c === 'object') {
        const o = c as Record<string, unknown>;
        if (o['id'] != null) {
          const id = Number(o['id']);
          const idPadreRaw = o['idPadre'];
          const idPadre =
            idPadreRaw != null && idPadreRaw !== '' ? Number(idPadreRaw) : null;
          await this.ensureShadow(
            id,
            idPadre != null && Number.isFinite(idPadre) ? idPadre : null,
          );
        }
      }
    }
  }
}
