import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { PushModule } from "./push/push.module";
import { UserModule } from "./user/user.module";
import { ConfigModule } from "@nestjs/config";
import authConfig from "./config/auth";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [authConfig],
    }),
    AuthModule,
    ChatModule,
    PushModule,
    UserModule,
  ],
})
export class AppModule {}
