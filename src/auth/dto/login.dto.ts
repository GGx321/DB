import { IsString, Matches, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  @Matches(/^\+380\d{9}$/, {
    message: "Неверный формат номера телефона",
  })
  phone: string;

  @IsString()
  @MinLength(1, { message: "Пароль обязателен" })
  password: string;
}
