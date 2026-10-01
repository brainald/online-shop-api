import { ApiProperty } from '@nestjs/swagger';

class CreatePaymentIntentResponseDto {
  @ApiProperty({
    example: 'pi_165465465',
    description: 'Stripe client secret for payment confirmation',
  })
  clientSecret: string;

  @ApiProperty({
    example: '2165465-454-sds4s854d65',
    description: 'Payment ID in database',
  })
  paymentId: string;
}

export class CreatePaymentIntentApiResponseDto {
  @ApiProperty({
    example: true,
  })
  success: boolean;

  @ApiProperty({
    type: CreatePaymentIntentResponseDto,
  })
  data: CreatePaymentIntentResponseDto;

  @ApiProperty({
    example: 'Payment intent created successfully',
    required: false,
  })
  message?: string;
}
