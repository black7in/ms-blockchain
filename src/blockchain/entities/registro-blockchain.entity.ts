import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('registros_blockchain')
export class RegistroBlockchain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tipo', type: 'varchar', length: 20, default: 'FACTURA' })
  tipo: string;

  @Column({ name: 'numero_factura', type: 'varchar', length: 20 })
  numeroFactura: string;

  @Column({ name: 'hash_sha256', type: 'varchar', length: 64, unique: true })
  hashSha256: string;

  @Column({
    name: 'hash_nota_credito',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  hashNotaCredito: string | null;

  @Column({ name: 'monto', type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ name: 'tx_hash', type: 'varchar', length: 255, nullable: true })
  txHash: string | null;

  @Column({ name: 'tx_hash_anulacion', type: 'varchar', length: 255, nullable: true })
  txHashAnulacion: string | null;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: number | null;

  @Column({ name: 'network', type: 'varchar', length: 20, default: 'mumbai' })
  network: string;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado: string;

  @Column({ name: 'error_mensaje', type: 'text', nullable: true })
  errorMensaje: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
