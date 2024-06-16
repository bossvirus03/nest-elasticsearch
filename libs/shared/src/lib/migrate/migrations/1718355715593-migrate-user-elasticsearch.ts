import {
  BulkOperationContainer,
  BulkUpdateAction,
  IndicesIndexSettings,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import {
  getElasticsearchClient,
  getUserMongoClient,
} from '../migrations-utils/db';
import { EsIndex } from '../../enums/esIndex';
import * as fs from 'fs';

export async function up() {
  const elasticSearch = await getElasticsearchClient();
  const userClient = await getUserMongoClient();
  const db = userClient.db();

  const indexExists = await elasticSearch.indices.exists({
    index: EsIndex.USERS,
  });
  console.log('indexExists >>>', indexExists);
  if (indexExists) {
    await elasticSearch.indices.delete({
      index: EsIndex.USERS,
    });
  }

  const indexSettings: IndicesIndexSettings = {
    number_of_shards: 1,
    analysis: {
      filter: {
        '3_5_front_edgegrams': {
          type: 'edge_ngram',
          /**
           * {
              "type": "edge_ngram",
              "min_gram": 2,
              "max_gram": 4,
              "side": "front"
            }
          Các đoạn con được tạo ra sẽ là:
            "he"
            "hel"
            "hell"
            */
          min_gram: 3,
          max_gram: 5,
          preserve_original: true,
          /**
           * ví dụ trường content có nội dung là 'example'
           *
           * ? preserve_original = true
           * khi tìm kiếm với nội dung là 'example'
           * kết quả sẽ trả về true
           *
           * ? preserve_original = false
           * khi tìm kiếm với nội dung là 'example'
           * kết quả trả về false
           *
           * =======================================
           * khi tìm kiếm với nội dung là 'exa'
           * kết quả sẽ trả về true
           * */
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
          tokenizer: 'standard',
          filter: ['lowercase'],
        },
        word_tokenized_search: {
          type: 'custom',
          tokenizer: 'standard',
          /**
           * ? standard
           * tokenizer: 'standard': Sử dụng standard tokenizer để tách văn bản thành các token từ ngữ.
           * Ví dụ, văn bản "Elasticsearch is powerful" sẽ được tách thành các token ["Elasticsearch", "is", "powerful"].
           */
          filter: ['icu_folding'],
          /**
           * ? icu_folding
           * Khi sử dụng icu_folding, văn bản này sẽ được bình thường hóa thành "cafe" khi lưu trữ và tìm kiếm.
           * Điều này cho phép bạn tìm kiếm bằng các chuỗi như "cafe", "Café", hoặc "CAFE" và vẫn nhận được kết quả khớp.
           */
        },
        word_exact_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['icu_folding', 'lowercase'],
        },
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

  await elasticSearch.indices.create({
    index: EsIndex.USERS,
    settings: indexSettings,
    mappings: {
      properties: {
        name: word_mapping,
        email: ngrams_mapping,
        phone: ngrams_mapping,
      },
    },
  });

  const data = await db.collection('users').find({}).toArray();

  const bulkEsInsertion: BulkOperationContainer[] | BulkUpdateAction[] = [];

  for (const element of data) {
    const indexExists2 = await elasticSearch.indices.exists({
      index: EsIndex.USERS,
    });

    if (indexExists2) {
      const doc = {
        id: element._id.toHexString(),
        email: element.email,
        phone: element.phone,
        name: element.name,
      };

      bulkEsInsertion.push(
        {
          update: {
            _index: EsIndex.USERS,
            _id: doc.id.toString(),
          },
        },
        {
          doc,
          doc_as_upsert: true,
        },
      );
    }
  }

  const queriesLength = bulkEsInsertion.length;
  if (queriesLength === 0) {
    return;
  }

  try {
    let begin = 0;
    do {
      /**
       * Để tạo ra bản ghi trên Elasticsearch qua bulk API thì đang dùng 2 object
       * số bản ghi tối đa có thể put vào ES nếu config default là 10000
       */
      const end = Math.min(begin + 2 * 10000, queriesLength);

      await elasticSearch.bulk({
        index: EsIndex.USERS,
        operations: bulkEsInsertion.slice(begin, end),
        timeout: '5m',
      });

      begin = end;
    } while (begin < queriesLength);
  } catch (error) {
    console.error('Migrate customer elastic search error: ');

    const file = fs.createWriteStream(
      'Migrate_customer_elastic_search_error.txt',
    );
    file.write(JSON.stringify(error, null, 2) + '\n');
    file.end();

    throw error;
  }

  console.info('Migration: Migrate customer elastic search success');
  await userClient.close();
  await elasticSearch.close();
}

export async function down() {
  /*
       Code you downgrade script here!
*/
}
