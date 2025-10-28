import { Module, Global } from "@nestjs/common";
import { S3Service } from "./s3.service";

@Global() // Делаем глобальным, чтобы не импортировать в каждом модуле
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}

