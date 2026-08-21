import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { buildPublicFileUrl } from './storage-public-url';

export interface StoredTurnoFile {
  /** URL pública que se guarda en BD: `{PUBLIC_URL}/{idTurno}/{uuid}.ext` */
  publicUrl: string;
  /** Ruta absoluta en disco (para cleanup). */
  absolutePath: string;
  /** Clave relativa: `{idTurno}/{uuid}.ext` */
  relativeKey: string;
}

const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpeg',
  'application/pdf': 'pdf',
};

@Injectable()
export class TurnosStorageService implements OnModuleInit {
  private readonly logger = new Logger(TurnosStorageService.name);
  private storagePath = '';
  private publicUrl = '';
  private maxSize = 10 * 1024 * 1024;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.storagePath = this.resolveRequiredPath('TURNOS_STORAGE_PATH');
    this.publicUrl = this.resolveRequiredUrl('TURNOS_PUBLIC_URL');
    const max = Number(this.config.get<string>('UPLOAD_MAX_SIZE'));
    if (Number.isFinite(max) && max > 0) {
      this.maxSize = max;
    }
  }

  /**
   * Escribe el archivo en `{STORAGE_PATH}/{idTurno}/{uuid}.ext`
   * y retorna la URL pública `{PUBLIC_URL}/{idTurno}/{uuid}.ext`.
   */
  async save(
    file: Express.Multer.File,
    idTurno: number,
  ): Promise<StoredTurnoFile> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debe adjuntar el archivo requerido');
    }
    if (!Number.isFinite(idTurno) || idTurno <= 0) {
      throw new BadRequestException('No se pudo asociar el archivo al turno');
    }

    const extension = ALLOWED_MIME[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Solo se permiten archivos PNG, JPG, JPEG o PDF');
    }
    if (file.size >= this.maxSize) {
      throw new BadRequestException(
        'El archivo supera el tamaño máximo permitido',
      );
    }

    const fileName = `${randomUUID()}.${extension}`;
    const relativeKey = `${idTurno}/${fileName}`;
    const absolutePath = this.resolveSafeAbsolutePath(relativeKey);
    const dir = path.dirname(absolutePath);

    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(absolutePath, file.buffer);
    } catch (err) {
      this.logger.error(`Error escribiendo archivo local: ${absolutePath}`, err);
      throw new InternalServerErrorException(
        'No se pudo guardar el archivo. Intente nuevamente',
      );
    }

    const publicUrl = buildPublicFileUrl(this.publicUrl, idTurno, fileName);
    return { publicUrl, absolutePath, relativeKey };
  }

  /** Elimina archivos recién escritos (p. ej. si falla un lote o la BD). */
  async cleanup(absolutePaths: string[]): Promise<void> {
    for (const p of absolutePaths) {
      if (!p) continue;
      try {
        this.assertInsideStorageRoot(p);
        await fs.unlink(p);
      } catch (err) {
        this.logger.warn(`No se pudo eliminar archivo en cleanup: ${p}`, err);
      }
    }
  }

  /**
   * Si la URL pública corresponde a un archivo de este storage,
   * retorna la ruta absoluta en disco; si no, null.
   */
  resolveLocalPathFromPublicUrl(publicFileUrl: string): string | null {
    const base = this.publicUrl.replace(/\/+$/, '');
    const url = String(publicFileUrl ?? '').trim();
    if (!url || !url.startsWith(base + '/')) {
      return null;
    }
    const relative = url.slice(base.length + 1).replace(/^\/+/, '');
    if (!relative || relative.includes('..')) {
      return null;
    }
    try {
      return this.resolveSafeAbsolutePath(relative);
    } catch {
      return null;
    }
  }

  getPublicBaseUrl(): string {
    return this.publicUrl;
  }

  getStorageBasePath(): string {
    return this.storagePath;
  }

  private resolveRequiredPath(key: string): string {
    const raw = this.config.get<string>(key)?.trim();
    if (!raw) {
      throw new InternalServerErrorException(
        `Variable de entorno ${key} no configurada`,
      );
    }
    return path.resolve(raw);
  }

  private resolveRequiredUrl(key: string): string {
    const raw = this.config.get<string>(key)?.trim();
    if (!raw) {
      throw new InternalServerErrorException(
        `Variable de entorno ${key} no configurada`,
      );
    }
    return raw.replace(/\/+$/, '');
  }

  private resolveSafeAbsolutePath(relativeKey: string): string {
    const normalized = relativeKey.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('..')) {
      throw new BadRequestException('Ruta de archivo inválida');
    }
    const absolute = path.resolve(this.storagePath, ...normalized.split('/'));
    this.assertInsideStorageRoot(absolute);
    return absolute;
  }

  private assertInsideStorageRoot(absolutePath: string): void {
    const root = path.resolve(this.storagePath);
    const target = path.resolve(absolutePath);
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException(
        'Ruta fuera del directorio de almacenamiento permitido',
      );
    }
  }
}
