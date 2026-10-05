import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiFoundResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwtAuth.guard';
import { CartService } from './cart.service';
import { GetUser } from 'src/common/decorators/getUser.decorator';
import { CartResponseDto } from './dto/cartResponse.dto';
import { AddToCartDto } from './dto/addToCart.dto';
import { UpdateCartItemDto } from './dto/updateCartItem.dto';
import { MergeCartDto } from './dto/mergeCart.dto';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiFoundResponse({
    description: 'User cart with items',
    type: CartResponseDto,
  })
  async getCart(@GetUser('id') userId: string): Promise<CartResponseDto> {
    return await this.cartService.getOrCreateCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({ type: AddToCartDto })
  @ApiCreatedResponse({
    description: 'Item added to cart',
    type: CartResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({
    description: 'Product unavailable or insufficient stock',
  })
  async addToCart(
    @GetUser('id') userId: string,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    return await this.cartService.addToCart(userId, addToCartDto);
  }

  @Patch('items/:cartItemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiFoundResponse({
    description: 'Cart item updated',
    type: CartResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  @ApiBadRequestResponse({ description: 'Insufficient stock' })
  async updateCartItem(
    @GetUser('id') userId: string,
    @Param('cartItemId') cartItemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return await this.cartService.updateCartItem(
      userId,
      cartItemId,
      updateCartItemDto,
    );
  }

  @Delete('items/:cartItemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiFoundResponse({
    description: 'Item removed from cart',
    type: CartResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  async removeFromCart(
    @GetUser('id') userId: string,
    @Param('cartItemId') cartItemId: string,
  ): Promise<CartResponseDto> {
    return await this.cartService.removeFromCart(userId, cartItemId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiFoundResponse({
    description: 'Cart cleared',
    type: CartResponseDto,
  })
  async clearCart(@GetUser('id') userId: string): Promise<CartResponseDto> {
    return await this.cartService.clearCart(userId);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart into user cart' })
  @ApiBody({ type: MergeCartDto })
  @ApiFoundResponse({
    description: 'Merged cart',
    type: CartResponseDto,
  })
  async mergeCart(
    @GetUser('id') userId: string,
    @Body() mergeCartDto: MergeCartDto,
  ): Promise<CartResponseDto> {
    return await this.cartService.mergeCart(userId, mergeCartDto);
  }
}
