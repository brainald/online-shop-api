import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwtAuth.guard';
import { PaymentsService } from './payments.service';
import { GetUser } from 'src/common/decorators/getUser.decorator';
import { CreatePaymentIntentApiResponseDto } from './dto/createPaymentIntentApiResponse.dto';
import { CreatePaymentIntentDto } from './dto/createPaymentIntent.dto';
import { PaymentApiResponseDto } from './dto/paymentApiResponse.dto';
import { ConfirmPaymentDto } from './dto/confirmPayment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({
    summary: 'Create payment intent',
    description: 'Create a payment intent for an order',
  })
  @ApiCreatedResponse({
    description: 'Payment intent created successfully',
    type: CreatePaymentIntentApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'invalid data or order not found',
  })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @GetUser('id') userId: string,
  ): Promise<CreatePaymentIntentApiResponseDto> {
    return await this.paymentsService.createPaymentIntent(
      userId,
      createPaymentIntentDto,
    );
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Confirm payment',
    description: 'Confirm a payment intent for an order',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment confirmed successfully',
    type: PaymentApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payment not found or already completed',
  })
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
    @GetUser('id') userId: string,
  ): Promise<PaymentApiResponseDto> {
    return await this.paymentsService.confirmPayment(userId, confirmPaymentDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all payments',
    description: 'Get all payments for the current user',
  })
  @ApiOkResponse({
    description: 'Payments retrieved successfully',
    type: PaymentApiResponseDto,
  })
  async findAll(@GetUser('id') userId: string) {
    return await this.paymentsService.findAll(userId);
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: '154sd4848ds5d-4654-4sdd8s7d-sd4656',
  })
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Get a specific payment by its ID',
  })
  @ApiOkResponse({
    description: 'Payment retrieved successfully',
    type: PaymentApiResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  async findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return await this.paymentsService.findOne(id, userId);
  }

  @Get('order/:orderId')
  @ApiParam({
    name: 'orderId',
    description: 'Order ID',
    example: 'order-123',
  })
  @ApiOperation({
    summary: 'Get payment by order ID',
    description: 'Get payment information for a specific order',
  })
  @ApiOkResponse({
    description: 'Payment retrieved successfully',
    type: PaymentApiResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  async findByOrder(
    @Param('orderId') orderId: string,
    @GetUser('id') userId: string,
  ) {
    return await this.paymentsService.findByOrder(orderId, userId);
  }
}
