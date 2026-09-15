import { Module } from '@nestjs/common';
import { UsersController } from '@/users/users.controller.js';
import { UsersService } from '@/users/users.service.js';

@Module({
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
