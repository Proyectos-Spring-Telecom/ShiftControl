import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { Vehiculos } from './Vehiculos';
import { Clientes } from './Clientes';
import { Turnos } from './Turnos';
import { Tablero } from './Tablero';
import { TestigosVehiculo } from './TestigosVehiculo';
import { NivelesFluidos } from './NivelesFluidos';
import { LucesVehiculo } from './LucesVehiculo';
import { AccesoriosVehiculo } from './AccesoriosVehiculo';
import { DocumentacionVehiculo } from './DocumentacionVehiculo';

@applySchema
@Entity('BitacoraVehiculo')
export class BitacoraVehiculo {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdVehiculo' })
  idVehiculo: number;

  @Column('bigint', { name: 'IdCliente' })
  idCliente: number;

  @Column('tinyint', { name: 'Tipo', nullable: true })
  tipo: number | null;

  @Column('bigint', { name: 'IdTablero', nullable: true })
  idTablero: number | null;

  @Column('bigint', { name: 'IdTestigosVehiculo', nullable: true })
  idTestigosVehiculo: number | null;

  @Column('bigint', { name: 'IdNivelesFluidos', nullable: true })
  idNivelesFluidos: number | null;

  @Column('bigint', { name: 'IdLucesVehiculo', nullable: true })
  idLucesVehiculo: number | null;

  @Column('bigint', { name: 'IdAccesoriosVehiculo', nullable: true })
  idAccesoriosVehiculo: number | null;

  @Column('bigint', { name: 'IdDocumentacionVehiculo', nullable: true })
  idDocumentacionVehiculo: number | null;

  @Column('datetime', {
    name: 'FechaCreacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column('tinyint', { name: 'Estatus', default: 1 })
  estatus: number;

  @Column('bigint', { name: 'IdTurno' })
  idTurno: number;

  @ManyToOne(() => Vehiculos, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdVehiculo', referencedColumnName: 'id' }])
  vehiculo: Vehiculos;

  @ManyToOne(() => Clientes, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdCliente', referencedColumnName: 'id' }])
  cliente: Clientes;

  @ManyToOne(() => Turnos, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdTurno', referencedColumnName: 'id' }])
  turno: Turnos;

  @ManyToOne(() => Tablero, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdTablero', referencedColumnName: 'id' }])
  tablero: Tablero | null;

  @ManyToOne(() => TestigosVehiculo, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdTestigosVehiculo', referencedColumnName: 'id' }])
  testigosVehiculo: TestigosVehiculo | null;

  @ManyToOne(() => NivelesFluidos, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdNivelesFluidos', referencedColumnName: 'id' }])
  nivelesFluidos: NivelesFluidos | null;

  @ManyToOne(() => LucesVehiculo, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdLucesVehiculo', referencedColumnName: 'id' }])
  lucesVehiculo: LucesVehiculo | null;

  @ManyToOne(() => AccesoriosVehiculo, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdAccesoriosVehiculo', referencedColumnName: 'id' }])
  accesoriosVehiculo: AccesoriosVehiculo | null;

  @ManyToOne(() => DocumentacionVehiculo, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdDocumentacionVehiculo', referencedColumnName: 'id' }])
  documentacionVehiculo: DocumentacionVehiculo | null;
}
