import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'cf1d8883-2cf0-4f7a-bda8-531d41d2464c',
  })
  id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Headphone',
  })
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'High quality wireless headphones',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Product price',
    example: 99.99,
  })
  price: number;

  @ApiProperty({
    description: 'Product stock',
    example: 100,
  })
  stock: number;

  @ApiProperty({
    description: 'Stock keeping Unit',
    example: 'WH-001',
  })
  sku: string;

  @ApiProperty({
    description: 'Product image url',
    example: 'https://example.com/image.jpg',
  })
  imageUrl: string | null;

  @ApiProperty({
    description: 'Product category',
    example: 'Electronics',
  })
  category: string | null;

  @ApiProperty({
    description: 'Product availability status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'last update timestamp',
  })
  updatedAt: Date;
}
