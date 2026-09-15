const { Pool } = require('pg');

const client = new Pool({
  connectionString: 'postgresql://postgres.xszpjeqvvhnziwyzcwfp:C1JMxdsYmx4s8ZvW@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false,
  },
});
client.connect(err => {
  if (err) {
    console.error('Connection error', err.stack);
  } else {
    console.log('Connected');
  }
});
module.exports = client;