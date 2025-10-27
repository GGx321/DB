import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromHandshake(client);
    console.log("token extracted successfully", token);
    if (!token) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          process.env.JWT_SECRET || "your-secret-key-change-in-production",
      });
      console.log("payload verified successfully", payload);
      // Добавляем payload в данные сокета
      client.data.user = payload;
      return true;
    } catch {
      console.log("payload verification failed");
      return false;
    }
  }

  private extractTokenFromHandshake(client: Socket): string | undefined {
    const token =
      client.handshake.auth?.token || client.handshake.headers?.authorization;

    if (!token) {
      return undefined;
    }

    // Если токен в формате "Bearer TOKEN"
    if (token.startsWith("Bearer ")) {
      return token.substring(7);
    }

    return token;
  }
}
