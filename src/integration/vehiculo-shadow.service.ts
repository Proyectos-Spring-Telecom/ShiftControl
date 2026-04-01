import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculos } from 'src/entities/Vehiculos';

/**
 * Mantiene filas sombra en `Vehiculos`: mismo `Id` que Next, copia mínima para JOINs locales.
 * No sustituye al API de Next; no expone CRUD HTTP.
 */
@Injectable()
export class VehiculoShadowService {
  private readonly logger = new Logger(VehiculoShadowService.name);

  constructor(
    @InjectRepository(Vehiculos)
    private readonly vehiculosRepository: Repository<Vehiculos>,
  ) {}

  /**
   * Crea o actualiza el registro sombra. Idempotente.
   * Si el registro existe y cambian `placas` o `idCliente` respecto a Next, se sincronizan aquí
   * (evita listados locales desalineados). Si en el futuro un vehículo no puede cambiar de tenant,
   * validar antes de llamar a este método o añadir comprobación de negocio explícita.
   */
  async ensure(id: number, idCliente: number, placas: string): Promise<void> {
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('Id de vehículo inválido para sombra.');
    }
    if (!Number.isFinite(idCliente) || idCliente <= 0) {
      throw new BadRequestException('IdCliente inválido para sombra de vehículo.');
    }
    const placasNorm = placas?.trim() ?? '';
    if (!placasNorm) {
      throw new BadRequestException(
        'Placas requeridas para registrar el vehículo sombra.',
      );
    }

    const existing = await this.vehiculosRepository.findOne({ where: { id } });

    if (!existing) {
      await this.vehiculosRepository.save(
        this.vehiculosRepository.create({
          id,
          idCliente,
          placas: placasNorm,
        }),
      );
      this.logger.log(
        `Vehículo sombra creado id=${id} idCliente=${idCliente}`,
      );
      return;
    }

    let changed = false;
    if (existing.placas !== placasNorm) {
      existing.placas = placasNorm;
      changed = true;
    }
    if (existing.idCliente !== idCliente) {
      existing.idCliente = idCliente;
      changed = true;
    }
    if (changed) {
      await this.vehiculosRepository.save(existing);
      this.logger.log(
        `Vehículo sombra actualizado id=${id} idCliente=${idCliente}`,
      );
    }
  }
}
