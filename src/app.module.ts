import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { PushModule } from "./push/push.module";

@Module({
  imports: [AuthModule, ChatModule, PushModule],
})
export class AppModule {}
