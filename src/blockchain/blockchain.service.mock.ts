import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { RegistroBlockchain } from './entities/registro-blockchain.entity';
import { RegistrarFacturaRequest } from './dto/registrar-factura.dto';
import { AnularFacturaRequest } from './dto/anular-factura.dto';
import { VerificarFacturaResponse } from './dto/verificar-factura-response.dto';
import { BlockchainService } from './blockchain.service';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class BlockchainServiceMock extends BlockchainService {
  private readonly logger = new Logger(BlockchainServiceMock.name);

  constructor(
    @InjectRepository(RegistroBlockchain)
    private readonly repository: Repository<RegistroBlockchain>,
  ) {
    super();
  }

  async registrarFactura(
    request: RegistrarFacturaRequest,
  ): Promise<RegistroBlockchain> {
    const exists = await this.repository.exists({
      where: { hashSha256: request.hashSha256 },
    });
    if (exists) {
      throw new ConflictException(
        `El hash ${request.hashSha256} ya esta registrado`,
      );
    }

    const registro = this.repository.create({
      tipo: 'FACTURA',
      numeroFactura: request.numeroFactura,
      hashSha256: request.hashSha256,
      monto: request.monto,
      txHash: `mock-tx-${randomBytes(4).toString('hex')}`,
      network: 'mock',
      estado: 'CONFIRMADO',
    });

    return this.repository.save(registro);
  }

  async verificarFactura(
    hashSha256: string,
  ): Promise<VerificarFacturaResponse> {
    const registro = await this.repository.findOne({
      where: { hashSha256 },
    });

    if (!registro) {
      return VerificarFacturaResponse.noExiste();
    }

    return {
      existe: true,
      autentica: true,
      registro: {
        numeroFactura: registro.numeroFactura,
        monto: Number(registro.monto),
        txHash: registro.txHash,
        blockNumber: registro.blockNumber ? Number(registro.blockNumber) : null,
        network: registro.network,
        fechaRegistro:
          registro.createdAt?.toISOString() || new Date().toISOString(),
        urlExplorador: null,
      },
    };
  }

  async anularFactura(
    hashSha256: string,
    request: AnularFacturaRequest,
  ): Promise<RegistroBlockchain> {
    const registro = await this.repository.findOne({
      where: { hashSha256 },
    });

    if (!registro) {
      throw new NotFoundException(
        `Factura con hash ${hashSha256} no encontrada`,
      );
    }

    if (registro.estado === 'ANULADO') {
      throw new BadRequestException('La factura ya esta anulada');
    }

    registro.hashNotaCredito = request.hashNotaCredito;
    registro.txHashAnulacion = `mock-tx-${randomBytes(4).toString('hex')}`;
    registro.estado = 'ANULADO';

    return this.repository.save(registro);
  }

  async listarTodas(): Promise<RegistroBlockchain[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async buscarPorNumero(
    numeroFactura: string,
  ): Promise<RegistroBlockchain> {
    const registro = await this.repository.findOne({
      where: { numeroFactura },
    });
    if (!registro) {
      throw new NotFoundException(
        `Factura con numero ${numeroFactura} no encontrada`,
      );
    }
    return registro;
  }
}
