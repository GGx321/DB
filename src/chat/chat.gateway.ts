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

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const phone = this.connectedUsers.get(client.id);
    if (phone) {
      console.log(`User ${phone} disconnected`);
      this.connectedUsers.delete(client.id);
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
    
    // Отправляем подтверждение
    client.emit("authenticated", { success: true });
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

