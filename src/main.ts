import { NestFactory } from "@nestjs/core";
import { NestApplicationOptions, ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import * as fs from "fs";

function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    console.log(`[OK] File exists: ${filePath}`);
    return true;
  } catch {
    console.error(`[MISSING] File not found: ${filePath}`);
    return false;
  }
}

const PRIVATE_KEY_PATH = process.env.SSL_PRIVATE_KEY;
const PUBLIC_CERTIFICATE_PATH = process.env.SSL_PUBLIC_CERTIFICATE;

async function bootstrap() {
  const options: NestApplicationOptions = {};
  if (fileExists(PRIVATE_KEY_PATH) && fileExists(PUBLIC_CERTIFICATE_PATH)) {
    options.httpsOptions = {
      key: fs.readFileSync(PRIVATE_KEY_PATH),
      cert: fs.readFileSync(PUBLIC_CERTIFICATE_PATH),
    };
  }
  const app = await NestFactory.create(AppModule);
  // Enable CORS
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : true;
  console.log(allowedOrigins);
  app.enableCors({
    origin: allowedOrigins,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT || 3005;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
