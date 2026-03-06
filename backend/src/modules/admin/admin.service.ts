import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument, MembershipTier } from '../users/schemas/user.schema';
import { ProductPin, ProductPinDocument, PinStatus } from '../product-pins/schema/product-pins.schema';

import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateTierDto } from './dto/admin-update-tier.dto';
import { AdminGeneratePinsDto } from './dto/admin-generate-pins.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ProductPin.name) private readonly pinModel: Model<ProductPinDocument>,
  ) {}

  private isValidObjectId(id: string) {
    return Types.ObjectId.isValid(id);
  }

  // -------------------------
  // USERS
  // -------------------------
  async createUser(dto: AdminCreateUserDto) {
    const email = dto.email.toLowerCase().trim();

    const exists = await this.userModel.findOne({ email }).lean();
    if (exists) throw new BadRequestException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.userModel.create({
      email,
      passwordHash,
      role: dto.role ?? 'user',
      membershipTier: dto.membershipTier ?? MembershipTier.BRONZE,
    });

    return {
      id: created._id.toString(),
      email: created.email,
      role: created.role,
      membershipTier: created.membershipTier,
      createdAt: (created as any).createdAt,
    };
  }

  async updateMembershipTier(userId: string, dto: AdminUpdateTierDto) {
    if (!this.isValidObjectId(userId)) throw new BadRequestException('Invalid userId');

    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { membershipTier: dto.membershipTier } },
      { new: true, projection: { email: 1, role: 1, membershipTier: 1 } },
    );

    if (!updated) throw new NotFoundException('User not found');

    return {
      id: updated._id.toString(),
      email: updated.email,
      role: updated.role,
      membershipTier: updated.membershipTier,
    };
  }

  // -------------------------
  // PRODUCT PINS (inventory)
  // -------------------------
  private generate4DigitPinRaw(): string {
    const n = Math.floor(Math.random() * 10000);
    return n.toString().padStart(4, '0');
  }

  // Generates N pins and stores ONLY hashes.
  // Returns raw pins once to admin (so they can distribute).
  async generatePins(adminId: string, dto: AdminGeneratePinsDto) {
    if (!this.isValidObjectId(adminId)) throw new BadRequestException('Invalid adminId');

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

    return { tier: dto.tier, quantity: dto.quantity, pins: pinsRaw };
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
      createdByAdminId: r.createdByAdminId ? r.createdByAdminId.toString() : null,
      createdAt: (r as any).createdAt,
    }));
  }

  async voidPin(pinId: string) {
    if (!this.isValidObjectId(pinId)) throw new BadRequestException('Invalid pinId');

    const pin = await this.pinModel.findById(pinId);
    if (!pin) throw new NotFoundException('Pin not found');

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