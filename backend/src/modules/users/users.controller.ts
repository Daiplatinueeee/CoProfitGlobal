import { Controller, Get, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user.sub; // from JWT payload
    const user = await this.usersService.findById(userId);

    if (!user) throw new NotFoundException('User not found');

    // return only safe fields
    return {
      id: (user as any)._id.toString(),
      name: user.name,
      email: user.email,
      membershipTier: user.membershipTier,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }
}