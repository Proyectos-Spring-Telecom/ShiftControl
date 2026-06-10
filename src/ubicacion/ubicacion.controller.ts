import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UbicacionService } from './ubicacion.service';
import { ReverseGeocodingQueryDto } from './dto/reverse-geocoding-query.dto';
import { ReverseGeocodingResult } from './interfaces/nominatim-reverse.response';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Ubicacion')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@Controller('ubicacion')
export class UbicacionController {
  constructor(private readonly ubicacionService: UbicacionService) {}

  @Get('reverse')
  @ApiOperation({
    summary: 'Obtener dirección por coordenadas (reverse geocoding)',
    description:
      'Consulta OpenStreetMap Nominatim para convertir latitud y longitud en una dirección legible.',
  })
  @ApiQuery({ name: 'lat', type: Number, example: 19.2826 })
  @ApiQuery({ name: 'lon', type: Number, example: -99.6557 })
  @ApiResponse({
    status: 200,
    description: 'Dirección obtenida correctamente',
    schema: {
      type: 'object',
      properties: {
        displayName: {
          type: 'string',
          example: 'Toluca de Lerdo, Estado de México, México',
        },
        address: {
          type: 'object',
          example: {
            city: 'Toluca',
            state: 'Estado de México',
            country: 'México',
          },
        },
        lat: { type: 'number', example: 19.2826 },
        lon: { type: 'number', example: -99.6557 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Coordenadas inválidas' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  @ApiResponse({ status: 503, description: 'Servicio de geocodificación no disponible' })
  reverseGeocode(
    @Query() query: ReverseGeocodingQueryDto,
  ): Promise<ReverseGeocodingResult> {
    return this.ubicacionService.reverseGeocode(query.lat, query.lon);
  }
}
