import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ElasticsearchModule,
  ElasticsearchService,
} from '@nestjs/elasticsearch';
import { SearchService } from './search.service';

@Module({
  imports: [
    ConfigModule.forRoot(), // Ensure ConfigModule is correctly initialized
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get<string>('ELASTICSEARCH_NODE'),
        auth: {
          username: configService.get<string>('ELASTICSEARCH_USERNAME'),
          password: configService.get<string>('ELASTICSEARCH_PASSWORD'),
        },
        maxRetries: 10,
        requestTimeout: 60000,
        sniffOnStart: false,
        tls: {
          rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SearchService],
  exports: [SearchService, ElasticsearchModule],
})
export class SearchModule {}
