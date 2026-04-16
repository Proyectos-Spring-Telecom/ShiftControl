import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { Turnos } from './Turnos';
import { Clientes } from './Clientes';
import { Vehiculos } from './Vehiculos';
import { CatTipoDano } from './CatTipoDano';
import { CatGradoSeveridad } from './CatGradoSeveridad';

@applySchema
@Entity('IncidenciaAccidente')
export class IncidenciaAccidente {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdTurno' })
  idTurno: number;

  @Column('bigint', { name: 'IdCliente' })
  idCliente: number;

  @Column('bigint', { name: 'IdVehiculo' })
  idVehiculo: number;

  @Column('bigint', { name: 'IdCatTipoDano' })
  idCatTipoDano: number;

  @Column('bigint', { name: 'IdCatGradoSeveridad', default: 1 })
  idCatGradoSeveridad: number;

  @Column('text', { name: 'Descripcion' })
  descripcion: string;

  @Column('varchar', {
    name: 'FotoEvidencia1',
    nullable: true,
    length: 500,
  })
  fotoEvidencia1: string | null;

  @Column('varchar', {
    name: 'FotoEvidencia2',
    nullable: true,
    length: 500,
  })
  fotoEvidencia2: string | null;

  @Column('varchar', {
    name: 'FotoEvidencia3',
    nullable: true,
    length: 500,
  })
  fotoEvidencia3: string | null;

  @Column('decimal', {
    name: 'Latitud',
    nullable: true,
    precision: 10,
    scale: 7,
  })
  latitud: number | null;

  @Column('decimal', {
    name: 'Longitud',
    nullable: true,
    precision: 10,
    scale: 7,
  })
  longitud: number | null;

  @Column('datetime', {
    name: 'FechaRegistro',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaRegistro: Date;

  @Column('tinyint', { name: 'Estatus', default: 1 })
  estatus: number;

  @Column('datetime', {
    name: 'FechaCreacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column('datetime', {
    name: 'FechaActualizacion',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;

  @ManyToOne(() => Turnos, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdTurno', referencedColumnName: 'id' }])
  turno: Turnos;

  @ManyToOne(() => Clientes, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdCliente', referencedColumnName: 'id' }])
  cliente: Clientes;

  @ManyToOne(() => Vehiculos, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdVehiculo', referencedColumnName: 'id' }])
  vehiculo: Vehiculos;

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
