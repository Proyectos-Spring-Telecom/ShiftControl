import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EnviarReporteTurnoDto {
  @ApiProperty({
    description: 'Correo electrónico del destinatario',
    example: 'usuario@empresa.com',
  })
  @IsEmail()
  @IsNotEmpty()
  destinatario: string;

  @ApiPropertyOptional({
    description: 'Asunto del correo (se genera automáticamente si no se envía)',
  })
  @IsOptional()
  @IsString()
  asunto?: string;
}
