import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiQuery,
  ApiResponse,
  ApiForbiddenResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwtAuth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { OrdersService } from './orders.service';
import { GetUser } from 'src/common/decorators/getUser.decorator';
import {
  ModerateThrottle,
  RelaxedThrottle,
} from 'src/common/decorators/custom-throttler.decorator';
import { CreateOrderDto } from '../dto/createOrder.dto';
import {
  OrderApiResponseDto,
  OrderResponseDto,
} from '../dto/orderResponse.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { QueryOrderDto } from '../dto/queryOrder.dto';

@ApiTags('orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ModerateThrottle()
  @ApiOperation({
    summary: 'Create a new order',
  })
  @ApiBody({
    type: CreateOrderDto,
  })
  @ApiCreatedResponse({
    description: 'Order created successfully',
    type: OrderApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid data or insufficient stock',
  })
  @ApiNotFoundResponse({
    description: 'Cart not found or empty',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - rate limit exceeded',
  })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @GetUser('id') userId: string,
  ) {
    return await this.ordersService.create(userId, createOrderDto);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @RelaxedThrottle()
  @ApiOperation({
    summary: '[ADMIN] Get all orders (paginated)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiResponse({
    description: 'List of orders',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(OrderResponseDto) },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
  })
  async findAllForAdmin(@Query() query: QueryOrderDto): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.ordersService.findAllForAdmin(query);
  }
}
