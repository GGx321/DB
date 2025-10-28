import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { S3Service } from "../s3/s3.service";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service
  ) {}

  async getCurrentUser(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        name: true,
        avatarKey: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    // Генерируем временную ссылку для аватарки
    const avatarUrl = await this.s3Service.getSignedUrl(user.avatarKey);

    return {
      ...user,
      avatarUrl,
    };
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
        avatarKey: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Генерируем временную ссылку для аватарки
    const avatarUrl = await this.s3Service.getSignedUrl(updatedUser.avatarKey);

    return {
      ...updatedUser,
      avatarUrl,
    };
  }

  async uploadAvatar(phone: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Файл не предоставлен");
    }

    // Проверяем тип файла
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Неверный формат файла. Разрешены: JPEG, PNG, GIF, WebP"
      );
    }

    // Проверяем размер файла (максимум 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException("Размер файла не должен превышать 5MB");
    }

    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    // Удаляем старую аватарку если есть
    if (user.avatarKey) {
      await this.s3Service.deleteFile(user.avatarKey);
    }

    // Загружаем новую аватарку в S3
    const avatarKey = await this.s3Service.uploadAvatar(user.id, file);

    // Обновляем запись в БД
    const updatedUser = await this.prisma.user.update({
      where: { phone },
      data: { avatarKey },
      select: {
        id: true,
        phone: true,
        name: true,
        avatarKey: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Генерируем временную ссылку для аватарки
    const avatarUrl = await this.s3Service.getSignedUrl(updatedUser.avatarKey);

    return {
      ...updatedUser,
      avatarUrl,
    };
  }

  async deleteAvatar(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    if (!user.avatarKey) {
      throw new BadRequestException("У пользователя нет аватарки");
    }

    // Удаляем файл из S3
    await this.s3Service.deleteFile(user.avatarKey);

    // Обновляем запись в БД
    const updatedUser = await this.prisma.user.update({
      where: { phone },
      data: { avatarKey: null },
      select: {
        id: true,
        phone: true,
        name: true,
        avatarKey: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updatedUser,
      avatarUrl: null,
    };
  }
}
