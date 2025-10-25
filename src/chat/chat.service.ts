import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

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
        isOnline: true,
        lastSeen: true,
      },
    });

    return {
      messages: messages.reverse(),
      otherUser: otherUser || null,
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
    return this.prisma.user.update({
      where: { phone },
      data: {
        isOnline,
        lastSeen: new Date(),
      },
    });
  }

  // Получение статуса пользователя
  async getUserStatus(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        phone: true,
        name: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    return user;
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
