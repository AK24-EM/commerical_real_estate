import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './property.entity';

@Injectable()
export class PropertyRepository {
  constructor(
    @InjectRepository(Property)
    private readonly repository: Repository<Property>,
  ) {}

  async findAll(): Promise<Property[]> {
    return this.repository.find({
      relations: { broker: true },
    });
  }

  async findOne(id: string): Promise<Property | null> {
    return this.repository.findOne({ 
      where: { id } as any,
      relations: { broker: true },
    });
  }

  async save(property: Property): Promise<Property> {
    return this.repository.save(property);
  }

  async saveMany(properties: Property[]): Promise<Property[]> {
    return this.repository.save(properties);
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  async clear(): Promise<void> {
    await this.repository.clear();
  }

  async find(): Promise<Property[]> {
    return this.repository.find({
      relations: { broker: true },
    });
  }

  async findByBrokerId(brokerId: string): Promise<Property[]> {
    return this.repository.find({
      where: { brokerId } as any,
      relations: { broker: true },
    });
  }

  create(propertyData: Partial<Property>): Property {
    return this.repository.create(propertyData);
  }

  merge(property: Property, propertyData: Partial<Property>): Property {
    return this.repository.merge(property, propertyData);
  }

  async remove(property: Property): Promise<Property> {
    return this.repository.remove(property);
  }
}
