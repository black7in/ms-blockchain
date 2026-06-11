import { RegistroBlockchain } from './entities/registro-blockchain.entity';
import { RegistrarFacturaRequest } from './dto/registrar-factura.dto';
import { AnularFacturaRequest } from './dto/anular-factura.dto';
import { VerificarFacturaResponse } from './dto/verificar-factura-response.dto';

export abstract class BlockchainService {
  abstract registrarFactura(
    request: RegistrarFacturaRequest,
  ): Promise<RegistroBlockchain>;

  abstract verificarFactura(
    hashSha256: string,
  ): Promise<VerificarFacturaResponse>;

  abstract anularFactura(
    hashSha256: string,
    request: AnularFacturaRequest,
  ): Promise<RegistroBlockchain>;

  abstract listarTodas(): Promise<RegistroBlockchain[]>;

  abstract buscarPorNumero(
    numeroFactura: string,
  ): Promise<RegistroBlockchain>;
}
