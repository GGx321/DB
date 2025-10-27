import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(loginDto: LoginDto) {
    const { phone, password } = loginDto;

    // Проверка формата номера
    const phoneRegex = /^\+380\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException("Неверный формат номера телефона");
    }

    // Проверка пароля
    const correctPassword = process.env.APP_PASSWORD || "defaultPassword123";
    if (password !== correctPassword) {
      throw new UnauthorizedException("Неверный пароль");
    }

    // Проверка наличия номера в базе
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new UnauthorizedException("Номер телефона не найден");
    }

    // Создание JWT токена
    const payload = { phone: user.phone };
    const token = this.jwtService.sign(payload);

    return { token };
  }

  async validateToken(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new UnauthorizedException("Пользователь не найден");
    }

    return user;
  }
}
