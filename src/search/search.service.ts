import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { EsIndex } from 'libs/shared/src/lib/enums/esIndex';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {}
  async onModuleInit() {
    await this.elasticsearchService
      .ping({})
      .then(() => {
        Logger.log('>>> Connect elasticsearch done');
      })
      .catch((err) => {
        Logger.log('>>> Connect elasticsearch error', err);
      });
  }

  async updateIndexAsync(index: EsIndex, document) {
    const { id } = document;

    await this.elasticsearchService
      .update({
        index,
        id,
        doc: document,
        retry_on_conflict: 10,
      })
      .then((res) => {
        console.log(res);
      });
  }
  async insertDocToIndex(index: EsIndex, document) {
    const indexExists = await this.elasticsearchService.indices.exists({
      index,
    });
    console.log(document);
    if (indexExists)
      await this.elasticsearchService.update({
        index: index,
        id: document._id,
        doc: {
          name: document.name,
          phone: document.phone,
          email: document.email,
        },
        doc_as_upsert: true,
        retry_on_conflict: 10,
      });
  }

  async createDocument(index: EsIndex, document) {
    const indexExists = await this.elasticsearchService.indices.exists({
      index,
    });

    if (indexExists) {
      this.insertDocToIndex(index, document);
      return;
    }

    await this.elasticsearchService.indices.create({
      index: index,
      mappings: {
        properties: {
          name: {
            type: 'text',
            analyzer: '',
            search_analyzer: '',
            fields: {
              back: {},
            },
          },
        },
      },
      settings: {
        number_of_shards: 1,
        analysis: {},
        analyzer: {},
      },
    });
  }
  async search(query: string): Promise<any> {
    try {
      this.logger.log(`Searching for query: ${query}`);
      const body = await this.elasticsearchService.search({
        index: 'users',
        body: {
          query: {
            multi_match: {
              query,
              fields: ['name', 'phone', 'email'],
            },
          },
        },
      });
      return body;
    } catch (error) {
      this.logger.error(`Error searching for query: ${query}`, error);
      throw error;
    }
  }
}
