import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginMeRolDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'Operador' })
  nombre: string;

  @ApiProperty({ example: 'Usuario operativo', nullable: true })
  descripcion: string | null;

  @ApiProperty({ example: '2026-01-10T12:00:00.000Z' })
  fechaCreacion: string;

  @ApiProperty({ example: '2026-01-10T12:00:00.000Z' })
  fechaActualizacion: string;

  @ApiProperty({ example: 1 })
  estatus: number;
}

export class LoginMePermisoDto {
  @ApiPropertyOptional({ example: 12 })
  id?: number;

  @ApiProperty({ example: 3 })
  idPermiso: number;
}

/** Respuesta de Next `GET /api/login/me` reexpuesta por ShiftControl `GET /api/login/me`. */
export class LoginMeResponseDto {
  @ApiProperty({ example: 'login exitoso' })
  message: string;

  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'Juan' })
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  apellidoPaterno: string;

  @ApiProperty({ example: 'López' })
  apellidoMaterno: string;

  @ApiProperty({ example: 11 })
  idCliente: number;

  @ApiProperty({
    example: 'https://bucket.s3.amazonaws.com/logos/cliente11.png',
    description: 'URL del logotipo del cliente',
  })
  logotipo: string;

  @ApiProperty({
    example: '2026-06-16T18:30:00.000Z',
    description: 'Último acceso (ISO) o cadena vacía',
  })
  ultimoLogin: string;

  @ApiProperty({
    example: 'https://bucket.s3.amazonaws.com/perfiles/uuid.jpg',
    description: 'URL S3 de foto de perfil o cadena vacía',
  })
  fotoPerfil: string;

  @ApiProperty({
    example: '5512345678',
    description: 'Teléfono del usuario (Usuarios.Telefono en Next) o cadena vacía si es null',
  })
  telefono: string;

  @ApiProperty({ example: 'operador@empresa.com' })
  userName: string;

  @ApiProperty({ type: LoginMeRolDto })
  rol: LoginMeRolDto;

  @ApiProperty({ type: [LoginMePermisoDto] })
  permisos: LoginMePermisoDto[];
}
