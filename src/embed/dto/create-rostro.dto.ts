import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRostroDto {
  @ApiProperty({
    example: 10,
    description: 'Cliente en BehaviorIQ. Debe alinear con el JWT de BehaviorIQ si el usuario no es root.',
  })
  @Type(() => Number)
  @IsInt()
  idCliente: number;

  @ApiProperty({
    example: 3,
    description: 'Solución en BehaviorIQ. Debe alinear con el JWT si el usuario no es root.',
  })
  @Type(() => Number)
  @IsInt()
  idSolucion: number;

  @ApiProperty({ example: 'Juan', description: 'Nombre de pila' })
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido paterno' })
  @IsString()
  @MaxLength(120)
  paterno: string;

  @ApiProperty({ example: 'López', description: 'Apellido materno' })
  @IsString()
  @MaxLength(120)
  materno: string;

  @ApiProperty({
    example: '5512345678',
    description: 'Teléfono único en la solución: exactamente 10 dígitos (solo números).',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  @Matches(/^\d{10}$/, { message: 'telefono debe ser exactamente 10 dígitos' })
  telefono: string;

  @ApiPropertyOptional({
    description:
      'Una sola muestra: arreglo de 512 números (embedding). Se ignora si el body incluye `embeddingsList`.',
    type: [Number],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  embeddings?: number[];

  @ApiPropertyOptional({
    description:
      'Varias muestras: de 1 a 10 arreglos; cada arreglo es un embedding (típicamente 512 floats). Preferido para el flujo frente/izquierda/derecha.',
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
  })
  @IsOptional()
  @IsArray()
  embeddingsList?: number[][];
}
