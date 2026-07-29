import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MaintenanceMode, MaintenanceModeDocument } from './schemas/maintenance-mode.schema';
import { ConfigureMaintenanceDto } from './dto/configure-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(MaintenanceMode.name)
    private readonly maintenanceModel: Model<MaintenanceModeDocument>,
  ) {}

  // Exactly one config document ever exists — created lazily on first read/write.
  private async getSingleton(): Promise<MaintenanceModeDocument> {
    const existing = await this.maintenanceModel.findOne();
    if (existing) return existing;
    return this.maintenanceModel.create({});
  }

  /**
   * Whether maintenance is in effect RIGHT NOW, accounting for the manual
   * switch plus an optional schedule window:
   *   - isEnabled=false            → never active (the manual override)
   *   - startAt set and in future  → not yet active
   *   - endAt set and in the past  → no longer active (auto-expired)
   *   - otherwise                  → active
   */
  async isActiveNow(): Promise<boolean> {
    const doc = await this.getSingleton();
    if (!doc.isEnabled) return false;

    const now = new Date();
    if (doc.startAt && now < doc.startAt) return false;
    if (doc.endAt && now > doc.endAt) return false;
    return true;
  }

  // Public shape — used by both the unauthenticated status endpoint (frontend
  // login-page banner) and the super-admin config panel.
  private format(doc: MaintenanceModeDocument, active: boolean) {
    return {
      active,
      isEnabled: doc.isEnabled,
      startAt: doc.startAt,
      endAt: doc.endAt,
      message: doc.message,
      updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
      updatedAt: (doc as any).updatedAt ?? null,
    };
  }

  async getStatus() {
    const doc = await this.getSingleton();
    const active = await this.isActiveNow();
    return this.format(doc, active);
  }

  async configure(dto: ConfigureMaintenanceDto, adminUserId: string) {
    const doc = await this.getSingleton();

    doc.isEnabled = dto.isEnabled;
    doc.startAt = dto.startAt ? new Date(dto.startAt) : null;
    doc.endAt = dto.endAt ? new Date(dto.endAt) : null;
    if (dto.message !== undefined) doc.message = dto.message.trim();
    doc.updatedBy = new Types.ObjectId(adminUserId);

    await doc.save();
    return this.getStatus();
  }

  // Explicit "mark maintenance as complete" action — always wins over any
  // schedule, per the manual-override semantics in isActiveNow().
  async endNow(adminUserId: string) {
    const doc = await this.getSingleton();
    doc.isEnabled = false;
    doc.updatedBy = new Types.ObjectId(adminUserId);
    await doc.save();
    return this.getStatus();
  }
}
