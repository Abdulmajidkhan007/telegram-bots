import { Global, Module } from '@nestjs/common';
import { GroupAccessService } from './group-access.service';

@Global()
@Module({
  providers: [GroupAccessService],
  exports: [GroupAccessService],
})
export class AccessModule {}
