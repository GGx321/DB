import { Injectable, Logger } from "@nestjs/common";
import * as webPush from "web-push";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {
    // Настраиваем VAPID ключи
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webPush.setVapidDetails(
        process.env.VAPID_EMAIL || "mailto:support@yourapp.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    } else {
      this.logger.warn(
        "VAPID keys not configured. Push notifications will not work."
      );
    }
  }

  async savePushSubscription(phone: string, subscription: any) {
    try {
      await this.prisma.user.update({
        where: { phone },
        data: {
          pushSubscription: JSON.stringify(subscription),
        },
      });
      this.logger.log(`Push subscription saved for ${phone}`);
    } catch (error) {
      this.logger.error(`Error saving push subscription: ${error.message}`);
      throw error;
    }
  }

  async removePushSubscription(phone: string) {
    try {
      await this.prisma.user.update({
        where: { phone },
        data: {
          pushSubscription: null,
        },
      });
      this.logger.log(`Push subscription removed for ${phone}`);
    } catch (error) {
      this.logger.error(`Error removing push subscription: ${error.message}`);
      throw error;
    }
  }

  async sendPushNotification(
    recipientPhone: string,
    payload: {
      title: string;
      body: string;
      icon?: string;
      data?: any;
    }
  ) {
    try {
      // Получаем push-подписку получателя
      const recipient = await this.prisma.user.findUnique({
        where: { phone: recipientPhone },
        select: { pushSubscription: true, isOnline: true },
      });

      // Не отправляем push если пользователь онлайн (получит через WebSocket)
      if (!recipient || !recipient.pushSubscription || recipient.isOnline) {
        return;
      }

      const subscription = JSON.parse(recipient.pushSubscription);

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/kitty-logo-ios.jpg",
        badge: "/kitty-logo-ios.jpg",
        data: {
          url: "/chat",
          ...payload.data,
        },
      });

      await webPush.sendNotification(subscription, notificationPayload);
      this.logger.log(`Push notification sent to ${recipientPhone}`);
    } catch (error) {
      this.logger.error(
        `Error sending push notification: ${error.message}`,
        error.stack
      );

      // Если подписка невалидна (410 Gone), удаляем её
      if (error.statusCode === 410) {
        await this.removePushSubscription(recipientPhone);
      }
    }
  }
}
