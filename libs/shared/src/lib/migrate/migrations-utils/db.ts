import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { Client } from '@elastic/elasticsearch';

dotenv.config();

export const getUserMongoClient = async () => {
  try {
    const uri =
      'mongodb+srv://nguyenhuuloidev:ln2qmt0cvidNYdZx@cluster0.n3deqoi.mongodb.net/nest-elasticsearch';
    if (!uri)
      throw new Error('MONGODB_URI is not defined in environment variables');

    const client = new MongoClient(uri);
    await client.connect();
    return client;
  } catch (error) {
    console.error('Failed to initialize MongoDB client:', error.message);
    throw error;
  }
};

export const getElasticsearchClient = async () => {
  try {
    const node = 'http://localhost:9200';
    const username = 'elastic';
    const password = 'sYOgO9AStxCK-zEKwHJX';

    if (!node || !username || !password) {
      throw new Error(
        'Elasticsearch configuration is not defined properly in environment variables',
      );
    }

    const elasticsearch = new Client({
      node,
      auth: {
        username,
        password,
      },
      tls: {
        rejectUnauthorized: false,
      },
      maxRetries: 5,
      requestTimeout: 6000,
    });

    return elasticsearch;
  } catch (error) {
    console.error('Failed to initialize Elasticsearch client:', error.message);
    throw error;
  }
};
