import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user.sub;
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      id: (user as any)._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      contact: user.contact ?? '',
      address: user.address ?? '',
      beneficiary: user.beneficiary ?? '',
      birthday: user.birthday ?? '',
      age: user.age ?? null,
      profileImage: user.profileImage ?? '',
      packagePin: user.packagePin,
      membershipTier: user.membershipTier,
      referralCode: user.referralCode,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Req() req: any, @Body() body: any) {
    const userId = req.user.sub;
    await this.usersService.updateProfile(userId, {
      name: body.name,
      username: body.username,
      email: body.email,
      contact: body.contact,
      address: body.address,
      beneficiary: body.beneficiary,
      birthday: body.birthday,
      age: body.age,
      profileImage: body.profileImage,
    });
    return { message: 'Profile updated' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  async changePassword(@Req() req: any, @Body() body: any) {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('currentPassword and newPassword are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    await this.usersService.changePassword(req.user.sub, currentPassword, newPassword);
    return { message: 'Password changed' };
  }
}
