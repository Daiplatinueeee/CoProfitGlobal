/**
 * seed-superadmin.ts
 *
 * Creates the one-time SUPER_ADMIN account used to manage maintenance mode
 * (see modules/maintenance). SUPER_ADMIN is the only role exempt from the
 * maintenance-mode login lockout, so this account is how you get back in to
 * turn maintenance off.
 *
 * Login is by EMAIL, not username — the seeded email is superadmin@coprofitglobal.com.
 *
 * Run from backend/:
 *   npx ts-node src/scripts/seed-superadmin.ts
 */

import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';

const EMAIL = 'superadmin@coprofitglobal.com';
const USERNAME = 'superadmin';
const PASSWORD = 'superadmin';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);

    const existing = await usersService.findByEmailWithPassword(EMAIL);
    if (existing) {
      console.log('Super admin already exists');
      return;
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const user = await usersService.createSuperAdmin({
      name: 'Super Admin',
      username: USERNAME,
      email: EMAIL,
      passwordHash,
    });

    console.log('Super admin created:', {
      id: (user as any)._id?.toString?.(),
      email: user.email,
      role: user.role,
    });
    console.log('\n⚠ Login with EMAIL, not username:');
    console.log(`  email:    ${EMAIL}`);
    console.log(`  password: ${PASSWORD}`);
    console.log('\n⚠ This password is intentionally trivial and this account can toggle');
    console.log('  site-wide maintenance mode — change the password immediately after');
    console.log('  first login (Change Password in the account settings).');
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
