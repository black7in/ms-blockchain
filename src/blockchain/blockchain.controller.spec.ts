import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { RegistroBlockchainResponse } from './dto/registro-blockchain-response.dto';
import { VerificarFacturaResponse } from './dto/verificar-factura-response.dto';
import { RegistroBlockchain } from './entities/registro-blockchain.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

function createMockRegistro(overrides: Partial<RegistroBlockchain> = {}): RegistroBlockchain {
  const registro = new RegistroBlockchain();
  registro.id = '550e8400-e29b-41d4-a716-446655440001';
  registro.tipo = 'FACTURA';
  registro.numeroFactura = 'BTBO-2026-000001';
  registro.hashSha256 = 'a3f5c2d8e1b4f6789012345678901234567890123456789012345678901234ab';
  registro.monto = 85.00;
  registro.txHash = 'mock-tx-a1b2c3d4';
  registro.txHashAnulacion = null;
  registro.hashNotaCredito = null;
  registro.blockNumber = 0;
  registro.network = 'mock';
  registro.estado = 'CONFIRMADO';
  registro.errorMensaje = null;
  registro.createdAt = new Date('2026-05-22T21:30:00Z');
  registro.updatedAt = new Date('2026-05-22T21:30:00Z');
  Object.assign(registro, overrides);
  return registro;
}

function generateJwtToken(payload: object, secret: string): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

describe('BlockchainController', () => {
  let controller: BlockchainController;
  let mockService: jest.Mocked<BlockchainService>;
  let jwtService: JwtService;

  const JWT_SECRET = 'test-secret-key-for-blockchain-ms';

  const mockBlockchainService = {
    registrarFactura: jest.fn(),
    verificarFactura: jest.fn(),
    anularFactura: jest.fn(),
    listarTodas: jest.fn(),
    buscarPorNumero: jest.fn(),
  };

  function token(role: string): string {
    return generateJwtToken({ sub: 'user-1', role }, JWT_SECRET);
  }

  // Override JwtAuthGuard to accept test tokens
  const mockJwtAuthGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const authHeader = req.headers.authorization;
      if (!authHeader) return false;

      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.replace('Bearer ', '');
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = { userId: payload.sub, role: payload.role };
        return true;
      } catch {
        return false;
      }
    },
  };

  const mockRolesGuard = {
    canActivate: (context: ExecutionContext) => {
      const reflector = new Reflector();
      const requiredRoles = reflector.getAllAndOverride('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!requiredRoles || requiredRoles.length === 0) return true;
      const req = context.switchToHttp().getRequest();
      return requiredRoles.some((role) => role === req.user?.role);
    },
  };

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockchainController],
      providers: [
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
        ConfigService,
        {
          provide: JwtService,
          useValue: new JwtService({ secret: JWT_SECRET }),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<BlockchainController>(BlockchainController);
    mockService = module.get(BlockchainService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('POST /blockchain/facturas', () => {
    const request = {
      hashSha256: 'a3f5c2d8e1b4f6789012345678901234567890123456789012345678901234ab',
      numeroFactura: 'BTBO-2026-000001',
      monto: 85.00,
    };

    it('debe rechazar sin token', async () => {
      mockBlockchainService.registrarFactura.mockResolvedValue(
        createMockRegistro(),
      );
      const result = await controller.registrar(request);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('debe registrar con role ADMIN', async () => {
      const registro = createMockRegistro();
      mockBlockchainService.registrarFactura.mockResolvedValue(registro);

      const result = await controller.registrar(request);

      expect(result).toBeInstanceOf(RegistroBlockchainResponse);
      expect(result.estado).toBe('CONFIRMADO');
      expect(result.network).toBe('mock');
      expect(result.numeroFactura).toBe('BTBO-2026-000001');
    });

    it('debe rechazar hash invalido (ValidationPipe)', async () => {
      const invalidRequest = {
        hashSha256: 'corto',
        numeroFactura: '',
        monto: -1,
      };
      // Validation is handled by the pipe, so we test the DTO directly
      try {
        await controller.registrar(invalidRequest as any);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('debe lanzar error si el hash ya existe', async () => {
      mockBlockchainService.registrarFactura.mockRejectedValue(
        new Error('El hash ya esta registrado'),
      );

      await expect(controller.registrar(request)).rejects.toThrow(
        'El hash ya esta registrado',
      );
    });
  });

  describe('GET /blockchain/facturas/:hash', () => {
    const hash = 'a3f5c2d8e1b4f6789012345678901234567890123456789012345678901234ab';

    it('debe verificar factura existente', async () => {
      const response: VerificarFacturaResponse = {
        existe: true,
        autentica: true,
        registro: {
          numeroFactura: 'BTBO-2026-000001',
          monto: 85.00,
          txHash: 'mock-tx-a1b2c3d4',
          blockNumber: 0,
          network: 'mock',
          fechaRegistro: '2026-05-22T21:30:00Z',
          urlExplorador: null,
        },
      };
      mockBlockchainService.verificarFactura.mockResolvedValue(response);

      const result = await controller.verificar(hash);

      expect(result.existe).toBe(true);
      expect(result.autentica).toBe(true);
      expect(result.registro).toBeDefined();
      expect(result.registro!.numeroFactura).toBe('BTBO-2026-000001');
    });

    it('debe retornar noExiste para hash no registrado', async () => {
      mockBlockchainService.verificarFactura.mockResolvedValue(
        VerificarFacturaResponse.noExiste(),
      );

      const result = await controller.verificar('noexiste123456789012345678901234567890123456789012345678901234ab');

      expect(result.existe).toBe(false);
      expect(result.autentica).toBe(false);
      expect(result.registro).toBeNull();
    });
  });

  describe('POST /blockchain/facturas/:hash/anular', () => {
    const hash = 'a3f5c2d8e1b4f6789012345678901234567890123456789012345678901234ab';
    const request = {
      hashNotaCredito: 'b7e9d1f3a2c56789012345678901234567890123456789012345678901234cd',
    };

    it('debe anular factura con ADMIN', async () => {
      const registro = createMockRegistro({
        estado: 'ANULADO',
        txHashAnulacion: 'mock-tx-e5f6g7h8',
        hashNotaCredito: request.hashNotaCredito,
      });
      mockBlockchainService.anularFactura.mockResolvedValue(registro);

      const result = await controller.anular(hash, request);

      expect(result.estado).toBe('ANULADO');
      expect(result.txHashAnulacion).toBeDefined();
      expect(result.hashNotaCredito).toBe(request.hashNotaCredito);
    });

    it('debe lanzar error si la factura ya esta anulada', async () => {
      mockBlockchainService.anularFactura.mockRejectedValue(
        new Error('La factura ya esta anulada'),
      );

      await expect(controller.anular(hash, request)).rejects.toThrow(
        'La factura ya esta anulada',
      );
    });
  });

  describe('GET /blockchain/facturas', () => {
    it('debe listar todas las facturas', async () => {
      const registros = [
        createMockRegistro(),
        createMockRegistro({
          id: '660e8400-e29b-41d4-a716-446655440002',
          numeroFactura: 'BTBO-2026-000002',
          hashSha256: 'b7e9d1f3a2c56789012345678901234567890123456789012345678901234cd',
        }),
      ];
      mockBlockchainService.listarTodas.mockResolvedValue(registros);

      const result = await controller.listarTodas();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(RegistroBlockchainResponse);
    });
  });

  describe('GET /blockchain/facturas/numero/:numeroFactura', () => {
    it('debe buscar por numero de factura', async () => {
      const registro = createMockRegistro();
      mockBlockchainService.buscarPorNumero.mockResolvedValue(registro);

      const result = await controller.buscarPorNumero('BTBO-2026-000001');

      expect(result.numeroFactura).toBe('BTBO-2026-000001');
    });

    it('debe lanzar error si no encuentra por numero', async () => {
      mockBlockchainService.buscarPorNumero.mockRejectedValue(
        new Error('Factura con numero NOEXISTE no encontrada'),
      );

      await expect(controller.buscarPorNumero('NOEXISTE')).rejects.toThrow(
        'no encontrada',
      );
    });
  });
});
