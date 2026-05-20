import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthUser } from "../../shared/types/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { CreatePostDto } from "./dto/post.dto";

type PublishResult = { platform: string; status: "QUEUED" | "SKIPPED"; note: string };

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService
  ) {}

  async create(user: AuthUser, dto: CreatePostDto) {
    await this.workspaces.assertMembership(user.sub, user.role, dto.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER"]);
    return this.prisma.socialPost.create({
      data: {
        workspaceId: dto.workspaceId,
        caption: dto.caption,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        platforms: dto.platforms,
        createdById: user.sub,
        status: "DRAFT"
      }
    });
  }

  async list(user: AuthUser, workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    return this.prisma.socialPost.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  }

  async publish(user: AuthUser, postId: string) {
    const post = await this.prisma.socialPost.findUniqueOrThrow({ where: { id: postId } });
    await this.workspaces.assertMembership(user.sub, user.role, post.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER"]);
    if (!post.platforms.length) throw new BadRequestException("Select at least one platform.");

    const integrations = await this.prisma.integrationAccount.findMany({
      where: { workspaceId: post.workspaceId, status: "CONNECTED" }
    });
    const connected = new Set(integrations.map((integration) => integration.provider as string));

    const results: PublishResult[] = post.platforms.map((platform) =>
      connected.has(platform)
        ? {
            platform,
            status: "QUEUED",
            note: `Queued for ${platform}. The publishing adapter delivers the post once the ${platform} app review is complete.`
          }
        : {
            platform,
            status: "SKIPPED",
            note: `Connect ${platform} to cross-post here.`
          }
    );

    const queued = results.filter((result) => result.status === "QUEUED").length;
    const status = queued === 0 ? "FAILED" : queued === results.length ? "PUBLISHING" : "PARTIAL";

    return this.prisma.socialPost.update({
      where: { id: post.id },
      data: {
        status,
        results: results as unknown as Prisma.InputJsonValue,
        publishedAt: queued > 0 ? new Date() : null
      }
    });
  }

  async remove(user: AuthUser, postId: string) {
    const post = await this.prisma.socialPost.findUniqueOrThrow({ where: { id: postId } });
    await this.workspaces.assertMembership(user.sub, user.role, post.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER"]);
    await this.prisma.socialPost.delete({ where: { id: post.id } });
    return { success: true };
  }
}
