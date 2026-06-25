import 'reflect-metadata';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const testAxiosConfiguration = async () => {
  console.log('=== Testing Axios Configuration ===\n');

  const config = {
    baseURL: process.env.FOOTBALL_API_URL || 'https://v3.football.api-sports.io',
    headers: {
      'x-apisports-key': process.env.FOOTBALL_API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    },
    params: {
      team: 33
    }
  };

  console.log('Axios config:');
  console.log('Base URL:', config.baseURL);
  console.log('Headers:', JSON.stringify(config.headers, null, 2));
  console.log('Params:', JSON.stringify(config.params, null, 2));
  console.log('\n');

  try {
    console.log('Testing /players/squads endpoint...');
    const response = await axios.get('/players/squads', {
      baseURL: config.baseURL,
      headers: config.headers,
      params: config.params
    });

    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Rate limit remaining:', response.headers['x-ratelimit-requests-remaining']);
    console.log('Players count:', response.data.response?.[0]?.players?.length || 0);
  } catch (error: any) {
    console.log('❌ Error!');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Headers:', error.response?.headers);
  }

  console.log('\n=== Comparing with CURL ===');
  console.log('CURL command:');
  console.log(`curl -X GET "${config.baseURL}/players/squads?team=33" -H "x-apisports-key: ${process.env.FOOTBALL_API_KEY}" -H "x-rapidapi-host: v3.football.api-sports.io"`);

  process.exit(0);
};

testAxiosConfiguration();
