import { Controller, Delete, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { diskStorage } from "multer";
import * as path from "node:path";
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
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "uploads",
        filename: (_req, file, callback) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
          callback(null, unique);
        }
      })
    })
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Query("workspaceId") workspaceId: string,
    @Query("campaignId") campaignId?: string
  ) {
    this.storage.validate(file);
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER"]);
    return this.prisma.adCreative.create({
      data: {
        workspaceId,
        campaignId,
        fileUrl: this.buildFileUrl(file.filename),
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedBy: user.sub
      }
    });
  }

  private buildFileUrl(fileName: string) {
    const base = this.config.get<string>("PUBLIC_BASE_URL", "").replace(/\/$/, "");
    const prefix = this.config.get<string>("API_PREFIX", "api/v1").replace(/^\/|\/$/g, "");
    return `${base}/${prefix}/creatives/files/${fileName}`;
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
    await this.prisma.adCreative.delete({ where: { id } });
    return { success: true };
  }

  @Public()
  @Get("files/:fileName")
  file(@Param("fileName") fileName: string, @Res() response: Response) {
    return response.sendFile(this.storage.filePath(fileName));
  }
}
