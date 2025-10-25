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

  async getMessages(limit: number = 50) {
    return this.prisma.message.findMany({
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
}
