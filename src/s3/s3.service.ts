import { Injectable, Logger } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3: S3Client;
  private bucket: string;
  private cloudFrontDomain: string | undefined;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION || "eu-north-1",
      // AWS SDK автоматически использует IAM роль EC2 instance
    });

    this.bucket = process.env.AWS_S3_BUCKET!;
    this.cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

    if (!this.bucket) {
      this.logger.warn(
        "AWS_S3_BUCKET не настроен! Загрузка аватарок не будет работать."
      );
    } else {
      this.logger.log(`S3 Service инициализирован. Bucket: ${this.bucket}`);
      if (this.cloudFrontDomain) {
        this.logger.log(`CloudFront CDN: ${this.cloudFrontDomain}`);
      }
    }
  }

  /**
   * Загружает аватарку в S3
   * @param userId ID пользователя
   * @param file Файл загруженный через Multer
   * @returns Ключ файла в S3
   */
  async uploadAvatar(
    userId: number,
    file: Express.Multer.File
  ): Promise<string> {
    const extension = file.originalname.split(".").pop();
    const key = `avatars/${userId}-${Date.now()}.${extension}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          // Метаданные для удобства
          Metadata: {
            userId: userId.toString(),
            uploadedAt: new Date().toISOString(),
          },
        })
      );

      this.logger.log(`Аватарка загружена: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Ошибка загрузки аватарки: ${error.message}`);
      throw error;
    }
  }

  /**
   * Удаляет файл из S3
   * @param key Ключ файла в S3
   */
  async deleteFile(key: string): Promise<void> {
    if (!key) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      this.logger.log(`Файл удален: ${key}`);
    } catch (error) {
      this.logger.error(`Ошибка удаления файла ${key}: ${error.message}`);
      // Не бросаем ошибку, чтобы не блокировать операцию
    }
  }

  /**
   * Генерирует временную ссылку для доступа к файлу (15 минут)
   * @param key Ключ файла в S3
   * @returns Presigned URL (через CloudFront если настроен)
   */
  async getSignedUrl(key: string | null): Promise<string | null> {
    if (!key) return null;

    try {
      // Генерируем presigned URL для S3
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      // Ссылка действительна 15 минут
      let url = await getSignedUrl(this.s3, command, { expiresIn: 900 });

      // Если настроен CloudFront - заменяем S3 хост на CloudFront домен
      if (this.cloudFrontDomain && url) {
        // Заменяем S3 URL на CloudFront URL, сохраняя query параметры (подпись)
        const urlObj = new URL(url);
        urlObj.hostname = this.cloudFrontDomain;
        url = urlObj.toString();
      }

      return url;
    } catch (error) {
      this.logger.error(`Ошибка генерации URL для ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Генерирует временные ссылки для массива ключей
   * @param keys Массив ключей файлов в S3
   * @returns Объект { key: url }
   */
  async getSignedUrls(
    keys: (string | null)[]
  ): Promise<Record<string, string | null>> {
    const urls: Record<string, string | null> = {};

    await Promise.all(
      keys.map(async (key) => {
        if (key) {
          urls[key] = await this.getSignedUrl(key);
        }
      })
    );

    return urls;
  }
}
