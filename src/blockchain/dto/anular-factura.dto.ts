import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class AnularFacturaRequest {
  @IsString()
  @IsNotEmpty()
  @Length(64, 64)
  @Matches(/^[0-9a-fA-F]{64}$/, {
    message: 'hashNotaCredito debe ser un string hexadecimal de 64 caracteres',
  })
  hashNotaCredito: string;
}
