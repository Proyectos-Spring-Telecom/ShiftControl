import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { UpdateClienteEstatusDto } from './dto/update-clientes-estatus.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clientes } from 'src/entities/Clientes';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import {
  ApiCrudResponse,
  ApiResponseCommon,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import {
  EnumModulos,
} from 'src/common/estatus.enum';

const SQL_CLIENTES_BASE = `
  Id AS id,
  IdPadre AS idPadre,
  IdCliente AS idClienteNext`;

const SQL_CLIENTES_LIST_LIGHT = `
  Id AS id,
  IdPadre AS idPadre,
  IdCliente AS idClienteNext,
  CAST(NULL AS CHAR(100)) AS nombre,
  CAST(NULL AS CHAR(100)) AS apellidoPaterno,
  CAST(NULL AS CHAR(100)) AS apellidoMaterno,
  CAST(NULL AS CHAR(500)) AS logotipo`;

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Clientes)
    private readonly clienteRepository: Repository<Clientes>,
    private readonly bitacoraLogger: BitacoraLoggerService,
  ) { }

  // ========================================
  // 🔹 CREAR UN CLIENTE
  // ========================================
  async createCliente(
    createClienteDto: CreateClienteDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const clienteData = this.clienteRepository.create({
        idPadre: createClienteDto.idPadre ?? null,
        idCliente: createClienteDto.idCliente ?? null,
      });
      const clienteCreado = await this.clienteRepository.save(clienteData);

      const querylogger = { createClienteDto };
      await this.bitacoraLogger.logToBitacora(
        'Clientes',
        `Cliente sombra creado Id=${clienteCreado.id} IdCliente=${clienteCreado.idCliente ?? 'null'}.`,
        'CREATE',
        querylogger,
        idUser,
        EnumModulos.CLIENTES,
        EstatusEnumBitcora.SUCCESS,
      );

      const result: ApiCrudResponse = {
        status: 'success',
        message: 'El cliente ha sido creado correctamente.',
        data: {
          id: clienteCreado.id,
          idClienteNext: clienteCreado.idCliente,
          idPadre: clienteCreado.idPadre,
        },
      };
      return result;
    } catch (error) {
      const querylogger = { createClienteDto };
      await this.bitacoraLogger.logToBitacora(
        'Clientes',
        `Error al crear cliente sombra.`,
        'CREATE',
        querylogger,
        idUser,
        EnumModulos.CLIENTES,
        EstatusEnumBitcora.ERROR,
        error.message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al intentar crear un cliente.',
        error: error.message,
      });
    }
  }

  //funcion para obtener los clientes padre e hijos
  private async clienteHijos(cliente: number) {
    const clientesFiltrado = await this.clienteRepository.query(
      `CALL spGetClientes(?);`,
      [cliente],
    );

    const idsFiltrados = clientesFiltrado[0]; // El primer índice contiene los resultados
    const ids = idsFiltrados
      .map((clientesFiltrado: any) => Number(clientesFiltrado.Id))
      .filter(Boolean);
    if (ids.length === 0) {
      return { data: [] }; // No hay clientes que consultar
    }

    // 3. Construir el query dinámico con los IDs
    const placeholders = ids.map(() => '?').join(', ');
    return { ids, placeholders };
  }

  private async clienteHijosPag(cliente: number) {
    const result = await this.clienteRepository.query(
      'CALL spGetClientes(?);',
      [cliente],
    );

    let rows = result?.[0] ?? [];

    // Construir ids y quitar el cliente padre
    const ids = rows
      .map((row: any) => Number(row.Id))
      .filter(id => !isNaN(id) && id !== cliente); // 👈 QUITAR EL CLIENTE PADRE

    if (ids.length === 0) {
      return { ids: [], placeholders: '' };
    }

    const placeholders = ids.map(() => '?').join(', ');

    return { ids, placeholders };
  }

  // ========================================
  // 🔹 OBTENER PAGINADO DE CLIENTES
  // ========================================
  async getAllClientes(
    idUser: number,
    cliente: number,
    rol: number,
    page: number,
    limit: number,
  ): Promise<ApiResponseCommon> {
    try {
      const offset = (page - 1) * limit;
      let totalResult;
      let clientes;
      switch (rol) {
        case 1:
          clientes = await this.clienteRepository.query(
            `
SELECT
${SQL_CLIENTES_BASE}
FROM Clientes
ORDER BY Id ASC
  LIMIT ? OFFSET ?;
            `,
            [limit, offset],
          );

          // Query para total (sin paginación)
          totalResult = await this.clienteRepository.query(
            `
  SELECT COUNT(*) AS total
FROM Clientes

  `,
          );
          break;

        default:
          const { ids, placeholders } = await this.clienteHijosPag(cliente);
          clientes = await this.clienteRepository.query(
            `
SELECT
${SQL_CLIENTES_BASE}
FROM Clientes
WHERE Id IN (${placeholders})
ORDER BY Id ASC
  LIMIT ? OFFSET ?;
            `,
            [...ids, limit, offset],
          );

          // Query para total (sin paginación)
          totalResult = await this.clienteRepository.query(
            `
  SELECT COUNT(*) AS total
FROM Clientes
WHERE Id IN (${placeholders})    -- 🔹 aquí colocas el ID del cliente que quieres consultar
ORDER BY Id ASC

  `,
            [...ids],
          );
          break;
      }

      // 🔥 Forzamos ids a number y agregamos nombreCompleto
      const data = clientes.map((item) => ({
        ...item,
        id: Number(item.id),
      }));

      const total = Number(totalResult[0]?.total || 0);

      const result: ApiResponseCommon = {
        data,
        paginated: {
          total: total,
          page,
          lastPage: Math.ceil(total / limit),
        },
      };
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException({
        message: 'Ocurrió un error al obtener paginados de los clientes.',
      });
    }
  }

  // ========================================
  // 🔹 OBTENER UN LISTADO DE CLIENTES
  // ========================================
  async getAllListClientes(
    idUser: number,
    cliente: number,
    rol: number,
  ): Promise<ApiResponseCommon> {
    try {
      let clientes;
      switch (rol) {
        case 1:
          clientes = await this.clienteRepository.query(
            `
SELECT
${SQL_CLIENTES_LIST_LIGHT}
FROM Clientes
ORDER BY Id ASC;
            `,
          );
          break;

        default:
          const { ids, placeholders } = await this.clienteHijos(cliente);
          clientes = await this.clienteRepository.query(
            `
SELECT
${SQL_CLIENTES_LIST_LIGHT}
FROM Clientes
WHERE Id IN (${placeholders})
ORDER BY Id ASC;

            `,
            [...ids],
          );
          break;
      }

      // 🔥 Forzamos ids a number y agregamos nombreCompleto
      const data = clientes.map((item) => ({
        ...item,
        id: Number(item.id),
      }));

      const result: ApiResponseCommon = {
        data: data,
      };
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException({
        message: 'Ocurrió un error al obtener listado de los clientes.',
      });
    }
  }

  // ========================================
  // 🔹 OBTENER UN LISTADO POR ID CLIENTE
  // ========================================
  async getAllListClientesId(
    idUser: number,
    cliente: number,
    rol: number,
  ): Promise<ApiResponseCommon> {
    try {
      let clientes;
      // Usuarios normales - solo sus regiones asignadas
      const { ids, placeholders } = await this.clienteHijos(cliente);
      clientes = await this.clienteRepository.query(
        `
SELECT
${SQL_CLIENTES_LIST_LIGHT}
FROM Clientes
WHERE Id IN (${placeholders})
ORDER BY Id ASC

            `,
        [...ids],
      );

      // 🔥 Forzamos ids a number y agregamos nombreCompleto
      const data = clientes.map((item) => ({
        ...item,
        id: Number(item.id),
      }));

      const result: ApiResponseCommon = {
        data: data,
      };
      return result;
    } catch (error) {
      console.log(error)
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException({
        message: 'Ocurrió un error al obtener listado de los clientes.',
      });
    }
  }

  // ========================================
  // 🔹 OBTENER UN CLIENTE
  // ========================================
  async getOneCliente(id: number) {
    try {
      const cliente = await this.clienteRepository.findOne({
        where: { id: id },
      });
      if (!cliente) {
        throw new NotFoundException(
          `El cliente con ID: ${id} no fue encontrado.`,
        );
      }
      return { data: cliente };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException({
        message: `Error al obtener el cliente con ID: ${id}.`,
      });
    }
  }

  // ========================================
  // 🔹 ACTUALIZAR CLIENTE
  // ========================================
  async updateCliente(
    id: number,
    idUser: number,
    updateClienteDto: UpdateClienteDto,
  ): Promise<ApiCrudResponse> {
    try {
      //Buscamos al cliente y verificamos
      const Cliente = await this.clienteRepository.findOne({
        where: { id: id },
      });
      if (!Cliente) {
        throw new NotFoundException(
          `El cliente con ID: ${id} no fue encontrado.`,
        );
      }

      const patch: Partial<Clientes> = {};
      if (updateClienteDto.idPadre !== undefined) {
        patch.idPadre = updateClienteDto.idPadre;
      }
      if (updateClienteDto.idCliente !== undefined) {
        patch.idCliente = updateClienteDto.idCliente;
      }
      if (Object.keys(patch).length > 0) {
        await this.clienteRepository.update(id, patch);
      }

      const querylogger = { updateClienteDto };
      await this.bitacoraLogger.logToBitacora(
        'Clientes',
        `Cliente con ID: ${id} actualizado correctamente.`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.CLIENTES,
        EstatusEnumBitcora.SUCCESS,
      );

      const clientefind = await this.clienteRepository.findOne({
        where: { id: id },
      });
      const result: ApiCrudResponse = {
        status: 'success',
        message: 'Cliente actualizado correctamente.',
        data: {
          id: id,
          idClienteNext: clientefind?.idCliente,
          idPadre: clientefind?.idPadre,
        },
      };
      return result;
    } catch (error) {
      console.log(error)
      //-----Registro en la bitacora----- ERROR
      const querylogger = { updateClienteDto };
      await this.bitacoraLogger.logToBitacora(
        'Clientes',
        `Cliente con ID: ${id} actualizado correctamente.`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.CLIENTES,
        EstatusEnumBitcora.ERROR,
        error.message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: `Error al actualizar la información del cliente con ID: ${id}`,
        error: error.message,
      });
    }
  }

  // ========================================
  // 🔹 ACTUALIZAR ESTATUS DEL CLIENTE
  // ========================================
  async updateClienteStatus(
    id: number,
    idUser: number,
    cliente: number,
    updateClienteEstatusDto: UpdateClienteEstatusDto,
  ): Promise<ApiCrudResponse> {
    void id;
    void idUser;
    void cliente;
    void updateClienteEstatusDto;
    throw new BadRequestException(
      'La tabla Clientes no incluye Estatus; gestione estado en Next.',
    );
  }

  // ========================================
  // 🔹 ELIMINAR CLIENTES
  // ========================================
  async removeCliente(
    id: number,
    idUser: number,
    cliente: number,
  ): Promise<ApiCrudResponse> {
    void id;
    void idUser;
    void cliente;
    throw new BadRequestException(
      'Eliminación lógica no disponible en esquema sombra Clientes; use Next.',
    );
  }
}
