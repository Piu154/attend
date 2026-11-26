import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { Restaurant } from './entities/restaurant.entity';
import { Branch } from './entities/branch.entity';
import { RestaurantTable } from './entities/restaurant-table.entity';
import { QrCode } from './entities/qr-code.entity';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { AssistRequest } from './entities/assist-request.entity';
import { AssistRequests1700000000002 } from './migrations/1700000000002-assist-requests';
import { Phase2Design1700000000003 } from './migrations/1700000000003-phase2-design';
import { PlatformUpgrade1700000000005 } from './migrations/1700000000005-platform-upgrade';
import { Vendor } from './entities/vendor.entity';
import { ChangeRequest } from './entities/change-request.entity';
import { AdminVenuesService } from './services/admin-venues.service';
import { AdminVenuesController } from './controllers/admin-venues.controller';

import { RequestBell1700000000004 } from './migrations/1700000000004-request-bell';
import { RestaurantSettings } from './entities/restaurant-settings.entity';
import { User } from './entities/user.entity';
import { CustomerSession } from './entities/customer-session.entity';
import { RequestNotification } from './entities/request-notification.entity';
import { RequestStatusHistory } from './entities/request-status-history.entity';
import { HealthController } from './controllers/health.controller';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { AssistService } from './services/assist.service';
import { AssistPublicController } from './controllers/assist-public.controller';
import { RequestsController } from './controllers/requests.controller';
import { InitSchema1700000000000 } from './migrations/1700000000000-init-schema';
import { MenuSchema1700000000001 } from './migrations/1700000000001-menu-schema';
import { MenuService } from './services/menu.service';
import { MenuController } from './controllers/menu.controller';
import { CustomerPageController } from './controllers/customer-page.controller';
import { RestaurantsService } from './services/restaurants.service';
import { BranchesService } from './services/branches.service';
import { TablesService } from './services/tables.service';
import { AdminGuard } from './common/admin.guard';
import { RestaurantGuard } from './common/restaurant.guard';
import { RestaurantsController } from './controllers/restaurants.controller';
import { AdminController } from './controllers/admin.controller';
import { BranchesController } from './controllers/branches.controller';
import { TablesController } from './controllers/tables.controller';
import { PublicController } from './controllers/public.controller';
import { RootController } from './controllers/root.controller';
import { BranchStaff1700000000006 } from './migrations/1700000000006-branch-staff';
import { AdminStaffService } from './services/admin-staff.service';
import { AdminStaffController } from './controllers/admin-staff.controller';
const entities = [Restaurant, Branch, RestaurantTable, QrCode, MenuCategory, MenuItem, AssistRequest,
  RestaurantSettings, User, CustomerSession, RequestNotification, RequestStatusHistory];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const secret = cfg.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32) throw new Error('JWT_SECRET is missing or shorter than 32 characters (see .env)');
        return { secret, signOptions: { expiresIn: '12h' } };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        url: cfg.get<string>('DATABASE_URL') ?? 'postgres://attend:attend@localhost:5432/attend',
        entities,
       migrations: [InitSchema1700000000000, MenuSchema1700000000001, AssistRequests1700000000002, Phase2Design1700000000003, RequestBell1700000000004,PlatformUpgrade1700000000005,BranchStaff1700000000006],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [RestaurantsController, AdminController, RootController,BranchesController, TablesController, PublicController, MenuController, CustomerPageController, AssistPublicController, RequestsController, HealthController, AuthController,AdminVenuesController,AdminStaffController],
  providers: [AdminVenuesService,AuthService, AssistService, MenuService, RestaurantsService, BranchesService, TablesService, AdminGuard, RestaurantGuard,AdminStaffService],
})
export class AppModule {}