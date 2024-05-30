import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { SearchModule } from '../search/search.module'; // Ensure the correct relative path

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    SearchModule, // Import SearchModule to make ElasticsearchService available
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
