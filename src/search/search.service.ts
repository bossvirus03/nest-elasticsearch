import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {}

  async indexUser(user) {
    return this.elasticsearchService.index({
      index: 'users',
      id: user._id,
      body: {
        name: user.name,
        phone: user.phone,
        email: user.email,
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
