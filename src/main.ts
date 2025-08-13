import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend integration
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://ftbpredict.netlify.app'
  ],
  credentials: true,
});

  // Enable global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Football Predictions API running on port ${port}`);
}

bootstrap();