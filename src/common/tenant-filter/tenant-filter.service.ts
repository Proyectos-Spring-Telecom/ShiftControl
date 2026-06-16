import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clientes } from 'src/entities/Clientes';
import { EnumRolUsuario } from 'src/common/roles.enum';

/** Roles que ven todo sin filtro de cliente (GET turnos y filtro legacy). */
const ROLES_SIN_FILTRO = new Set([1, 2]);

/** Roles GET turnos: ven todos los registros. */
const ROLES_TURNOS_TODOS = new Set([
  EnumRolUsuario.SUPER_ADMIN,
  EnumRolUsuario.DESARROLLADOR,
  EnumRolUsuario.ADMIN_SISTEMA,
  EnumRolUsuario.JEFE_MONITOREO,
  EnumRolUsuario.MONITOREO,
]);

/** Roles que ven su cliente + hijos (spGetClientes). */
const ROLES_CLIENTE_HIJOS = new Set([3, 4]);

export interface TenantFragment {
  /** Fragmento SQL para concatenar al WHERE (incluye AND). Vacío si no hay filtro. */
  sql: string;
  /** Parámetros del fragmento. */
  params: any[];
  /** true si el rol no tiene acceso (ids vacíos). */
  sinAcceso: boolean;
}

@Injectable()
export class TenantFilterService {
  constructor(
    @InjectRepository(Clientes)
    private readonly clienteRepository: Repository<Clientes>,
  ) {}

  /**
   * Genera un fragmento SQL + params para filtrar por tenant según el rol.
   */
  async build(
    rol: number,
    idCliente: number,
    alias: string,
    columna: string = 'IdCliente',
  ): Promise<TenantFragment> {
    const rolNum = Number(rol);

    if (ROLES_SIN_FILTRO.has(rolNum)) {
      return { sql: '', params: [], sinAcceso: false };
    }

    if (ROLES_CLIENTE_HIJOS.has(rolNum)) {
      const ids = await this.getClienteHijosIds(idCliente);
      if (ids.length === 0) {
        return { sql: ' AND 1 = 0 ', params: [], sinAcceso: true };
      }
      const placeholders = ids.map(() => '?').join(', ');
      return {
        sql: ` AND ${alias}.${columna} IN (${placeholders}) `,
        params: [...ids],
        sinAcceso: false,
      };
    }

    return {
      sql: ` AND ${alias}.${columna} = ? `,
      params: [idCliente],
      sinAcceso: false,
    };
  }

  /**
   * Filtro de lectura para GET del módulo Turnos según rol del JWT:
   * - 1–5: todos los turnos
   * - 6 (CLIENTE): turnos de su IdCliente
   * - 7 (OPERADOR): turnos del IdUsuario del token
   */
  buildTurnosAccess(
    rol: number,
    idCliente: number,
    idUsuario: number,
    alias: string = 't',
  ): TenantFragment {
    const rolNum = Number(rol);

    if (ROLES_TURNOS_TODOS.has(rolNum)) {
      return { sql: '', params: [], sinAcceso: false };
    }

    if (rolNum === EnumRolUsuario.CLIENTE) {
      return {
        sql: ` AND ${alias}.IdCliente = ? `,
        params: [idCliente],
        sinAcceso: false,
      };
    }

    if (rolNum === EnumRolUsuario.OPERADOR) {
      return {
        sql: ` AND ${alias}.IdUsuario = ? `,
        params: [idUsuario],
        sinAcceso: false,
      };
    }

    return { sql: ' AND 1 = 0 ', params: [], sinAcceso: true };
  }

  /**
   * Obtiene los IDs del cliente padre + hijos usando spGetClientes.
   */
  async getClienteHijosIds(idCliente: number): Promise<number[]> {
    const result = await this.clienteRepository.query('CALL spGetClientes(?);', [
      idCliente,
    ]);
    const rows = result?.[0] ?? [];
    return rows
      .map((row: { Id?: unknown }) => Number(row.Id))
      .filter((id: number) => Number.isFinite(id) && id > 0);
  }
}
