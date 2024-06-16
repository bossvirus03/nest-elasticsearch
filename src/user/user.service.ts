import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { SearchService } from 'src/search/search.service';
import { EsIndex } from 'libs/shared/src/lib/enums/esIndex';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly searchService: SearchService,
  ) {}
  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);

    await createdUser.save();
    await this.searchService.insertDocToIndex(EsIndex.USERS, createdUser);
    return createdUser;
  }
}
