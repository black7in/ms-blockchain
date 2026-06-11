import { RegistroBlockchain } from '../entities/registro-blockchain.entity';

export class RegistroBlockchainResponse {
  id: string;
  tipo: string;
  numeroFactura: string;
  hashSha256: string;
  monto: number;
  txHash: string | null;
  txHashAnulacion: string | null;
  hashNotaCredito: string | null;
  blockNumber: number | null;
  estado: string;
  network: string;
  timestamp: string;
  urlExplorador: string | null;
  errorMensaje: string | null;

  static from(entity: RegistroBlockchain): RegistroBlockchainResponse {
    const response = new RegistroBlockchainResponse();
    response.id = entity.id;
    response.tipo = entity.tipo;
    response.numeroFactura = entity.numeroFactura;
    response.hashSha256 = entity.hashSha256;
    response.monto = Number(entity.monto);
    response.txHash = entity.txHash;
    response.txHashAnulacion = entity.txHashAnulacion;
    response.hashNotaCredito = entity.hashNotaCredito;
    response.blockNumber = entity.blockNumber ? Number(entity.blockNumber) : null;
    response.estado = entity.estado;
    response.network = entity.network;
    response.timestamp = entity.createdAt?.toISOString() || new Date().toISOString();
    response.errorMensaje = entity.errorMensaje;

    if (entity.txHash && entity.network !== 'mock') {
      response.urlExplorador = `https://mumbai.polygonscan.com/tx/${entity.txHash}`;
    } else {
      response.urlExplorador = null;
    }

    return response;
  }
}
