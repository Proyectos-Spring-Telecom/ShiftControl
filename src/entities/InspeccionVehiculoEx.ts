import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { Turnos } from './Turnos';
import { BitacoraVehiculo } from './BitacoraVehiculo';
import { Vehiculos } from './Vehiculos';
import { CatVistaVehiculo } from './CatVistaVehiculo';
import { CatTipoDano } from './CatTipoDano';
import { CatGradoSeveridad } from './CatGradoSeveridad';

@applySchema
@Index('IX_InspeccionVehiculoEx_IdBitacoraVehiculo', ['idBitacoraVehiculo'])
@Index('IX_InspeccionVehiculoEx_IdVehiculo', ['idVehiculo'])
@Index('IX_InspeccionVehiculoEx_IdCatVistaVehiculo', ['idCatVistaVehiculo'])
@Index('IX_InspeccionVehiculoEx_IdCatTipoDano', ['idCatTipoDano'])
@Index('IX_InspeccionVehiculoEx_IdCatGradoSeveridad', ['idCatGradoSeveridad'])
@Index('FK_InspeccionVehiculoEx_Turnos_idx', ['idTurno'])
@Entity('InspeccionVehiculoEx')
export class InspeccionVehiculoEx {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdTurno' })
  idTurno: number;

  @Column('bigint', { name: 'IdBitacoraVehiculo' })
  idBitacoraVehiculo: number;

  @Column('bigint', { name: 'IdVehiculo' })
  idVehiculo: number;

  @Column('bigint', { name: 'IdCatVistaVehiculo' })
  idCatVistaVehiculo: number;

  @Column('varchar', { name: 'PartesVehiculoEx', length: 100 })
  partesVehiculoEx: string;

  @Column('bigint', { name: 'IdCatTipoDano' })
  idCatTipoDano: number;

  @Column('bigint', { name: 'IdCatGradoSeveridad' })
  idCatGradoSeveridad: number;

  @Column('varchar', {
    name: 'EvidenciaFotografica',
    length: 500,
  })
  evidenciaFotografica: string;

  @Column('datetime', {
    name: 'FechaCreacion',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column('datetime', {
    name: 'FechaActualizacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;

  @ManyToOne(() => Turnos, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdTurno', referencedColumnName: 'id' }])
  turno: Turnos;

  @ManyToOne(() => BitacoraVehiculo, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdBitacoraVehiculo', referencedColumnName: 'id' }])
  bitacoraVehiculo: BitacoraVehiculo;

  @ManyToOne(() => Vehiculos, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdVehiculo', referencedColumnName: 'id' }])
  vehiculo: Vehiculos;

  @ManyToOne(() => CatVistaVehiculo, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdCatVistaVehiculo', referencedColumnName: 'id' }])
  catVistaVehiculo: CatVistaVehiculo;

  @ManyToOne(() => CatTipoDano, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdCatTipoDano', referencedColumnName: 'id' }])
  catTipoDano: CatTipoDano;

  @ManyToOne(() => CatGradoSeveridad, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdCatGradoSeveridad', referencedColumnName: 'id' }])
  catGradoSeveridad: CatGradoSeveridad;
}
