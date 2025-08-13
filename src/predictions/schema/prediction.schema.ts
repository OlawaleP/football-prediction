// dto/predictions.dto.ts
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PredictionResponseDto {
  @ApiProperty({ description: 'Home team name' })
  @IsString()
  homeTeam: string;

  @ApiProperty({ description: 'Away team name' })
  @IsString()
  awayTeam: string;

  @ApiProperty({ description: 'Home team win percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  homeWinChance: number;

  @ApiProperty({ description: 'Away team win percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  awayWinChance: number;

  @ApiProperty({ description: 'Draw percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  drawChance: number;

  @ApiProperty({ description: 'Match time in HH:MM format' })
  @IsString()
  matchTime: string;

  @ApiProperty({ description: 'Competition/League name' })
  @IsString()
  competition: string;

  @ApiProperty({ description: 'Match date' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ description: 'Country where the match is played' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Home team win odds (decimal)' })
  @IsOptional()
  @IsNumber()
  homeWinOdds?: number;

  @ApiPropertyOptional({ description: 'Away team win odds (decimal)' })
  @IsOptional()
  @IsNumber()
  awayWinOdds?: number;

  @ApiPropertyOptional({ description: 'Draw odds (decimal)' })
  @IsOptional()
  @IsNumber()
  drawOdds?: number;
}

export class GetPredictionsQueryDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ description: 'Filter by team name (partial match)' })
  @IsOptional()
  @IsString()
  teamFilter?: string;

  @ApiPropertyOptional({ description: 'Include all predictions, not just >50% home win chance', default: false })
  @IsOptional()
  includeAll?: boolean;
}

// schema/prediction.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PredictionDocument = Prediction & Document;

@Schema({ timestamps: true })
export class Prediction {
  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  homeTeam: string;

  @Prop({ required: true })
  awayTeam: string;

  @Prop({ required: true, min: 0, max: 100 })
  homeWinChance: number;

  @Prop({ required: true, min: 0, max: 100 })
  awayWinChance: number;

  @Prop({ required: true, min: 0, max: 100 })
  drawChance: number;

  @Prop({ required: true })
  matchTime: string;

  @Prop({ required: true })
  competition: string;

  @Prop()
  country?: string;

  @Prop()
  homeWinOdds?: number;

  @Prop()
  awayWinOdds?: number;

  @Prop()
  drawOdds?: number;

  @Prop({ default: 'betminer' })
  apiSource: string;

  @Prop({ required: true, default: Date.now })
  cachedAt: Date;

  // Index for efficient querying
  @Prop({ index: true })
  dateIndex?: string;
}

export const PredictionSchema = SchemaFactory.createForClass(Prediction);

// Create compound indexes for better performance
PredictionSchema.index({ date: 1, cachedAt: -1 });
PredictionSchema.index({ date: 1, homeWinChance: -1 });
PredictionSchema.index({ homeTeam: 'text', awayTeam: 'text' });