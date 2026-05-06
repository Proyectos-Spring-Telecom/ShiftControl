import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('UQ_Vehiculos_Placas', ['placas'], { unique: true })
@Index('IX_Vehiculos_IdCliente', ['idCliente'])
@Entity('Vehiculos')
export class Vehiculos {
  @PrimaryColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdCliente' })
  idCliente: number;

  @Column('varchar', { name: 'Placas', length: 10 })
  placas: string;

  @Column('varchar', { name: 'FotoFrente', length: 500, nullable: true })
  fotoFrente: string | null;

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

  @Column('bigint', { name: 'IdVehiculoAuth', nullable: true })
  idVehiculoAuth: number | null;
}
