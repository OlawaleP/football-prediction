import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PredictionResponseDto } from './dto/predictions.dto';
import { Prediction, PredictionDocument } from './schema/prediction.schema';
import { FootballApiService } from './football-api.service';

export interface PredictionsResult {
  predictions: PredictionResponseDto[];
  cached: boolean;
}

@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    @InjectModel(Prediction.name)
    private predictionModel: Model<PredictionDocument>,
    private footballApiService: FootballApiService,
  ) {}

  async getPredictionsForDate(date: string, teamFilter?: string): Promise<PredictionsResult> {
    this.logger.log(`Fetching predictions for date: ${date}`);

    // Check cache first (data cached within last 2 hours)
    const cacheThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const cachedPredictions = await this.predictionModel
      .find({
        date,
        cachedAt: { $gte: cacheThreshold },
      })
      .exec();

    if (cachedPredictions.length > 0) {
      this.logger.log(`Found ${cachedPredictions.length} cached predictions for ${date}`);
      const filteredPredictions = this.filterAndTransformPredictions(cachedPredictions, teamFilter);
      return {
        predictions: filteredPredictions,
        cached: true,
      };
    }

    // Fetch fresh data from Betminer API
    this.logger.log(`No cached data found, fetching from Betminer API for ${date}`);
    const apiPredictions = await this.footballApiService.getPredictions(date);
    console.log(`Fetched ${apiPredictions.length} predictions from Betminer API for ${date}`);

    // Save to cache
    if (apiPredictions.length > 0) {
      await this.cacheApiPredictions(apiPredictions, date);
    }

    // Filter predictions where home team has >50% win chance
    const filteredPredictions = this.filterPredictionsByHomeWinChance(apiPredictions);
    const transformedPredictions = this.transformApiToDto(filteredPredictions);
    
    // Apply team filter if provided
    const finalPredictions = teamFilter 
      ? transformedPredictions.filter(p => 
          p.homeTeam.toLowerCase().includes(teamFilter.toLowerCase()) ||
          p.awayTeam.toLowerCase().includes(teamFilter.toLowerCase())
        )
      : transformedPredictions;

    this.logger.log(`Returning ${finalPredictions.length} filtered predictions for ${date}`);
    
    return {
      predictions: finalPredictions,
      cached: false,
    };
  }

  private filterAndTransformPredictions(predictions: PredictionDocument[], teamFilter?: string): PredictionResponseDto[] {
    let filtered = predictions.filter(p => p.homeWinChance > 50);
    
    if (teamFilter) {
      filtered = filtered.filter(p => 
        p.homeTeam.toLowerCase().includes(teamFilter.toLowerCase()) ||
        p.awayTeam.toLowerCase().includes(teamFilter.toLowerCase())
      );
    }

    return filtered.map(p => ({
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      homeWinChance: p.homeWinChance,
      awayWinChance: p.awayWinChance,
      drawChance: p.drawChance,
      matchTime: p.matchTime,
      competition: p.competition,
      date: p.date,
      country: p.country,
      homeWinOdds: p.homeWinOdds,
      awayWinOdds: p.awayWinOdds,
      drawOdds: p.drawOdds,
    }));
  }

  private filterPredictionsByHomeWinChance(predictions: any[]): any[] {
    const filtered = predictions.filter(prediction => {
      const homeWinChance = prediction.homeWinChance || 0;
      const isValid = homeWinChance > 50;
      
      if (!isValid) {
        this.logger.debug(`Filtering out ${prediction.homeTeam} vs ${prediction.awayTeam} - Home win chance: ${homeWinChance}%`);
      }
      
      return isValid;
    });

    this.logger.log(`Filtered ${predictions.length} predictions down to ${filtered.length} with >50% home win chance`);
    return filtered;
  }

  private transformApiToDto(apiPredictions: any[]): PredictionResponseDto[] {
    return apiPredictions.map(prediction => ({
      homeTeam: prediction.homeTeam || 'Unknown Home',
      awayTeam: prediction.awayTeam || 'Unknown Away',
      homeWinChance: prediction.homeWinChance || 0,
      awayWinChance: prediction.awayWinChance || 0,
      drawChance: prediction.drawChance || 0,
      matchTime: prediction.matchTime || '00:00',
      competition: prediction.competition || 'Unknown League',
      date: prediction.date,
      country: prediction.country,
      homeWinOdds: prediction.homeWinOdds,
      awayWinOdds: prediction.awayWinOdds,
      drawOdds: prediction.drawOdds,
    }));
  }

  private async cacheApiPredictions(predictions: any[], date: string): Promise<void> {
    try {
      // Remove old cache for this date
      await this.predictionModel.deleteMany({ date }).exec();

      // Save new predictions to cache
      const predictionDocs = predictions.map(prediction => ({
        date,
        homeTeam: prediction.homeTeam || 'Unknown Home',
        awayTeam: prediction.awayTeam || 'Unknown Away',
        homeWinChance: prediction.homeWinChance || 0,
        awayWinChance: prediction.awayWinChance || 0,
        drawChance: prediction.drawChance || 0,
        matchTime: prediction.matchTime || '00:00',
        competition: prediction.competition || 'Unknown League',
        country: prediction.country,
        homeWinOdds: prediction.homeWinOdds,
        awayWinOdds: prediction.awayWinOdds,
        drawOdds: prediction.drawOdds,
        apiSource: 'betminer',
        cachedAt: new Date(),
      }));

      await this.predictionModel.insertMany(predictionDocs);
      this.logger.log(`Cached ${predictionDocs.length} predictions for ${date}`);
    } catch (error) {
      this.logger.error('Error caching predictions:', error);
    }
  }

  // Additional method to get all predictions (not just >50% home win chance)
  async getAllPredictionsForDate(date: string, teamFilter?: string): Promise<PredictionsResult> {
    this.logger.log(`Fetching ALL predictions for date: ${date}`);

    // Check cache first
    const cacheThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const cachedPredictions = await this.predictionModel
      .find({
        date,
        cachedAt: { $gte: cacheThreshold },
      })
      .exec();

    if (cachedPredictions.length > 0) {
      this.logger.log(`Found ${cachedPredictions.length} cached predictions for ${date}`);
      let filtered = cachedPredictions;
      
      if (teamFilter) {
        filtered = filtered.filter(p => 
          p.homeTeam.toLowerCase().includes(teamFilter.toLowerCase()) ||
          p.awayTeam.toLowerCase().includes(teamFilter.toLowerCase())
        );
      }

      const transformedPredictions = filtered.map(p => ({
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        homeWinChance: p.homeWinChance,
        awayWinChance: p.awayWinChance,
        drawChance: p.drawChance,
        matchTime: p.matchTime,
        competition: p.competition,
        date: p.date,
        country: p.country,
        homeWinOdds: p.homeWinOdds,
        awayWinOdds: p.awayWinOdds,
        drawOdds: p.drawOdds,
      }));

      return {
        predictions: transformedPredictions,
        cached: true,
      };
    }

    // Fetch fresh data
    const apiPredictions = await this.footballApiService.getPredictions(date);

    if (apiPredictions.length > 0) {
      await this.cacheApiPredictions(apiPredictions, date);
    }

    const transformedPredictions = this.transformApiToDto(apiPredictions);
    
    // Apply team filter if provided
    const finalPredictions = teamFilter 
      ? transformedPredictions.filter(p => 
          p.homeTeam.toLowerCase().includes(teamFilter.toLowerCase()) ||
          p.awayTeam.toLowerCase().includes(teamFilter.toLowerCase())
        )
      : transformedPredictions;

    return {
      predictions: finalPredictions,
      cached: false,
    };
  }
}