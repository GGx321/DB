import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { WsJwtGuard } from "./ws-jwt.guard";
import { PushService } from "../push/push.service";

@WebSocketGateway(3000, {
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true,
  },
  transports: ["websocket", "polling"],
  path: "/socket.io/",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> phone

  constructor(
    private chatService: ChatService,
    private pushService: PushService
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const phone = this.connectedUsers.get(client.id);
    if (phone) {
      console.log(`User ${phone} disconnected`);
      this.connectedUsers.delete(client.id);

      // Обновляем статус на оффлайн
      const user = await this.chatService.setUserOnline(phone, false);

      // Отправляем всем что пользователь оффлайн
      this.server.emit("userStatusChanged", {
        phone: user.phone,
        name: user.name,
        isOnline: false,
        lastSeen: user.lastSeen,
      });
    } else {
      console.warn(`User ${client.id} not found in connectedUsers`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("authenticate")
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { phone: string }
  ) {
    this.connectedUsers.set(client.id, data.phone);
    console.log(`User authenticating: ${data.phone}`);

    // Обновляем статус на онлайн
    const user = await this.chatService.setUserOnline(data.phone, true);
    console.log(`User set online: ${user.phone}`);

    // Отправляем подтверждение
    client.emit("authenticated", { success: true });
    console.log(`Confirmation sent: ${client.id}`);

    // Отправляем всем что пользователь онлайн
    this.server.emit("userStatusChanged", {
      phone: user.phone,
      name: user.name,
      isOnline: true,
      lastSeen: null,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("sendMessage")
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; phone: string }
  ) {
    const { text, phone } = data;

    // Сохраняем сообщение в БД
    const message = await this.chatService.createMessage(phone, text);

    // Отправляем всем подключенным клиентам
    this.server.emit("newMessage", {
      id: message.id,
      text: message.text,
      phone: message.user.phone,
      name: message.user.name,
      createdAt: message.createdAt,
    });

    // Отправляем push-уведомление получателю (если он оффлайн)
    const allUsers = await this.chatService.getAllUsers();
    const recipient = allUsers.find((u) => u.phone !== phone);

    if (recipient) {
      await this.pushService.sendPushNotification(recipient.phone, {
        title: `Новое сообщение от ${message.user.name}`,
        body: text.substring(0, 100),
        data: {
          messageId: message.id,
          senderPhone: phone,
          senderName: message.user.name,
        },
      });
    }

    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("typing")
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { phone: string; isTyping: boolean }
  ) {
    // Уведомляем всех кроме отправителя
    client.broadcast.emit("userTyping", {
      phone: data.phone,
      isTyping: data.isTyping,
    });
  }
}
