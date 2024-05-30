import { getUserMongoClient } from './../migrations-utils/db';
import * as dotenv from 'dotenv';

dotenv.config();
import { Client } from '@elastic/elasticSearch';
import {
  IndicesIndexSettings,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';

async function up() {
  const userClient = await getUserMongoClient();

  const elasticSearch = new Client({
    node: process.env.ELASTICSEARCH_NODE,
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
    },
    maxRetries: 5,
    requestTimeout: 6000,
    tls: {
      rejectUnauthorized: false, // Bỏ qua lỗi chứng chỉ tự ký
    },
  });

  const indexExists = await elasticSearch.indices.exists({
    index: 'users',
  });
  if (indexExists) {
    await elasticSearch.indices.delete({
      index: 'users',
    });
  }

  const db = userClient.db();

  const indexSettings: IndicesIndexSettings = {
    number_of_shards: 1,
    analysis: {
      filter: {
        '3_5_front_edgegrams': {
          type: 'edge_ngram',
          min_gram: 3,
          max_gram: 5,
          preserve_original: true,
          side: 'front',
        },
        '1_3_front_edgegrams': {
          type: 'edge_ngram',
          min_gram: 1,
          max_gram: 3,
          preserve_original: true,
          side: 'front',
        },
        '3_5_back_edgegrams': {
          type: 'edge_ngram',
          min_gram: 3,
          max_gram: 5,
          preserve_original: true,
          side: 'back',
        },
      },
      analyzer: {
        '3_5_front_edge_ngram': {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', '3_5_front_edgegrams'],
        },
        '3_5_back_edge_ngram': {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', '3_5_back_edgegrams'],
        },
        custom_edge_ngram_search: {
          type: 'custom',
          tokenizer: 'keyword',
          filter: ['lowercase'],
        },
        '1_3_front_word_edge_ngram': {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['icu_folding', '1_3_front_edgegrams'],
        },
        word_tokenized_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['icu_folding'],
        },
        word_exact_search: {
          type: 'custom',
          tokenizer: 'keyword',
          filter: ['icu_folding'],
        },
      },
    },
  };

  const ngrams_mapping: MappingProperty = {
    type: 'text',
    analyzer: '3_5_front_edge_ngram',
    search_analyzer: 'custom_edge_ngram_search',
    fields: {
      back: {
        type: 'text',
        analyzer: '3_5_back_edge_ngram',
        search_analyzer: 'custom_edge_ngram_search',
      },
    },
  };

  const word_mapping: MappingProperty = {
    type: 'text',
    analyzer: 'word_exact_search',
    search_analyzer: 'word_exact_search',
    fields: {
      tokenized: {
        type: 'text',
        analyzer: 'word_tokenized_search',
        search_analyzer: 'word_tokenized_search',
      },
    },
  };
  await elasticSearch.indices.create({
    index: 'users',
    settings: indexSettings,
    mappings: {
      properties: {
        name: word_mapping,
        email: word_mapping,
        phone: ngrams_mapping,
        age: ngrams_mapping,
      },
    },
  });
  const data = await db.collection('users').find().toArray();

  // Add the data to ElasticSearch
  for (const user of data) {
    await elasticSearch.index({
      index: 'users',
      id: user._id.toString(),
      body: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
      },
    });
  }

  try {
  } finally {
    console.info('Migration: Migrate user to ElasticSearch success');
    await userClient.close();
    await elasticSearch.close();
  }
}

up().catch(console.dir);
