import { BadRequestException } from '@nestjs/common';
import type { CreateRostroDto } from './dto/create-rostro.dto';

/**
 * Convierte el DTO de ShiftControl al JSON que espera BehaviorIQ `POST /rostros`.
 */
export function toBehaviorIqCrearRostroBody(
  dto: CreateRostroDto,
): Record<string, unknown> {
  const hasEmb =
    Array.isArray(dto.embeddings) && dto.embeddings.length > 0;
  const hasList =
    Array.isArray(dto.embeddingsList) && dto.embeddingsList.length > 0;

  if (!hasEmb && !hasList) {
    throw new BadRequestException('Debe enviar embeddings o embeddingsList');
  }
  if (hasList && dto.embeddingsList!.length > 10) {
    throw new BadRequestException('embeddingsList admite como máximo 10 muestras');
  }

  const body: Record<string, unknown> = {
    idCliente: dto.idCliente,
    idSolucion: dto.idSolucion,
    nombre: dto.nombre,
    paterno: dto.paterno,
    materno: dto.materno,
    telefono: dto.telefono,
  };
  if (hasList) {
    body.embeddingsList = dto.embeddingsList;
  } else {
    body.embeddings = dto.embeddings;
  }
  return body;
}
