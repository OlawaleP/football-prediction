import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface BetminerMatch {
  details: {
    id: number;
    date: string;
    homeID: number;
    homeTeam: string;
    homeLogo: string;
    awayID: number;
    awayTeam: string;
    awayLogo: string;
    country: string;
    countryCode: string;
    competition: string;
    competition_id: number;
    competition_full: string;
  };
  outcome: {
    status: string;
    home_goals: number;
    away_goals: number;
  };
  predictions: string[];
  predictions_conf: {
    [key: string]: string;
  };
  odds: {
    home_win_odds: string;
    away_win_odds: string;
    draw_odds: string;
    "1x_odds": string;
    "12_odds": string;
    "2x_odds": string;
    btts_yes_odds: string;
    btts_no_odds: string;
  };
  form: {
    bttshomeform: string;
    bttsawayform: string;
    homeform: string;
    awayform: string;
  };
}

interface TransformedPrediction {
  homeTeam: string;
  awayTeam: string;
  homeWinChance: number;
  awayWinChance: number;
  drawChance: number;
  matchTime: string;
  competition: string;
  date: string;
  country?: string;
  homeWinOdds?: number;
  awayWinOdds?: number;
  drawOdds?: number;
}

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);
  private readonly mockMode: boolean;
  private readonly rapidApiKey: string;
  private readonly rapidApiHost = 'betminer.p.rapidapi.com';
  private readonly baseUrl = 'https://betminer.p.rapidapi.com/bm/predictions/arrays';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.rapidApiKey = this.configService.get('RAPIDAPI_KEY');
    this.mockMode = !this.rapidApiKey;
    
    if (this.mockMode) {
      this.logger.warn('Running in MOCK MODE - no RAPIDAPI_KEY provided');
    } else {
      this.logger.log('Betminer API service initialized');
    }
  }

  async getPredictions(date: string): Promise<TransformedPrediction[]> {
    if (this.mockMode) {
      return this.getMockPredictions(date);
    }

    return this.getBetminerPredictions(date);
  }

  private async getBetminerPredictions(date: string): Promise<TransformedPrediction[]> {
    try {
      // Betminer API expects dateFrom and dateTo, so we use the same date for both
      const url = `${this.baseUrl}/${date}/${date}`;
      
      this.logger.log(`Fetching predictions from Betminer for date: ${date}`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'x-rapidapi-key': this.rapidApiKey,
            'x-rapidapi-host': this.rapidApiHost,
          },
          timeout: 10000, // 10 second timeout
        })
      );

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Invalid response format from Betminer API');
        return this.getMockPredictions(date);
      }

      const betminerMatches: BetminerMatch[] = response.data;
      this.logger.log(`Fetched ${betminerMatches.length} matches from Betminer API`);

      return this.transformBetminerData(betminerMatches);
    } catch (error) {
      this.logger.error('Error fetching from Betminer API:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      
      // Fallback to mock data on API error
      this.logger.warn('Falling back to mock data due to API error');
      return this.getMockPredictions(date);
    }
  }

  private transformBetminerData(betminerMatches: BetminerMatch[]): TransformedPrediction[] {
    return betminerMatches.map(match => {
      // Calculate win percentages from odds using implied probability
      const homeWinChance = this.calculateWinChanceFromOdds(match.odds.home_win_odds) || 
                           this.parseConfidence(match.predictions_conf.HOME_WIN) || 0;
      
      const awayWinChance = this.calculateWinChanceFromOdds(match.odds.away_win_odds) || 
                           this.parseConfidence(match.predictions_conf.AWAY_WIN) || 0;
      
      const drawChance = this.calculateWinChanceFromOdds(match.odds.draw_odds) || 
                        this.parseConfidence(match.predictions_conf.DRAW) || 0;

      // Extract time from date string (format: "2025-08-14 00:00:00")
      const matchTime = this.extractTimeFromDate(match.details.date);

      return {
        homeTeam: match.details.homeTeam,
        awayTeam: match.details.awayTeam,
        homeWinChance,
        awayWinChance,
        drawChance,
        matchTime,
        competition: match.details.competition_full || match.details.competition,
        date: match.details.date.split(' ')[0], // Extract date part
        country: match.details.country,
        homeWinOdds: parseFloat(match.odds.home_win_odds) || undefined,
        awayWinOdds: parseFloat(match.odds.away_win_odds) || undefined,
        drawOdds: parseFloat(match.odds.draw_odds) || undefined,
      };
    }).filter(prediction => {
      // Filter out invalid predictions
      return prediction.homeTeam && prediction.awayTeam && prediction.homeWinChance > 0;
    });
  }

  private calculateWinChanceFromOdds(oddsString: string): number | null {
    const odds = parseFloat(oddsString);
    if (isNaN(odds) || odds <= 0) return null;
    
    // Convert odds to implied probability percentage
    // Implied probability = (1 / decimal odds) × 100
    return Math.round((1 / odds) * 100);
  }

  private parseConfidence(confidenceString: string): number | null {
    if (!confidenceString) return null;
    const confidence = parseFloat(confidenceString);
    return isNaN(confidence) ? null : Math.round(confidence);
  }

  private extractTimeFromDate(dateString: string): string {
    try {
      // Format: "2025-08-14 00:00:00"
      const parts = dateString.split(' ');
      if (parts.length >= 2) {
        const timePart = parts[1].substring(0, 5); // Get HH:MM
        return timePart;
      }
    } catch (error) {
      this.logger.warn(`Could not extract time from date: ${dateString}`);
    }
    return '00:00';
  }

  private getMockPredictions(date: string): TransformedPrediction[] {
    // Enhanced mock data that matches the Betminer format
    const mockPredictions: TransformedPrediction[] = [
      {
        homeTeam: 'Real Soacha',
        awayTeam: 'Deportes Tolima',
        homeWinChance: 21, // Calculated from odds 4.75
        awayWinChance: 62, // Calculated from odds 1.60
        drawChance: 26,    // Calculated from odds 3.90
        matchTime: '00:00',
        competition: 'Colombia Copa Colombia',
        date,
        country: 'Colombia',
        homeWinOdds: 4.75,
        awayWinOdds: 1.60,
        drawOdds: 3.90,
      },
      {
        homeTeam: 'Deportivo Cali',
        awayTeam: 'Union Magdalena',
        homeWinChance: 56, // Calculated from odds 1.80
        awayWinChance: 18, // Calculated from odds 5.50
        drawChance: 32,    // Calculated from odds 3.10
        matchTime: '00:30',
        competition: 'Colombia Primera A',
        date,
        country: 'Colombia',
        homeWinOdds: 1.80,
        awayWinOdds: 5.50,
        drawOdds: 3.10,
      },
      {
        homeTeam: 'América W',
        awayTeam: 'Puebla W',
        homeWinChance: 99, // Calculated from odds 1.01
        awayWinChance: 1,  // Calculated from odds 67.00
        drawChance: 3,     // Calculated from odds 29.00
        matchTime: '01:00',
        competition: 'Mexico Liga MX Femenil',
        date,
        country: 'Mexico',
        homeWinOdds: 1.01,
        awayWinOdds: 67.00,
        drawOdds: 29.00,
      },
      {
        homeTeam: 'Toluca W',
        awayTeam: 'Guadalajara W',
        homeWinChance: 40, // Calculated from odds 2.50
        awayWinChance: 38, // Calculated from odds 2.60
        drawChance: 31,    // Calculated from odds 3.25
        matchTime: '01:00',
        competition: 'Mexico Liga MX Femenil',
        date,
        country: 'Mexico',
        homeWinOdds: 2.50,
        awayWinOdds: 2.60,
        drawOdds: 3.25,
      },
      {
        homeTeam: 'Santa Fe',
        awayTeam: 'Millonarios',
        homeWinChance: 36, // Calculated from odds 2.80
        awayWinChance: 36, // Calculated from odds 2.75
        drawChance: 34,    // Calculated from odds 2.90
        matchTime: '01:30',
        competition: 'Colombia Primera A',
        date,
        country: 'Colombia',
        homeWinOdds: 2.80,
        awayWinOdds: 2.75,
        drawOdds: 2.90,
      },
    ];

    this.logger.log(`Generated ${mockPredictions.length} mock predictions for ${date}`);
    return mockPredictions;
  }
}