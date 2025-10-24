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
    const { phone } = loginDto;

    // Проверка формата номера
    const phoneRegex = /^\+380\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException("Неверный формат номера телефона");
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
    const token = this.jwtService.sign(payload, {
      expiresIn: "1h",
    });

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
