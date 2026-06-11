class RegistroData {
  numeroFactura: string;
  monto: number;
  txHash: string | null;
  blockNumber: number | null;
  network: string;
  fechaRegistro: string;
  urlExplorador: string | null;
}

export class VerificarFacturaResponse {
  existe: boolean;
  autentica: boolean;
  registro: RegistroData | null;

  static noExiste(): VerificarFacturaResponse {
    return {
      existe: false,
      autentica: false,
      registro: null,
    };
  }
}
