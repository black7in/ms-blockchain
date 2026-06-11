import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { BlockchainServiceMock } from './blockchain.service.mock';
import { BlockchainServiceImpl } from './blockchain.service.impl';
import { RegistroBlockchain } from './entities/registro-blockchain.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistroBlockchain]),
    AuthModule,
  ],
  controllers: [BlockchainController],
  providers: [
    BlockchainServiceMock,
    BlockchainServiceImpl,
    {
      provide: BlockchainService,
      inject: [BlockchainServiceMock, BlockchainServiceImpl, ConfigService],
      useFactory: (
        mock: BlockchainServiceMock,
        impl: BlockchainServiceImpl,
        config: ConfigService,
      ) => {
        return config.get<string>('MOCK_BLOCKCHAIN', 'true') === 'true'
          ? mock
          : impl;
      },
    },
  ],
  exports: [BlockchainService],
})
export class BlockchainModule {}
