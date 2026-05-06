import type { BehaviorIqCreatePlacaBody } from 'src/integration/behavioriq/behavioriq-plate.interface';
import type { CreatePlacaDto } from './dto/create-placa.dto';

/** Valores fijos enviados a BehaviorIQ (no expuestos en el body público del BFF). */
const DEFAULT_BEHAVIORIQ_ID_CLIENTE = 2;
const DEFAULT_BEHAVIORIQ_ID_SOLUCION = 2;

/** Arma el JSON para `POST /placas` en BehaviorIQ. */
export function toBehaviorIqCreatePlacaBody(dto: CreatePlacaDto): BehaviorIqCreatePlacaBody {
  return {
    numeroPlaca: dto.numeroPlaca,
    marca: dto.marca,
    modelo: dto.modelo,
    anio: dto.anio,
    color: dto.color,
    economico: dto.economico,
    idCliente: DEFAULT_BEHAVIORIQ_ID_CLIENTE,
    idSolucion: DEFAULT_BEHAVIORIQ_ID_SOLUCION,
  };
}
