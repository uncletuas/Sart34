import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import { CreatePostDto } from "./dto/post.dto";
import { PostsService } from "./posts.service";

@ApiBearerAuth()
@ApiTags("Posts")
@Controller("posts")
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("workspaceId") workspaceId: string) {
    return this.posts.list(user, workspaceId);
  }

  @Post(":id/publish")
  publish(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.posts.publish(user, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.posts.remove(user, id);
  }
}
