import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Order,
  OrderItem,
  OrderStatus,
  Prisma,
  Product,
  User,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from '../dto/createOrder.dto';
import {
  OrderApiResponseDto,
  OrderResponseDto,
} from '../dto/orderResponse.dto';
import { QueryOrderDto } from '../dto/queryOrder.dto';
import { UpdateOrderDto } from '../dto/updateOrder.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const { items, shippingAddress } = createOrderDto;
    const quantities = new Map<string, number>();

    for (const item of items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...quantities.keys()] }, isActive: true },
      select: { id: true, name: true, stock: true, price: true },
    });
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );
    const orderItems: {
      productId: string;
      quantity: number;
      price: Prisma.Decimal;
    }[] = [];

    for (const [productId, quantity] of quantities) {
      const product = productsById.get(productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      if (product.stock < quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}. Available: ${product.stock}, requested: ${quantity}`,
        );
      }

      orderItems.push({ productId, quantity, price: product.price });
    }

    const total = orderItems.reduce(
      (sum, item) => sum.add(item.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    const latestCart = await this.prisma.cart.findFirst({
      where: {
        userId,
        checkedOut: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const order = await this.prisma.$transaction(async (tx) => {
      const results = await Promise.all(
        orderItems.map((item) =>
          tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
              isActive: true,
            },
            data: { stock: { decrement: item.quantity } },
          }),
        ),
      );

      const failedItemIndex = results.findIndex((result) => result.count === 0);
      if (failedItemIndex !== -1) {
        const item = orderItems[failedItemIndex];
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { name: true, stock: true },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found`,
          );
        }

        throw new BadRequestException(
          `Insufficient stock for product ${product.name}. Available: ${product.stock}, requested: ${item.quantity}`,
        );
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalAmount: total,
          shippingAddress,
          cartId: latestCart?.id,
          orderItems: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });
      return newOrder;
    });
    return this.wrap(order);
  }

  async findAllForAdmin(query: QueryOrderDto): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (search)
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];

    const getOrders = this.prisma.order.findMany({
      where,
      skip,
      take: limit,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const getTotal = this.prisma.order.count({ where });

    const [orders, total] = await Promise.all([getOrders, getTotal]);

    return {
      data: orders.map((o) => this.map(o)),
      total,
      page,
      limit,
    };
  }

  async findAll(
    userId: string,
    query: QueryOrderDto,
  ): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { limit = 10, page = 1, search, status } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = { userId };

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const getTotal = this.prisma.order.count({ where });

    const getOrders = this.prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });
    const [orders, total] = await Promise.all([getOrders, getTotal]);

    return {
      data: orders.map((o) => this.map(o)),
      limit,
      page,
      total,
    };
  }

  async findOne(
    id: string,
    userId?: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const where: Prisma.OrderWhereInput = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return this.wrap(order);
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userId?: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const where: Prisma.OrderWhereInput = { id };
    if (userId) where.userId = userId;
    const existing = await this.prisma.order.findFirst({
      where,
    });

    if (!existing) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { ...updateOrderDto },
      include: {
        user: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    return this.wrap(updated);
  }

  async cancel(
    id: string,
    userId?: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const where: Prisma.OrderWhereInput = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        order.orderItems.map((item) =>
          tx.product.updateMany({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
      );

      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });
    });

    return this.wrap(cancelled, 'Order cancelled successfully');
  }

  private wrap(
    order: Order & {
      orderItems: (OrderItem & { product: Product })[];
      user: User;
    },
    message = 'Order retrieved successfully',
  ): OrderApiResponseDto<OrderResponseDto> {
    return {
      success: true,
      message,
      data: this.map(order),
    };
  }

  private map(
    order: Order & {
      orderItems: (OrderItem & { product: Product })[];
      user: User;
    },
  ): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: Number(order.totalAmount),
      shippingAddress: order.shippingAddress ?? '',
      items: order.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.price) * item.quantity,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      ...(order.user && {
        userEmail: order.user.email,
        userName:
          `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
      }),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
