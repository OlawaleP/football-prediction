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
    ConfigModule, 
    MongooseModule.forFeature([
      { name: Prediction.name, schema: PredictionSchema }
    ]),
    HttpModule.register({
      timeout: 10000, 
      maxRedirects: 5,
    }),
  ],
  controllers: [PredictionsController],
  providers: [PredictionsService, FootballApiService],
  exports: [PredictionsService], 
})
export class PredictionsModule {}