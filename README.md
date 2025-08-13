# Football Predictions Backend API

A NestJS backend service that integrates with external football predictions APIs and provides filtered results showing matches where the home team has >50% win probability.

## Features

- Fetch football predictions from external APIs (with mock fallback)
- Filter matches by home team win probability (>50%)
- MongoDB caching for performance (2-hour cache TTL)
- Search/filter by team name
- Input validation and error handling
- RESTful API with clear response structure

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone https://github.com/OlawaleP/football-prediction
cd football-prediction
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `MONGODB_URI`: Your MongoDB connection string
- `RAPIDAPI_KEY`: Your external API key
- `RAPIDAPI_HOST`:  Your external API URL
- `BETMINER_BASE_URL`:  Your external API URL
- `FOOTBALL_API_URL`:  Your external API URL

3. **Start MongoDB:**
```bash
# If using local MongoDB
mongod
```

4. **Run the application:**
```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be running at `http://localhost:3001`

## API Endpoints

### Get Predictions

**GET** `/predictions?date=YYYY-MM-DD&team=optional`

**Parameters:**
- `date` (required): Date in YYYY-MM-DD format
- `team` (optional): Filter by team name (case-insensitive)

**Example Request:**
```bash
curl "http://localhost:3001/predictions?date=2025-08-12"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "homeTeam": "Manchester City",
      "awayTeam": "Liverpool",
      "homeWinChance": 65,
      "awayWinChance": 25,
      "drawChance": 10,
      "matchTime": "15:00",
      "competition": "Premier League",
      "date": "2025-08-12"
    }
  ],
  "count": 1,
  "date": "2025-08-12",
  "cached": false
}
```

### Health Check

**GET** `/predictions/health`

Returns API status and timestamp.

## Caching Strategy

- Predictions are cached in MongoDB for 2 hours
- Subsequent requests for the same date use cached data
- Cache is automatically invalidated after 2 hours
- Fresh API calls are made when cache expires

## Error Handling

The API includes comprehensive error handling:
- Input validation (invalid dates rejected)
- External API failure fallback
- Database connection error handling
- Detailed error responses with appropriate HTTP status codes

## Development

### Available Scripts

```bash
npm run start:dev     # Development mode with hot reload
npm run build         # Build for production
npm run start:prod    # Run production build
npm run test          # Run tests
npm run test:watch    # Run tests in watch mode
npm run lint          # Lint code
npm run format        # Format code with Prettier
```

### Adding External APIs

To integrate with real football prediction APIs:

1. Set your API credentials in `.env`
2. Update `football-api.service.ts` in the `getExternalPredictions` method
3. Adjust the API response mapping in the service

Popular APIs you can integrate:
- Football-Data.org
- Betfair Exchange API
- RapidAPI Football
- SportMonks

## Deployment

### Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

### Cloud Deployment

The application is ready for deployment to:
- Render

Make sure to set environment variables in your deployment platform.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
