import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
  }): Promise<User> {
    try {
      const created = await this.userModel.create({
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role ?? UserRole.FREE,
      });

      // remove passwordHash from returned object (schema select:false already helps)
      return created;
    } catch (err: any) {
      // duplicate key error (email)
      if (err?.code === 11000) throw new ConflictException('Email already in use');
      throw err;
    }
  }

  async findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
    return this.userModel.findOne({ email }).select('+passwordHash').exec() as any;
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }
}