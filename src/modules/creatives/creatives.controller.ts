import { Controller, Delete, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { diskStorage } from "multer";
import * as path from "node:path";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
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
    private readonly storage: StorageService
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
        fileUrl: `/api/v1/creatives/files/${file.filename}`,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedBy: user.sub
      }
    });
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

  @Get("files/:fileName")
  file(@Param("fileName") fileName: string, @Res() response: Response) {
    return response.sendFile(this.storage.filePath(fileName));
  }
}
