import * as fs from "node:fs";
import * as path from "node:path";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);

@Injectable()
export class StorageService {
  readonly uploadRoot: string;

  constructor(config: ConfigService) {
    this.uploadRoot = path.resolve(config.get<string>("UPLOAD_ROOT", "uploads"));
    fs.mkdirSync(this.uploadRoot, { recursive: true });
  }

  validate(file: Express.Multer.File) {
    if (!ALLOWED.has(file.mimetype)) throw new BadRequestException("Unsupported creative file type.");
    if (file.size > 100 * 1024 * 1024) throw new BadRequestException("Creative file is too large.");
  }

  filePath(fileName: string) {
    return path.join(this.uploadRoot, path.basename(fileName));
  }
}
