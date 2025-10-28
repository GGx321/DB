import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getCurrentUser(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        name: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    return user;
  }

  async updateCurrentUser(currentPhone: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: currentPhone },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    // Если меняется номер телефона, проверяем что новый номер не занят
    if (updateUserDto.phone && updateUserDto.phone !== currentPhone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: updateUserDto.phone },
      });

      if (existingUser) {
        throw new ConflictException("Этот номер телефона уже используется");
      }
    }

    // Обновляем данные пользователя
    const updatedUser = await this.prisma.user.update({
      where: { phone: currentPhone },
      data: updateUserDto,
      select: {
        id: true,
        phone: true,
        name: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }
}
