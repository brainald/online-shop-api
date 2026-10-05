import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CartResponseDto } from './dto/cartResponse.dto';
import { Cart, CartItem, Category, Product } from '@prisma/client';
import { AddToCartDto } from './dto/addToCart.dto';
import { UpdateCartItemDto } from './dto/updateCartItem.dto';
import { MergeCartDto } from './dto/mergeCart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(userId: string): Promise<CartResponseDto> {
    const cartExists = await this.prisma.cart.findFirst({
      where: { userId, checkedOut: false },
      include: {
        cartItems: { include: { product: { include: { category: true } } } },
      },
    });

    if (cartExists) return this.formatCart(cartExists);

    const createdCart = await this.prisma.cart.create({
      data: {
        userId,
      },
      include: {
        cartItems: { include: { product: { include: { category: true } } } },
      },
    });

    return this.formatCart(createdCart);
  }

  async addToCart(
    userId: string,
    addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    const { productId, quantity } = addToCartDto;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }
    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available ${product.stock}`,
      );
    }

    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;

      if (newQuantity > product.stock) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}, Current in cart: ${cartItem.quantity}`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: cartItem.id },
        data: {
          quantity: newQuantity,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        product: true,
      },
    });

    if (cartItem?.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    const { quantity } = updateCartItemDto;

    if (cartItem.product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${cartItem.product.stock}`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity,
      },
    });

    return this.getOrCreateCart(userId);
  }

  async removeFromCart(
    userId: string,
    cartItemId: string,
  ): Promise<CartResponseDto> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        product: true,
      },
    });

    if (cartItem?.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, checkedOut: false },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async mergeCart(
    userId: string,
    mergeCartDto: MergeCartDto,
  ): Promise<CartResponseDto> {
    const { items } = mergeCartDto;

    if (!items || items.length === 0) {
      return this.getOrCreateCart(userId);
    }

    const results = await Promise.allSettled(
      items.map((item) =>
        this.addToCart(userId, {
          productId: item.productId,
          quantity: item.quantity,
        }),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return;

      const error = result.reason;
      if (!(error instanceof HttpException))
        console.error('[CartService] Cart item merge error:', error);

      console.warn(
        `[CartService] Cart item ${items[index].productId} failed to merge:`,
        {
          productId: items[index].productId,
          quantity: items[index].quantity,
          statusCode: error.getStatus(),
          message: error.message,
        },
      );
    });

    return this.getOrCreateCart(userId);
  }

  private formatCart(
    cart: Cart & {
      cartItems: (CartItem & { product: Product & { category: Category } })[];
    },
  ): CartResponseDto {
    const formattedCart: CartResponseDto = {
      id: cart.id,
      userId: cart.userId,
      cartItems: cart.cartItems.map((item) => ({
        cartId: item.cartId,
        id: item.id,
        productId: item.productId,
        product: {
          ...item.product,
          price: Number(item.product.price),
          category: item.product.category.name,
        },
        quantity: item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      totalItems: cart.cartItems.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: cart.cartItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.product.price),
        0,
      ),
    };

    return formattedCart;
  }
}
