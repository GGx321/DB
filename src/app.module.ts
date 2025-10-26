import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { PushModule } from "./push/push.module";
import { ConfigModule } from "@nestjs/config";
@Module({
  imports: [
    AuthModule,
    ChatModule,
    PushModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
  ],
})
export class AppModule {}
