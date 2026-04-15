import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { Vehiculos } from './Vehiculos';
import { Clientes } from './Clientes';
import { Usuarios } from './Usuarios';
import { CatEstatusTurno } from './CatEstatusTurno';
import { BitacoraVehiculo } from './BitacoraVehiculo';

@applySchema
@Index('IX_Turnos_IDEstatusTurno', ['idEstatusTurno'])
@Index('IX_Turnos_IdVehiculo', ['idVehiculo'])
@Index('IX_Turnos_IdCliente', ['idCliente'])
@Index('IX_Turnos_IdUsuario', ['idUsuario'])
@Index('IX_Turnos_IdBitacoraApertura', ['idBitacoraApertura'])
@Index('IX_Turnos_IdBitacoraCierre', ['idBitacoraCierre'])
@Index('IX_Turnos_FechaApertura', ['fechaApertura'])
@Entity('Turnos')
export class Turnos {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdVehiculo', nullable: true })
  idVehiculo: number | null;

  @Column('bigint', { name: 'IdCliente', nullable: true })
  idCliente: number | null;

  @Column('bigint', { name: 'IdUsuario', nullable: true })
  idUsuario: number | null;

  @Column('bigint', { name: 'IdBitacoraApertura', nullable: true })
  idBitacoraApertura: number | null;

  @Column('varchar', { name: 'EvidenciaApertura', length: 500, nullable: true })
  evidenciaApertura: string | null;

  @Column('decimal', {
    name: 'LongitudApertura',
    nullable: true,
    precision: 10,
    scale: 7,
  })
  longitudApertura: number | null;

  @Column('decimal', {
    name: 'LatitudApertura',
    nullable: true,
    precision: 10,
    scale: 7,
  })
  latitudApertura: number | null;

  @Column('datetime', {
    name: 'FechaApertura',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaApertura: Date | null;

  @Column('bigint', { name: 'IdBitacoraCierre', nullable: true })
  idBitacoraCierre: number | null;

  @Column('varchar', { name: 'EvidenciaCierre', length: 500, nullable: true })
  evidenciaCierre: string | null;

  @Column('decimal', {
    name: 'LongitudCierre',
    nullable: true,
    precision: 10,
    scale: 7,
  })
  longitudCierre: number | null;

  @Column('decimal', {
    name: 'LatitudCierre',
    nullable: true,
    precision: 10,
    scale: 7,
  })
  latitudCierre: number | null;

  @Column('datetime', {
    name: 'FechaCierre',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCierre: Date | null;

  @Column('float', { name: 'Duracion', nullable: true })
  duracion: number | null;

  @Column('tinyint', { name: 'Estatus', nullable: true })
  estatus: number | null;

  @Column('bigint', { name: 'IDEstatusTurno', nullable: true })
  idEstatusTurno: number | null;

  @ManyToOne(() => Vehiculos, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdVehiculo', referencedColumnName: 'id' }])
  vehiculo: Vehiculos;

  @ManyToOne(() => Clientes, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdCliente', referencedColumnName: 'id' }])
  cliente: Clientes;

  @ManyToOne(() => Usuarios, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdUsuario', referencedColumnName: 'id' }])
  usuario: Usuarios;

  @ManyToOne(() => CatEstatusTurno, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IDEstatusTurno', referencedColumnName: 'id' }])
  estatusTurno: CatEstatusTurno;

  @ManyToOne(() => BitacoraVehiculo, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdBitacoraApertura', referencedColumnName: 'id' }])
  bitacoraApertura: BitacoraVehiculo;

  @ManyToOne(() => BitacoraVehiculo, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdBitacoraCierre', referencedColumnName: 'id' }])
  bitacoraCierre: BitacoraVehiculo;
}
