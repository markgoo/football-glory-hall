import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('llm_settings')
export class LLMSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @Column({ type: 'boolean', default: false })
  isGlobal: boolean = false;

  @Column({ type: 'boolean', default: false })
  isGlobalEnabled: boolean = false;

  @Column({ type: 'text' })
  apiBaseUrl!: string;

  @Column({ type: 'text', nullable: true })
  apiKey?: string;

  @Column({ type: 'text', default: 'gpt-4o-mini' })
  model!: string;

  @Column({ type: 'boolean', default: false })
  voiceEnabled: boolean = false;

  @Column({ type: 'boolean', default: false })
  thinkingEnabled: boolean = false;

  @Column({ type: 'text', nullable: true })
  reasoningEffort?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
