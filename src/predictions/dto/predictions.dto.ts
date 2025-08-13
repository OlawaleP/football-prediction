import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetPredictionsDto {
  @IsDateString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (value && typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return value;
  })
  date: string;

  @IsOptional()
  @IsString()
  team?: string;
}

export class PredictionResponseDto {
  homeTeam: string;
  awayTeam: string;
  homeWinChance: number;
  awayWinChance?: number;
  drawChance?: number;
  matchTime?: string;
  competition?: string;
  date: string;
  country?: string;
  homeWinOdds?: number;
  awayWinOdds?: number;
}

export class PredictionsResponseDto {
  success: boolean;
  data: PredictionResponseDto[];
  count: number;
  date: string;
  cached: boolean;
  message?: string;
}