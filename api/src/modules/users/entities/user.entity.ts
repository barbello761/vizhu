import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PhoneAccount } from './phone-account.entity';
import { EmailAccount } from './email-account.entity';
import { UserRole } from '../user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'phone_account_id', unique: true })
  phoneAccountId!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.BLIND,
  })
  role!: UserRole;

  @OneToOne(() => PhoneAccount)
  @JoinColumn({ name: 'phone_account_id' })
  phoneAccount!: PhoneAccount;

  @Column({
    name: 'email_account_id',
    unique: true,
    nullable: true,
    type: 'uuid',
  })
  emailAccountId!: string | null;

  @OneToOne(() => EmailAccount, { nullable: true })
  @JoinColumn({ name: 'email_account_id' })
  emailAccount!: EmailAccount | null;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
