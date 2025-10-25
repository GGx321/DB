import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("messages")
  async getMessages(@Request() req, @Query("limit") limit?: string) {
    const result = await this.chatService.getMessages(
      req.user.phone,
      limit ? parseInt(limit) : 50
    );
    return result;
  }

  @Get("messages/after/:lastMessageId")
  async getMessagesAfter(
    @Param("lastMessageId", ParseIntPipe) lastMessageId: number,
    @Query("limit") limit?: string
  ) {
    return this.chatService.getMessagesAfter(
      lastMessageId,
      limit ? parseInt(limit) : 50
    );
  }

  @Delete("messages/:id")
  async deleteMessage(
    @Param("id", ParseIntPipe) messageId: number,
    @Request() req
  ) {
    await this.chatService.deleteMessage(messageId, req.user.phone);
    return { success: true };
  }
}
