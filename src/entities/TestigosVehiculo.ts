import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { Vehiculos } from './Vehiculos';
import { Turnos } from './Turnos';

@applySchema
@Entity('TestigosVehiculo')
export class TestigosVehiculo {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdTurno' })
  idTurno: number;

  @Column('bigint', { name: 'IdVehiculo' })
  idVehiculo: number;

  @Column('tinyint', { name: 'Estatus', default: 1 })
  estatus: number;

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

  @Column('tinyint', { name: 'ABS', nullable: true })
  abs: number | null;

  @Column('tinyint', { name: 'Potencia', nullable: true })
  potencia: number | null;

  @Column('tinyint', { name: 'CinturonSeguridad', nullable: true })
  cinturonSeguridad: number | null;

  @Column('tinyint', { name: 'Luces', nullable: true })
  luces: number | null;

  @Column('tinyint', { name: 'PresionAceite', nullable: true })
  presionAceite: number | null;

  @Column('tinyint', { name: 'Bateria', nullable: true })
  bateria: number | null;

  @Column('tinyint', { name: 'CheckEngine', nullable: true })
  checkEngine: number | null;

  @Column('tinyint', { name: 'Airbag', nullable: true })
  airbag: number | null;

  @Column('tinyint', { name: 'PresionNeumatico', nullable: true })
  presionNeumatico: number | null;

  @Column('tinyint', { name: 'SistemaFrenos', nullable: true })
  sistemaFrenos: number | null;

  @Column('tinyint', { name: 'TemperaturaMotor', nullable: true })
  temperaturaMotor: number | null;

  @Column('tinyint', { name: 'FallaDireccionAsistida', nullable: true })
  fallaDireccionAsistida: number | null;

  @ManyToOne(() => Turnos, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdTurno', referencedColumnName: 'id' }])
  turno: Turnos;

  @ManyToOne(() => Vehiculos, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdVehiculo', referencedColumnName: 'id' }])
  vehiculo: Vehiculos;
}
