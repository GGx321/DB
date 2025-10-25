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

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> phone

  constructor(private chatService: ChatService) {}

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
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("authenticate")
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { phone: string }
  ) {
    this.connectedUsers.set(client.id, data.phone);
    console.log(`User authenticated: ${data.phone}`);

    // Обновляем статус на онлайн
    const user = await this.chatService.setUserOnline(data.phone, true);

    // Отправляем подтверждение
    client.emit("authenticated", { success: true });

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
