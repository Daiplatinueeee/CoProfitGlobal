import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import {
  MembershipTier,
  SystemRole,
  UserDocument,
} from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import {
  ProductPin,
  ProductPinDocument,
  PinStatus,
} from '../product-pins/schema/product-pins.schema';

import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateTierDto } from './dto/admin-update-tier.dto';
import { AdminGeneratePinsDto } from './dto/admin-generate-pins.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(ProductPin.name)
    private readonly pinModel: Model<ProductPinDocument>,
    private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
  ) {}

  private isValidObjectId(id: string) {
    return Types.ObjectId.isValid(id);
  }

  async createUser(dto: AdminCreateUserDto) {
  const passwordHash = await bcrypt.hash(dto.password, 10);

  const created = await this.usersService.createUser({
    name: dto.name,
    username: dto.username,
    email: dto.email,
    passwordHash,
    role: dto.role ?? SystemRole.USER,
    membershipTier: dto.membershipTier ?? MembershipTier.BRONZE,
    sponsorReferralCode: dto.sponsorReferralCode,

    packagePin: dto.packagePin,
    age: dto.age,
    contact: dto.contact,
    address: dto.address,
    beneficiary: dto.beneficiary,
    birthday: dto.birthday,
  });

  return {
    id: (created as any)._id.toString(),
    name: created.name,
    username: created.username,
    email: created.email,
    role: created.role,
    membershipTier: created.membershipTier,
    referralCode: created.referralCode,
    sponsorId: created.sponsorId ? created.sponsorId.toString() : null,

    packagePin: created.packagePin,
    age: created.age,
    contact: created.contact,
    address: created.address,
    beneficiary: created.beneficiary,
    birthday: created.birthday,

    createdAt: (created as any).createdAt,
  };
}
  
  async findAllUsers() {
    const users = await this.userModel
      .find()
      .select(
        '_id name username email role membershipTier referralCode sponsorId packagePin createdAt updatedAt',
      )
      .sort({ createdAt: -1 })
      .lean();

    return users.map((user: any) => ({
      id: user._id.toString(),
      name: user.name ?? '',
      username: user.username ?? '',
      email: user.email,
      role: user.role,
      membershipTier: user.membershipTier,
      referralCode: user.referralCode ?? null,
      sponsorId: user.sponsorId ? user.sponsorId.toString() : null,
      packagePin: user.packagePin ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  async updateMembershipTier(userId: string, dto: AdminUpdateTierDto) {
    return this.usersService.updateMembershipTier(userId, dto.membershipTier);
  }

  private generate4DigitPinRaw(): string {
    const n = Math.floor(Math.random() * 10000);
    return n.toString().padStart(4, '0');
  }

  async generatePins(adminId: string, dto: AdminGeneratePinsDto) {
    if (!this.isValidObjectId(adminId)) {
      throw new BadRequestException('Invalid adminId');
    }

    const pinsRaw: string[] = [];

    for (let i = 0; i < dto.quantity; i++) {
      let attempts = 0;

      while (attempts < 10) {
        attempts++;

        const raw = this.generate4DigitPinRaw();
        const pinHash = await bcrypt.hash(raw, 10);

        try {
          await this.pinModel.create({
            pinHash,
            tier: dto.tier,
            status: PinStatus.UNUSED,
            createdByAdminId: new Types.ObjectId(adminId),
          });

          pinsRaw.push(raw);
          break;
        } catch (e: any) {
          if (e?.code === 11000) continue;
          throw e;
        }
      }
    }

    return {
      tier: dto.tier,
      quantity: dto.quantity,
      pins: pinsRaw,
    };
  }

  async listPins(tier?: MembershipTier, status?: PinStatus, limit = 50) {
    const q: any = {};
    if (tier) q.tier = tier;
    if (status) q.status = status;

    const rows = await this.pinModel
      .find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .select('tier status usedByUserId usedAt createdByAdminId createdAt')
      .lean();

    return rows.map((r) => ({
      id: r._id.toString(),
      tier: r.tier,
      status: r.status,
      usedByUserId: r.usedByUserId ? r.usedByUserId.toString() : null,
      usedAt: r.usedAt ?? null,
      createdByAdminId: r.createdByAdminId
        ? r.createdByAdminId.toString()
        : null,
      createdAt: (r as any).createdAt,
    }));
  }

  async voidPin(pinId: string) {
    if (!this.isValidObjectId(pinId)) {
      throw new BadRequestException('Invalid pinId');
    }

    const pin = await this.pinModel.findById(pinId);
    if (!pin) {
      throw new NotFoundException('Pin not found');
    }

    if (pin.status === PinStatus.USED) {
      throw new BadRequestException('Cannot void a USED pin');
    }

    pin.status = PinStatus.VOID;
    await pin.save();

    return {
      id: pin._id.toString(),
      status: pin.status,
    };
  }
}