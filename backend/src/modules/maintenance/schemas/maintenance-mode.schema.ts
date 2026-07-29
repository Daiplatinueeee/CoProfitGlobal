import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MaintenanceModeDocument = HydratedDocument<MaintenanceMode>;

/**
 * Singleton document (exactly one row ever exists — see
 * MaintenanceService.getSingleton) holding the site-wide maintenance-mode
 * configuration. Only SUPER_ADMIN can read/write it via the admin panel;
 * AuthService.login() reads the computed active state to gate logins.
 */
@Schema({ timestamps: true, collection: 'maintenance_mode' })
export class MaintenanceMode {
  // Manual master switch. false always means "not in maintenance" regardless
  // of schedule — this is the "End Maintenance Now" override.
  @Prop({ type: Boolean, default: false })
  isEnabled: boolean;

  // Scheduled start. null = takes effect immediately once isEnabled is true.
  @Prop({ type: Date, default: null })
  startAt: Date | null;

  // Scheduled end. null = indefinite — stays active until manually turned off.
  @Prop({ type: Date, default: null })
  endAt: Date | null;

  // Shown to users on the login page while maintenance is active.
  @Prop({ type: String, default: 'The system is currently under maintenance. Please check back later.' })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;
}

export const MaintenanceModeSchema = SchemaFactory.createForClass(MaintenanceMode);
