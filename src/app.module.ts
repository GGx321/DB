import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { PushModule } from "./push/push.module";
import { UserModule } from "./user/user.module";
import { S3Module } from "./s3/s3.module";
import { ConfigModule } from "@nestjs/config";
import authConfig from "./config/auth";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      cache: true,
      load: [authConfig],
    }),
    S3Module,
    AuthModule,
    ChatModule,
    PushModule,
    UserModule,
  ],
})
export class AppModule {}
