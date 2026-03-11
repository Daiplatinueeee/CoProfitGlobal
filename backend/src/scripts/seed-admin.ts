import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';


async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);

    const email = 'admin@coprofitglobal.com';
    const existing = await usersService.findByEmailWithPassword(email);

    if (existing) {
      console.log('Admin already exists');
      return;
    }

    const passwordHash = await bcrypt.hash('coprofitglobal123', 10);

    const user = await usersService.createAdmin({
    name: 'Super Admin',
    username: 'superadmin',
    email,
    passwordHash,
    });

    console.log('Admin created:', {
      id: (user as any)._id?.toString?.(),
      email: user.email,
      role: user.role,
    });
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});