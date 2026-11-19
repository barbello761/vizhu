import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from '../app.module';
import { createOpenApiDocument } from './document';

/** Снимок спецификации в корне репозитория — рядом с api/, front/, infra/. */
const OUTPUT = resolve(__dirname, '../../../vizhu.api.json');

/**
 * Выгружает OpenAPI в vizhu.api.json, не поднимая сервер.
 *
 * preview: true собирает граф модулей без создания провайдеров — не нужны
 * ни база, ни Redis, ни ключи LiveKit/Postbox. Документу хватает метаданных
 * контроллеров, инстансы ему не нужны.
 */
const run = async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { preview: true, logger: ['error', 'warn'] },
  );
  const document = createOpenApiDocument(app);
  writeFileSync(OUTPUT, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  console.log(
    `OpenAPI → ${OUTPUT} (${Object.keys(document.paths).length} путей)`,
  );
};

void run();
