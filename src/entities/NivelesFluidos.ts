import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { Vehiculos } from './Vehiculos';
import { Turnos } from './Turnos';

@applySchema
@Entity('NivelesFluidos')
export class NivelesFluidos {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdTurno' })
  idTurno: number;

  @Column('bigint', { name: 'IdVehiculo' })
  idVehiculo: number;

  @Column({ type: 'int', name: 'Gasolina', unsigned: true, nullable: true })
  gasolina: number | null;

  @Column({ type: 'int', name: 'Aceite', unsigned: true, nullable: true })
  aceite: number | null;

  @Column({ type: 'int', name: 'Bateria', unsigned: true, nullable: true })
  bateria: number | null;

  @Column({ type: 'int', name: 'Anticongelante', unsigned: true, nullable: true })
  anticongelante: number | null;

  @Column({ type: 'int', name: 'LiquidoFrenos', unsigned: true, nullable: true })
  liquidoFrenos: number | null;

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

  @ManyToOne(() => Turnos, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdTurno', referencedColumnName: 'id' }])
  turno: Turnos;

  @ManyToOne(() => Vehiculos, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'IdVehiculo', referencedColumnName: 'id' }])
  vehiculo: Vehiculos;
}
