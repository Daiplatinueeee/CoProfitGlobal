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
  User,
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
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
  ) {}

  private isValidObjectId(id: string) {
    return Types.ObjectId.isValid(id);
  }

  async createUser(dto: AdminCreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // ── Step 1: Validate the PIN exists and is UNUSED ──────────────────────
    const pinDoc = await this.pinModel.findOne({ pin: dto.packagePin });

    if (!pinDoc) {
      throw new BadRequestException('Invalid package PIN — PIN does not exist');
    }
    if (pinDoc.status !== PinStatus.UNUSED) {
      throw new BadRequestException(
        `PIN is already ${pinDoc.status.toLowerCase()} and cannot be used`,
      );
    }

    // ── Step 2: Derive membershipTier from the PIN ─────────────────────────
    const membershipTier = pinDoc.tier;

    // ── Step 3: Create the user ────────────────────────────────────────────
    const created = await this.usersService.createUser({
      name: dto.name,
      username: dto.username,
      email: dto.email,
      passwordHash,
      role: dto.role ?? SystemRole.USER,
      membershipTier,
      sponsorReferralCode: dto.sponsorReferralCode,
      packagePin: dto.packagePin,
      age: dto.age,
      contact: dto.contact,
      address: dto.address,
      beneficiary: dto.beneficiary,
      birthday: dto.birthday,
    });

    console.log('User created successfully:', (created as any)._id.toString());
    console.log('Now marking PIN as USED...');

    // ── Step 4: Mark PIN as USED — rollback user if this fails ─────────────
    try {
      const updateResult = await this.pinModel.updateOne(
        { _id: pinDoc._id },
        {
          $set: {
            status: PinStatus.USED,
            usedByUserId: (created as any)._id,
            usedAt: new Date(),
          },
        },
      );

      if (updateResult.matchedCount === 0) {
        throw new Error('PIN document not found during update');
      }

      console.log('PIN marked as USED successfully:', dto.packagePin);
    } catch (err: any) {
      // Rollback: delete the user we just created so data stays consistent
      console.error('Failed to mark PIN as USED — rolling back user creation:', err.message);
      await this.userModel.deleteOne({ _id: (created as any)._id });
      throw new BadRequestException(
        'Failed to mark PIN as used — user creation has been rolled back. Please try again.',
      );
    }

    return {
      user: {
        id: (created as any)._id.toString(),
        name: created.name,
        username: created.username,
        email: created.email,
        role: created.role,
        membershipTier: created.membershipTier,
        referralCode: created.referralCode,
        packagePin: dto.packagePin,
        createdAt: (created as any).createdAt,
      },
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

  private generatePinRaw(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const l1 = letters[Math.floor(Math.random() * 26)];
    const l2 = letters[Math.floor(Math.random() * 26)];
    const digits = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${l1}${l2}${digits}`;
  }

  async generatePins(adminId: string, dto: AdminGeneratePinsDto) {
    if (!this.isValidObjectId(adminId)) {
      throw new BadRequestException('Invalid adminId');
    }

    const adminObjId = new Types.ObjectId(adminId);
    const pins: string[] = [];

    for (let i = 0; i < dto.quantity; i++) {
      let inserted = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        const pin = this.generatePinRaw();

        try {
          const doc = new this.pinModel({
            pin,
            tier: dto.tier,
            status: PinStatus.UNUSED,
            createdByAdminId: adminObjId,
            usedByUserId: null,
            usedAt: null,
          });

          await doc.save();

          pins.push(pin);
          inserted = true;
          break;
        } catch (e: any) {
          if (e?.code === 11000) {
            // Only retry on duplicate pin — any other 11000 is a schema bug
            if (e?.keyPattern?.pin) {
              console.warn(`PIN "${pin}" already exists, retrying...`);
              continue;
            }
            // Different field caused 11000 — log and throw immediately
            console.error('Unexpected duplicate key on field:', {
              keyPattern: e?.keyPattern,
              keyValue: e?.keyValue,
            });
            throw new BadRequestException(
              `Duplicate key error on field: ${JSON.stringify(e?.keyPattern)}`,
            );
          }

          console.error('PIN save failed:', {
            message: e?.message,
            code: e?.code,
            name: e?.name,
          });

          throw new BadRequestException(e?.message ?? 'Failed to save PIN');
        }
      }

      if (!inserted) {
        throw new BadRequestException(
          'Could not generate a unique PIN after 10 attempts',
        );
      }
    }

    return {
      tier: dto.tier,
      quantity: dto.quantity,
      pins,
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
      .select('pin tier status usedByUserId usedAt createdByAdminId createdAt')
      .lean();

    return rows.map((r: any) => ({
      id: r._id.toString(),
      pin: r.pin ?? null,
      tier: r.tier,
      status: r.status,
      usedByUserId: r.usedByUserId ? r.usedByUserId.toString() : null,
      usedAt: r.usedAt ?? null,
      createdByAdminId: r.createdByAdminId
        ? r.createdByAdminId.toString()
        : null,
      createdAt: r.createdAt,
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

    await this.pinModel.updateOne(
      { _id: pin._id },
      { $set: { status: PinStatus.VOID, updatedAt: new Date() } },
    );

    return {
      id: pin._id.toString(),
      status: PinStatus.VOID,
    };
  }
} 