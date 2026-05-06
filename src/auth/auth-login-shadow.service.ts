import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clientes } from 'src/entities/Clientes';
import { Usuarios } from 'src/entities/Usuarios';
import { JwtAccessPayload } from './types/jwt-access-payload';

/** Claims decodificados del access token en respuestas login-like de Next. */
export interface LoginAccessClaims {
  userId: number | undefined;
  idCliente: number | undefined;
  rol: number | undefined;
  face: number | undefined;
}

/**
 * Después de login proxy contra Next: cliente/usuario sombra y `IdFaceAuth` desde claim `face`.
 */
@Injectable()
export class AuthLoginShadowService {
  private readonly logger = new Logger(AuthLoginShadowService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Usuarios)
    private readonly usuariosRepository: Repository<Usuarios>,
    @InjectRepository(Clientes)
    private readonly clientesRepository: Repository<Clientes>,
  ) {}

  extractClaimsFromLoginResponse(data: unknown): LoginAccessClaims {
    if (!data || typeof data !== 'object' || !('token' in data)) {
      return {
        userId: undefined,
        idCliente: undefined,
        rol: undefined,
        face: undefined,
      };
    }
    const token = (data as { token?: unknown }).token;
    if (typeof token !== 'string' || token.length === 0) {
      return {
        userId: undefined,
        idCliente: undefined,
        rol: undefined,
        face: undefined,
      };
    }
    const decoded = this.jwtService.decode<JwtAccessPayload>(token, {
      json: true,
    });
    if (!decoded || typeof decoded !== 'object') {
      return {
        userId: undefined,
        idCliente: undefined,
        rol: undefined,
        face: undefined,
      };
    }
    const userIdNum = Number(decoded.id);
    const idClienteNum = Number(decoded.idCliente);
    const rolNum = Number(decoded.rol);
    let face: number | undefined;
    if (decoded.face !== undefined && decoded.face !== null && decoded.face !== '') {
      const faceNum = Number(decoded.face);
      if (Number.isFinite(faceNum)) {
        face = faceNum;
      }
    }
    return {
      userId: Number.isFinite(userIdNum) ? userIdNum : undefined,
      idCliente: Number.isFinite(idClienteNum) ? idClienteNum : undefined,
      rol: Number.isFinite(rolNum) ? rolNum : undefined,
      face,
    };
  }

  async syncIdFaceAuthFromAccessClaim(
    userId: number,
    face: number | undefined,
  ): Promise<void> {
    if (face === undefined) {
      return;
    }
    const usuario = await this.usuariosRepository.findOne({
      where: { id: userId },
    });
    if (!usuario) {
      return;
    }
    if (usuario.idFaceAuth === face) {
      return;
    }
    usuario.idFaceAuth = face;
    await this.usuariosRepository.save(usuario);
    this.logger.log(`Usuario sombra IdFaceAuth=${face} (claim face del JWT) id=${userId}`);
  }

  async ensureClienteShadow(idCliente: number): Promise<void> {
    const existing = await this.clientesRepository.findOne({
      where: { id: idCliente },
    });
    if (!existing) {
      await this.clientesRepository.save(
        this.clientesRepository.create({
          id: idCliente,
          idPadre: null,
        }),
      );
      this.logger.log(`Cliente sombra creado id=${idCliente}`);
    }
  }

  async ensureUsuarioShadow(
    idUsuario: number,
    idCliente: number,
    rol?: number,
  ): Promise<void> {
    const existing = await this.usuariosRepository.findOne({
      where: { id: idUsuario },
    });
    if (!existing) {
      await this.usuariosRepository.save(
        this.usuariosRepository.create({
          id: idUsuario,
          idCliente,
          idRol: rol ?? null,
          idSolucion: 2,
          idClienteGeneral: 2,
        }),
      );
      this.logger.log(
        `Usuario sombra creado id=${idUsuario} idCliente=${idCliente} rol=${rol ?? 'n/a'}`,
      );
      return;
    }

    let changed = false;
    if (rol !== undefined && existing.idRol !== rol) {
      existing.idRol = rol;
      changed = true;
    }
    if (existing.idCliente !== idCliente) {
      existing.idCliente = idCliente;
      changed = true;
    }
    if (changed) {
      await this.usuariosRepository.save(existing);
      this.logger.log(
        `Usuario sombra actualizado id=${idUsuario} idCliente=${idCliente} rol=${rol ?? existing.idRol ?? 'n/a'}`,
      );
    }
  }

  /** Tras respuesta 2xx con `token`, actualiza tablas sombra (cliente, usuario, IdFaceAuth). */
  async applyShadowSyncFromLoginResponse(
    data: unknown,
    httpStatus: number,
    options?: { warnWhenMissingClaims?: boolean },
  ): Promise<void> {
    const ok2xx = httpStatus >= 200 && httpStatus < 300;
    if (!ok2xx) {
      return;
    }
    const { userId, idCliente, rol, face } = this.extractClaimsFromLoginResponse(data);
    if (userId === undefined || idCliente === undefined) {
      if (options?.warnWhenMissingClaims) {
        this.logger.warn(
          'Respuesta OK sin id/idCliente decodificables del access token',
        );
      }
      return;
    }
    this.logger.log(
      `shadow sync userId=${userId} idCliente=${idCliente} rol=${rol ?? 'n/a'} face=${face ?? 'n/a'}`,
    );
    await this.ensureClienteShadow(idCliente);
    await this.ensureUsuarioShadow(userId, idCliente, rol);
    await this.syncIdFaceAuthFromAccessClaim(userId, face);
  }
}
