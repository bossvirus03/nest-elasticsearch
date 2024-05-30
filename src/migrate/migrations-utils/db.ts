import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { ElasticsearchService } from '@nestjs/elasticsearch';

const envConfig = dotenv.config();

export const getUserMongoClient = async () => {
  const uri = envConfig.parsed!.MONGODB_URI;
  const client = new MongoClient(uri);
  return client;
};

export const getElasticsearchClient = async () => {
  const elasticsearch = new ElasticsearchService({
    node: envConfig.parsed!.ELASTICSEARCH_NODE,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    auth: {
      username: envConfig.parsed!.ELASTICSEARCH_USERNAME,
      password: envConfig.parsed!.ELASTICSEARCH_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
    maxRetries: 5,
    requestTimeout: 6000,
  });
  return elasticsearch;
};
