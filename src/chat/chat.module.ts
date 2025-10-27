import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { PrismaService } from "../prisma.service";
import { PushModule } from "../push/push.module";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        console.log("jwt.secret", configService.get("jwt.secret"));
        return {
          secret: configService.get("jwt.secret"),
          signOptions: { expiresIn: configService.get("jwt.expiresIn") },
        };
      },
      inject: [ConfigService],
    }),
    PushModule,
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, PrismaService, ConfigService],
})
export class ChatModule {}
