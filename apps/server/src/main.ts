import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const webOrigin = process.env.WEB_ORIGIN;
  // docker compose / dev 下常見情境：前端可能從 http://<主機IP>:3003 進來，
  // 這時若寫死 localhost 會被 CORS 擋。未設定 WEB_ORIGIN 時，採「動態回應 Origin」策略。
  app.enableCors({
    origin: webOrigin?.trim() ? webOrigin.trim() : true,
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 3004);
  await app.listen(port);
  Logger.log(
    `後端已就緒 → http://localhost:${port}（WebSocket namespace /planning-poker）`,
    'Bootstrap',
  );
}
bootstrap();
