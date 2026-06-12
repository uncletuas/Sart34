import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);

@Injectable()
export class StorageService {
  readonly uploadRoot: string;
  private readonly s3?: S3Client;
  private readonly bucket?: string;
  private readonly region: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    this.uploadRoot = path.resolve(config.get<string>("UPLOAD_ROOT", "uploads"));
    this.region = config.get<string>("AWS_REGION", "us-east-1");
    const accessKeyId = config.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = config.get<string>("AWS_SECRET_ACCESS_KEY");
    this.bucket = config.get<string>("AWS_S3_BUCKET");

    if (accessKeyId && secretAccessKey && this.bucket) {
      this.s3 = new S3Client({ region: this.region, credentials: { accessKeyId, secretAccessKey } });
      this.logger.log(`S3 storage active — bucket: ${this.bucket}`);
    } else {
      fs.mkdirSync(this.uploadRoot, { recursive: true });
      this.logger.log("Local disk storage active");
    }
  }

  get isS3(): boolean {
    return !!this.s3;
  }

  validate(file: Express.Multer.File) {
    if (!ALLOWED.has(file.mimetype)) throw new BadRequestException("Unsupported creative file type.");
    if (file.size > 100 * 1024 * 1024) throw new BadRequestException("Creative file is too large.");
  }

  generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  }

  async upload(file: Express.Multer.File): Promise<{ key: string; url: string }> {
    const key = this.generateFileName(file.originalname);

    if (this.s3 && this.bucket) {
      const up = new Upload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size
        }
      });
      await up.done();
      return { key, url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}` };
    }

    // Local disk fallback
    const dest = path.join(this.uploadRoot, key);
    await fs.promises.writeFile(dest, file.buffer);
    return { key, url: "" };
  }

  async deleteFile(key: string): Promise<void> {
    if (this.s3 && this.bucket) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return;
    }
    const filePath = path.join(this.uploadRoot, path.basename(key));
    if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  }

  filePath(fileName: string): string {
    return path.join(this.uploadRoot, path.basename(fileName));
  }
}
