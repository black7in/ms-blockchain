import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from './blockchain/blockchain.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5433),
        username: config.get<string>('DB_USER', 'bustrack'),
        password: config.get<string>('DB_PASSWORD', 'bustrack123'),
        database: config.get<string>('DB_NAME', 'bustrack_blockchain'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    HealthModule,
    BlockchainModule,
  ],
})
export class AppModule {}
