import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";

@Module({
  imports: [WorkspacesModule],
  controllers: [PostsController],
  providers: [PostsService]
})
export class PostsModule {}
