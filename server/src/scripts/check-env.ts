import * as dotenv from 'dotenv';

// Load env first
dotenv.config();

console.log('=== Environment Variables Check ===\n');
console.log('PORT:', process.env.PORT);
console.log('FOOTBALL_API_KEY exists:', !!process.env.FOOTBALL_API_KEY);
console.log('FOOTBALL_API_KEY length:', process.env.FOOTBALL_API_KEY?.length);
console.log('FOOTBALL_API_URL:', process.env.FOOTBALL_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

console.log('\n=== Testing Axios with current env ===\n');

import axios from 'axios';

const client = axios.create({
  baseURL: process.env.FOOTBALL_API_URL || 'https://v3.football.api-sports.io',
  headers: {
    'x-apisports-key': process.env.FOOTBALL_API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
  }
});

// Test team endpoint
client.get('/teams', {
  params: { league: 39, season: 2023 }
})
.then(response => {
  console.log('✅ Teams endpoint - Status:', response.status);
  console.log('Teams found:', response.data.response?.length || 0);
})
.catch(error => {
  console.log('❌ Teams endpoint - Status:', error.response?.status);
  console.log('Error:', error.response?.data?.message || error.message);
});

// Test squad endpoint
client.get('/players/squads', {
  params: { team: 33 }
})
.then(response => {
  console.log('\n✅ Squad endpoint - Status:', response.status);
  console.log('Players found:', response.data.response?.[0]?.players?.length || 0);
})
.catch(error => {
  console.log('\n❌ Squad endpoint - Status:', error.response?.status);
  console.log('Error:', error.response?.data?.message || error.message);
  console.log('Headers:', error.response?.headers);
});
