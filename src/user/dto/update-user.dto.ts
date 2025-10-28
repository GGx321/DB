import { IsString, IsOptional, Matches, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Имя должно содержать минимум 2 символа" })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+380\d{9}$/, {
    message: "Неверный формат номера телефона",
  })
  phone?: string;
}
