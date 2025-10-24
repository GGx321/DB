import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^\+380\d{9}$/, {
    message: 'Неверный формат номера телефона',
  })
  phone: string;
}

