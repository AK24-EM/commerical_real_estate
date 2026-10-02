import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('floor_plans')
export class FloorPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @ManyToOne(() => Property)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Column({ name: 'image_url' })
  imageUrl!: string;

  @Column({ default: 'raster' })
  type!: string; // 'raster' or 'vector'

  @Column('jsonb', { nullable: true })
  measurements!: FloorPlanMeasurement[];

  @Column('jsonb', { nullable: true })
  rooms!: FloorPlanRoom[];

  @Column('decimal', { precision: 10, scale: 4 })
  scale!: number; // pixels to feet conversion

  @Column('decimal', { precision: 10, scale: 2, name: 'image_width' })
  imageWidth!: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'image_height' })
  imageHeight!: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'total_area' })
  totalArea!: number; // in sq ft

  @Column({ nullable: true, name: 'floor_label' })
  floorLabel?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export interface FloorPlanMeasurement {
  id: string;
  label: string;
  startPoint: FloorPlanPoint;
  endPoint: FloorPlanPoint;
  lengthFeet: number;
  labelPosition: string;
  type: string;
}

export interface FloorPlanRoom {
  id: string;
  name: string;
  type: string;
  position: FloorPlanPoint;
  widthFeet: number;
  heightFeet: number;
  areaSqFt: number;
  polygonPoints?: FloorPlanPoint[];
  features?: Record<string, any>;
}

export interface FloorPlanPoint {
  x: number;
  y: number;
}
