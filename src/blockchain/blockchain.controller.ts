import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { RegistrarFacturaRequest } from './dto/registrar-factura.dto';
import { AnularFacturaRequest } from './dto/anular-factura.dto';
import { RegistroBlockchainResponse } from './dto/registro-blockchain-response.dto';
import { VerificarFacturaResponse } from './dto/verificar-factura-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('blockchain/facturas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post()
  @Roles('ADMIN', 'VENDEDOR')
  async registrar(
    @Body() request: RegistrarFacturaRequest,
  ): Promise<RegistroBlockchainResponse> {
    const registro = await this.blockchainService.registrarFactura(request);
    return RegistroBlockchainResponse.from(registro);
  }

  @Get('numero/:numeroFactura')
  @Roles('ADMIN')
  async buscarPorNumero(
    @Param('numeroFactura') numeroFactura: string,
  ): Promise<RegistroBlockchainResponse> {
    const registro =
      await this.blockchainService.buscarPorNumero(numeroFactura);
    return RegistroBlockchainResponse.from(registro);
  }

  @Post(':hash/anular')
  @Roles('ADMIN')
  async anular(
    @Param('hash') hash: string,
    @Body() request: AnularFacturaRequest,
  ): Promise<RegistroBlockchainResponse> {
    const registro = await this.blockchainService.anularFactura(hash, request);
    return RegistroBlockchainResponse.from(registro);
  }

  @Get(':hash')
  @Roles('ADMIN', 'SUPERVISOR')
  async verificar(
    @Param('hash') hash: string,
  ): Promise<VerificarFacturaResponse> {
    return this.blockchainService.verificarFactura(hash);
  }

  @Get()
  @Roles('ADMIN')
  async listarTodas(): Promise<RegistroBlockchainResponse[]> {
    const registros = await this.blockchainService.listarTodas();
    return registros.map(RegistroBlockchainResponse.from);
  }
}
