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

@applySchema
@Entity('IncidenciaGasolina')
export class IncidenciaGasolina {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdTurno' })
  idTurno: number;

  @Column('bigint', { name: 'IdCliente' })
  idCliente: number;

  @Column('bigint', { name: 'IdVehiculo' })
  idVehiculo: number;

  @Column('varchar', {
    name: 'FotoTableroAntes',
    nullable: true,
    length: 500,
  })
  fotoTableroAntes: string | null;

  @Column('varchar', {
    name: 'FotoTableroDespues',
    nullable: true,
    length: 500,
  })
  fotoTableroDespues: string | null;

  @Column('varchar', {
    name: 'FotoBomba',
    nullable: true,
    length: 500,
  })
  fotoBomba: string | null;

  @Column('float', { name: 'Kilometraje' })
  kilometraje: number;

  @Column('float', { name: 'LitrosCargados' })
  litrosCargados: number;

  @Column('decimal', {
    name: 'TotalPagado',
    precision: 10,
    scale: 2,
  })
  totalPagado: number;

  @Column('text', { name: 'Observaciones', nullable: true })
  observaciones: string | null;

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
}
