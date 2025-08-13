import { Controller, Get, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PredictionsService, PredictionsResult } from './predictions.service';
import { PredictionResponseDto } from './dto/predictions.dto';

@ApiTags('Predictions')
@Controller('predictions')
export class PredictionsController {
  private readonly logger = new Logger(PredictionsController.name);

  constructor(private readonly predictionsService: PredictionsService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get football predictions for a specific date',
    description: 'Returns football match predictions with >50% home team win chance. Data is cached for 2 hours.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Predictions retrieved successfully',
    type: [PredictionResponseDto]
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid date format. Use YYYY-MM-DD format.'
  })
  @ApiQuery({ name: 'date', description: 'Date in YYYY-MM-DD format', example: '2025-08-14' })
  @ApiQuery({ name: 'teamFilter', description: 'Filter by team name (optional)', required: false })
  async getPredictions(
    @Query('date') date: string,
    @Query('teamFilter') teamFilter?: string,
  ): Promise<{
    data: PredictionResponseDto[];
    meta: {
      date: string;
      count: number;
      cached: boolean;
      filter?: string;
    };
  }> {
    try {
      if (!date) {
        throw new HttpException('Date parameter is required', HttpStatus.BAD_REQUEST);
      }

      if (!this.isValidDateFormat(date)) {
        throw new HttpException(
          'Invalid date format. Please use YYYY-MM-DD format.',
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`Getting predictions for date: ${date}${teamFilter ? `, team filter: ${teamFilter}` : ''}`);
      
      const result: PredictionsResult = await this.predictionsService.getPredictionsForDate(date, teamFilter);

      return {
        data: result.predictions,
        meta: {
          date,
          count: result.predictions.length,
          cached: result.cached,
          ...(teamFilter && { filter: teamFilter }),
        },
      };
    } catch (error) {
      this.logger.error('Error getting predictions:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve predictions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('all')
  @ApiOperation({ 
    summary: 'Get all football predictions for a specific date',
    description: 'Returns all football match predictions regardless of win percentage. Data is cached for 2 hours.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All predictions retrieved successfully',
    type: [PredictionResponseDto]
  })
  @ApiQuery({ name: 'date', description: 'Date in YYYY-MM-DD format', example: '2025-08-14' })
  @ApiQuery({ name: 'teamFilter', description: 'Filter by team name (optional)', required: false })
  async getAllPredictions(
    @Query('date') date: string,
    @Query('teamFilter') teamFilter?: string,
  ): Promise<{
    data: PredictionResponseDto[];
    meta: {
      date: string;
      count: number;
      cached: boolean;
      filter?: string;
    };
  }> {
    try {
      if (!date) {
        throw new HttpException('Date parameter is required', HttpStatus.BAD_REQUEST);
      }

      if (!this.isValidDateFormat(date)) {
        throw new HttpException(
          'Invalid date format. Please use YYYY-MM-DD format.',
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`Getting all predictions for date: ${date}${teamFilter ? `, team filter: ${teamFilter}` : ''}`);
      
      const result: PredictionsResult = await this.predictionsService.getAllPredictionsForDate(date, teamFilter);

      return {
        data: result.predictions,
        meta: {
          date,
          count: result.predictions.length,
          cached: result.cached,
          ...(teamFilter && { filter: teamFilter }),
        },
      };
    } catch (error) {
      this.logger.error('Error getting all predictions:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve all predictions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get prediction statistics for a specific date',
    description: 'Returns statistical summary of predictions including count by competition, win chance distribution, etc.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully'
  })
  @ApiQuery({ name: 'date', description: 'Date in YYYY-MM-DD format', example: '2025-08-14' })
  async getPredictionStats(
    @Query('date') date: string,
  ): Promise<{
    data: {
      totalMatches: number;
      highConfidenceMatches: number; // >70% home win chance
      mediumConfidenceMatches: number; // 50-70% home win chance
      competitionBreakdown: { [competition: string]: number };
      countryBreakdown: { [country: string]: number };
      averageHomeWinChance: number;
      oddsRange: {
        minHomeWinOdds: number;
        maxHomeWinOdds: number;
        avgHomeWinOdds: number;
      };
    };
    meta: {
      date: string;
      cached: boolean;
    };
  }> {
    try {
      if (!date) {
        throw new HttpException('Date parameter is required', HttpStatus.BAD_REQUEST);
      }

      if (!this.isValidDateFormat(date)) {
        throw new HttpException(
          'Invalid date format. Please use YYYY-MM-DD format.',
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`Getting prediction statistics for date: ${date}`);
      
      const result: PredictionsResult = await this.predictionsService.getAllPredictionsForDate(date);
      const predictions = result.predictions;

      const stats = this.calculatePredictionStats(predictions);

      return {
        data: stats,
        meta: {
          date,
          cached: result.cached,
        },
      };
    } catch (error) {
      this.logger.error('Error getting prediction statistics:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve prediction statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private calculatePredictionStats(predictions: PredictionResponseDto[]) {
    const totalMatches = predictions.length;
    const highConfidenceMatches = predictions.filter(p => p.homeWinChance > 70).length;
    const mediumConfidenceMatches = predictions.filter(p => p.homeWinChance >= 50 && p.homeWinChance <= 70).length;

    const competitionBreakdown: { [competition: string]: number } = {};
    predictions.forEach(p => {
      competitionBreakdown[p.competition] = (competitionBreakdown[p.competition] || 0) + 1;
    });

    const countryBreakdown: { [country: string]: number } = {};
    predictions.forEach(p => {
      if (p.country) {
        countryBreakdown[p.country] = (countryBreakdown[p.country] || 0) + 1;
      }
    });

    const averageHomeWinChance = totalMatches > 0 
      ? Math.round(predictions.reduce((sum, p) => sum + p.homeWinChance, 0) / totalMatches)
      : 0;

    const validOdds = predictions.filter(p => p.homeWinOdds && p.homeWinOdds > 0);
    const oddsRange = validOdds.length > 0 ? {
      minHomeWinOdds: Math.min(...validOdds.map(p => p.homeWinOdds!)),
      maxHomeWinOdds: Math.max(...validOdds.map(p => p.homeWinOdds!)),
      avgHomeWinOdds: Number((validOdds.reduce((sum, p) => sum + p.homeWinOdds!, 0) / validOdds.length).toFixed(2)),
    } : {
      minHomeWinOdds: 0,
      maxHomeWinOdds: 0,
      avgHomeWinOdds: 0,
    };

    return {
      totalMatches,
      highConfidenceMatches,
      mediumConfidenceMatches,
      competitionBreakdown,
      countryBreakdown,
      averageHomeWinChance,
      oddsRange,
    };
  }

  private isValidDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }

    const parsedDate = new Date(date);
    const [year, month, day] = date.split('-').map(Number);
    
    return parsedDate.getFullYear() === year &&
           parsedDate.getMonth() === month - 1 &&
           parsedDate.getDate() === day;
  }
}