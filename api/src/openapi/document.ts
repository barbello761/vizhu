import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

/**
 * Единственное место, где описан OpenAPI-документ: его отдаёт /docs у
 * запущенного API и его же выгружает в репозиторий `npm run openapi:export`.
 */
export const createOpenApiDocument = (app: INestApplication): OpenAPIObject =>
  SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('ВИЖУ API')
      .setDescription('API для сервиса помощи незрячим пользователям')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build(),
  );
