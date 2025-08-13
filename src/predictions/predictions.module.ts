import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Prediction, PredictionSchema } from './schema/prediction.schema';
import { PredictionsService } from './predictions.service';
import { PredictionsController } from './predictions.controller';
import { FootballApiService } from './football-api.service';

@Module({
  imports: [
    ConfigModule, // Ensure ConfigModule is imported for environment variables
    MongooseModule.forFeature([
      { name: Prediction.name, schema: PredictionSchema }
    ]),
    HttpModule.register({
      timeout: 10000, // 10 second timeout for HTTP requests
      maxRedirects: 5,
    }),
  ],
  controllers: [PredictionsController],
  providers: [PredictionsService, FootballApiService],
  exports: [PredictionsService], // Export service if needed by other modules
})
export class PredictionsModule {}