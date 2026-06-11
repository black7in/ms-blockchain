import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  Matches,
  Length,
} from 'class-validator';

export class RegistrarFacturaRequest {
  @IsString()
  @IsNotEmpty()
  @Length(64, 64)
  @Matches(/^[0-9a-fA-F]{64}$/, {
    message: 'hashSha256 debe ser un string hexadecimal de 64 caracteres',
  })
  hashSha256: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  numeroFactura: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;
}
