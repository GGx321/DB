import { Controller, Get, Put, Body, UseGuards, Request } from "@nestjs/common";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("user")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  async getCurrentUser(@Request() req) {
    return this.userService.getCurrentUser(req.user.phone);
  }

  @Put("me")
  async updateCurrentUser(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.userService.updateCurrentUser(req.user.phone, updateUserDto);
  }
}
