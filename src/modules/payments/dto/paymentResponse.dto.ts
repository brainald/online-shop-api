import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    example: '1215645s454sd2ad2osd4s-454sd',
  })
  id: string;

  @ApiProperty({
    example: 'order-123',
  })
  orderId: string;

  @ApiProperty({
    example: 99.99,
  })
  amount: number;

  @ApiProperty({
    example: 'user-456',
  })
  userId: string | null;

  @ApiProperty({
    example: 'RON',
  })
  currency: string;

  @ApiProperty({
    example: 'COMPLETED',
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  })
  status: string;

  @ApiProperty({
    example: 'STRIPE',
    nullable: true,
  })
  paymentMethod: string | null;

  @ApiProperty({
    example: 'pi_1213546846',
    nullable: true,
  })
  transactionId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
