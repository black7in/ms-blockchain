import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
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
export class BlockchainServiceImpl extends BlockchainService {
  private readonly logger = new Logger(BlockchainServiceImpl.name);
  private _contract: ethers.Contract | null = null;

  constructor(
    @InjectRepository(RegistroBlockchain)
    private readonly repository: Repository<RegistroBlockchain>,
    private readonly config: ConfigService,
  ) {
    super();
  }

  private getContract(): ethers.Contract {
    if (!this._contract) {
      const rpcUrl = this.config.get<string>('AMOY_RPC_URL');
      const privateKey = this.config.get<string>('WALLET_PRIVATE_KEY');
      const contractAddress = this.config.get<string>('CONTRACT_ADDRESS');

      if (!rpcUrl || !privateKey || !contractAddress) {
        throw new Error(
          'Faltan variables de entorno para blockchain: AMOY_RPC_URL, WALLET_PRIVATE_KEY, CONTRACT_ADDRESS',
        );
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      this._contract = new ethers.Contract(contractAddress, this.getContractAbi(), wallet);
    }
    return this._contract;
  }

  private getContractAbi(): ethers.InterfaceAbi {
    return [
      'function registrarFactura(bytes32 hashSha256, string numeroFactura, uint256 monto) external',
      'function verificarFactura(bytes32 hashSha256) external view returns (string memory, uint256, uint256, address, bool, bytes32)',
      'function anularFactura(bytes32 hashSha256, bytes32 hashNotaCredito) external',
      'function existe(bytes32 hashSha256) external view returns (bool)',
      'event FacturaRegistrada(bytes32 indexed hashSha256, string numeroFactura, uint256 timestamp)',
      'event FacturaAnulada(bytes32 indexed hashSha256, bytes32 hashNotaCredito, uint256 timestamp)',
    ];
  }

  private toBytes32(hexHash: string): string {
    if (hexHash.startsWith('0x')) {
      return hexHash;
    }
    return '0x' + hexHash;
  }

  private toCentavos(monto: number): bigint {
    return BigInt(Math.round(monto * 100));
  }

  async registrarFactura(
    request: RegistrarFacturaRequest,
  ): Promise<RegistroBlockchain> {
    const existing = await this.repository.findOne({
      where: { hashSha256: request.hashSha256 },
    });

    if (existing && existing.estado !== 'FALLIDO') {
      throw new ConflictException(
        `El hash ${request.hashSha256} ya esta registrado`,
      );
    }

    let registro: RegistroBlockchain;
    if (existing) {
      existing.estado = 'PENDIENTE';
      existing.errorMensaje = null;
      existing.txHash = null;
      registro = await this.repository.save(existing);
    } else {
      registro = this.repository.create({
        tipo: 'FACTURA',
        numeroFactura: request.numeroFactura,
        hashSha256: request.hashSha256,
        monto: request.monto,
        network: 'amoy',
        estado: 'PENDIENTE',
      });
      registro = await this.repository.save(registro);
    }

    try {
      const bytes32 = this.toBytes32(request.hashSha256);
      const montoCentavos = this.toCentavos(request.monto);

      const gasLimit = this.config.get<number>('GAS_LIMIT', 200000);
      const gasPriceGwei = this.config.get<number>('GAS_PRICE_GWEI', 30);
      const gasPrice = ethers.parseUnits(gasPriceGwei.toString(), 'gwei');

      const tx = await this.getContract().registrarFactura(
        bytes32,
        request.numeroFactura,
        montoCentavos,
        { gasLimit, gasPrice },
      );

      const receipt = await tx.wait();

      registro.txHash = receipt.hash;
      registro.blockNumber = receipt.blockNumber;
      registro.estado = 'CONFIRMADO';
    } catch (error) {
      this.logger.error('Error al registrar en blockchain', error);
      registro.estado = 'FALLIDO';
      registro.errorMensaje =
        error instanceof Error ? error.message : 'Error desconocido';
    }

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

    try {
      const bytes32 = this.toBytes32(hashSha256);
      const result = await this.getContract().verificarFactura(bytes32);

      const autentica =
        result[0] === registro.numeroFactura &&
        Number(result[1]) === Math.round(Number(registro.monto) * 100);

      return {
        existe: true,
        autentica,
        registro: {
          numeroFactura: registro.numeroFactura,
          monto: Number(registro.monto),
          txHash: registro.txHash,
          blockNumber: registro.blockNumber
            ? Number(registro.blockNumber)
            : null,
          network: registro.network,
          fechaRegistro:
            registro.createdAt?.toISOString() || new Date().toISOString(),
          urlExplorador: registro.txHash
            ? `https://mumbai.polygonscan.com/tx/${registro.txHash}`
            : null,
        },
      };
    } catch (error) {
      this.logger.error('Error al verificar en blockchain', error);
      return {
        existe: true,
        autentica: false,
        registro: {
          numeroFactura: registro.numeroFactura,
          monto: Number(registro.monto),
          txHash: registro.txHash,
          blockNumber: registro.blockNumber
            ? Number(registro.blockNumber)
            : null,
          network: registro.network,
          fechaRegistro:
            registro.createdAt?.toISOString() || new Date().toISOString(),
          urlExplorador: null,
        },
      };
    }
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

    try {
      const hashBytes32 = this.toBytes32(hashSha256);
      const notaCreditoBytes32 = this.toBytes32(request.hashNotaCredito);

      const gasLimit = this.config.get<number>('GAS_LIMIT', 200000);
      const gasPriceGwei = this.config.get<number>('GAS_PRICE_GWEI', 30);
      const gasPrice = ethers.parseUnits(gasPriceGwei.toString(), 'gwei');

      const tx = await this.getContract().anularFactura(
        hashBytes32,
        notaCreditoBytes32,
        { gasLimit, gasPrice },
      );

      const receipt = await tx.wait();

      registro.txHashAnulacion = receipt.hash;
      registro.estado = 'ANULADO';
    } catch (error) {
      this.logger.error('Error al anular en blockchain', error);
      registro.estado = 'FALLIDO';
      registro.errorMensaje =
        error instanceof Error ? error.message : 'Error desconocido';
    }

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
