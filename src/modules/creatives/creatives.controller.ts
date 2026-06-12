import { Controller, Delete, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Public } from "../../shared/decorators/public.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { StorageService } from "./storage.service";

@ApiBearerAuth()
@ApiTags("Creatives")
@Controller("creatives")
export class CreativesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly storage: StorageService,
    private readonly config: ConfigService
  ) {}

  @Post("upload")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Query("workspaceId") workspaceId: string,
    @Query("campaignId") campaignId?: string
  ) {
    this.storage.validate(file);
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER"]);

    const { key, url } = await this.storage.upload(file);
    const fileUrl = url || this.buildLocalFileUrl(key);

    return this.prisma.adCreative.create({
      data: {
        workspaceId,
        campaignId,
        fileUrl,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedBy: user.sub
      }
    });
  }

  private buildLocalFileUrl(key: string) {
    const base = this.config.get<string>("PUBLIC_BASE_URL", "").replace(/\/$/, "");
    const prefix = this.config.get<string>("API_PREFIX", "api/v1").replace(/^\/|\/$/g, "");
    return `${base}/${prefix}/creatives/files/${key}`;
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query("workspaceId") workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    return this.prisma.adCreative.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const creative = await this.prisma.adCreative.findUniqueOrThrow({ where: { id } });
    await this.workspaces.assertMembership(user.sub, user.role, creative.workspaceId);
    return creative;
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const creative = await this.prisma.adCreative.findUniqueOrThrow({ where: { id } });
    await this.workspaces.assertMembership(user.sub, user.role, creative.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER"]);
    // Extract key from URL for S3 or local filename
    const key = creative.fileUrl.split("/").pop() ?? "";
    await this.storage.deleteFile(key);
    await this.prisma.adCreative.delete({ where: { id } });
    return { success: true };
  }

  @Public()
  @Get("files/:fileName")
  file(@Param("fileName") fileName: string, @Res() response: Response) {
    return response.sendFile(this.storage.filePath(fileName));
  }
}
