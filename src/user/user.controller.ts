import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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

  @Post("avatar")
  @UseInterceptors(FileInterceptor("avatar"))
  async uploadAvatar(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    return this.userService.uploadAvatar(req.user.phone, file);
  }

  @Delete("avatar")
  async deleteAvatar(@Request() req) {
    return this.userService.deleteAvatar(req.user.phone);
  }
}
