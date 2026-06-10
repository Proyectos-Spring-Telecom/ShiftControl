import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { CatVistaVehiculo } from './CatVistaVehiculo';

@applySchema
@Index('FK_CatPartesVehiculoEx_CatVistaVehiculo', ['idVistaVehiculo'])
@Entity('CatPartesVehiculoEx')
export class CatPartesVehiculoEx {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'Nombre', length: 50, nullable: false })
  nombre: string;

  @Column('tinyint', { name: 'Estatus', default: 1, nullable: false })
  estatus: number;

  @Column('datetime', {
    name: 'FechaCreacion',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  fechaCreacion: Date;

  @Column('datetime', {
    name: 'FechaActualizacion',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  fechaActualizacion: Date;

  @Column('bigint', { name: 'IdVistaVehiculo', nullable: false })
  idVistaVehiculo: number;

  @ManyToOne(() => CatVistaVehiculo, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'IdVistaVehiculo', referencedColumnName: 'id' }])
  vistaVehiculo: CatVistaVehiculo;
}
