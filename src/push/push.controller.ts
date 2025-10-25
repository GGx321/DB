import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { PushService } from "./push.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("push")
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post("subscribe")
  async subscribe(@Request() req, @Body() subscription: any) {
    await this.pushService.savePushSubscription(req.user.phone, subscription);
    return { success: true, message: "Push subscription saved" };
  }

  @Delete("unsubscribe")
  async unsubscribe(@Request() req) {
    await this.pushService.removePushSubscription(req.user.phone);
    return { success: true, message: "Push subscription removed" };
  }
}
