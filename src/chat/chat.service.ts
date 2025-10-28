import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { S3Service } from "../s3/s3.service";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService, private s3Service: S3Service) {}

  async createMessage(phone: string, text: string) {
    // Находим пользователя
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    // Создаем сообщение
    return this.prisma.message.create({
      data: {
        text,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            name: true,
          },
        },
      },
    });
  }

  async getMessages(phone: string, limit: number = 50) {
    // Получаем сообщения
    const messages = await this.prisma.message.findMany({
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            name: true,
          },
        },
      },
    });

    // Определяем собеседника (тот кто не текущий пользователь)
    const currentUser = await this.prisma.user.findUnique({
      where: { phone },
    });

    const otherUser = await this.prisma.user.findFirst({
      where: {
        phone: {
          not: phone,
        },
      },
      select: {
        phone: true,
        name: true,
        avatarKey: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    // Генерируем avatarUrl только для собеседника
    const otherUserAvatarUrl = otherUser
      ? await this.s3Service.getSignedUrl(otherUser.avatarKey)
      : null;

    return {
      messages: messages.reverse(),
      otherUser: otherUser
        ? {
            ...otherUser,
            avatarUrl: otherUserAvatarUrl,
          }
        : null,
    };
  }

  async getMessagesAfter(lastMessageId: number, limit: number = 50) {
    return this.prisma.message.findMany({
      where: {
        id: {
          gt: lastMessageId,
        },
      },
      take: limit,
      orderBy: {
        createdAt: "asc",
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteMessage(messageId: number, phone: string) {
    // Проверяем что сообщение принадлежит пользователю
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        user: {
          phone,
        },
      },
    });

    if (!message) {
      throw new NotFoundException(
        "Сообщение не найдено или не принадлежит пользователю"
      );
    }

    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  // Обновление статуса пользователя
  async setUserOnline(phone: string, isOnline: boolean) {
    const user = await this.prisma.user.update({
      where: { phone },
      data: {
        isOnline,
        lastSeen: new Date(),
      },
      select: {
        phone: true,
        name: true,
        avatarKey: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    const avatarUrl = await this.s3Service.getSignedUrl(user.avatarKey);

    return {
      ...user,
      avatarUrl,
    };
  }

  // Получение статуса пользователя
  async getUserStatus(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        phone: true,
        name: true,
        avatarKey: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    if (!user) return null;

    const avatarUrl = await this.s3Service.getSignedUrl(user.avatarKey);

    return {
      ...user,
      avatarUrl,
    };
  }

  // Получение всех пользователей (для определения получателя)
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        name: true,
        isOnline: true,
      },
    });
  }
}
