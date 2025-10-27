import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { PushModule } from "./push/push.module";
import { ConfigModule } from "@nestjs/config";
import authConfig from "./config/auth";

@Module({
  imports: [
    AuthModule,
    ChatModule,
    PushModule,
    ConfigModule.forRoot({ load: [authConfig] }),
  ],
})
export class AppModule {}
