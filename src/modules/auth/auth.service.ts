import * as crypto from "node:crypto";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { GoogleCallbackDto, LoginDto, PasswordResetDto, RegisterDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new BadRequestException("Email is already registered.");
    const [firstName, ...rest] = (dto.name ?? `${dto.firstName ?? ""} ${dto.lastName ?? ""}`).trim().split(/\s+/);
    const resolvedFirstName = firstName || "Sart34";
    const resolvedLastName = rest.join(" ") || dto.lastName || "User";
    const password = dto.password ?? crypto.randomBytes(18).toString("base64url");

    const user = await this.prisma.user.create({
      data: {
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12)
      }
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    if (!user.isActive) throw new UnauthorizedException("Account is suspended.");
    return this.issueTokens(user.id, user.email, user.role);
  }

  async googleCallback(dto: GoogleCallbackDto) {
    const user = await this.prisma.user.upsert({
      where: { email: dto.email.toLowerCase() },
      update: { googleId: dto.googleId, firstName: dto.firstName, lastName: dto.lastName },
      create: {
        email: dto.email.toLowerCase(),
        googleId: dto.googleId,
        firstName: dto.firstName,
        lastName: dto.lastName
      }
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefresh(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: { user: true }
    });
    if (!stored || !(await bcrypt.compare(refreshToken, stored.tokenHash))) {
      throw new UnauthorizedException("Invalid refresh token.");
    }
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 12);
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), tokenHash }
    });
    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { success: true };
    const token = crypto.randomBytes(32).toString("hex");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: await bcrypt.hash(token, 12),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30)
      }
    });
    return { success: true, resetToken: token };
  }

  async resetPassword(dto: PasswordResetDto) {
    const candidates = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true }
    });
    const match = await this.findMatchingToken(candidates, dto.token);
    if (!match) throw new BadRequestException("Invalid or expired reset token.");
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: match.userId },
        data: { passwordHash: await bcrypt.hash(dto.password, 12) }
      }),
      this.prisma.passwordResetToken.update({ where: { id: match.id }, data: { usedAt: new Date() } })
    ]);
    return { success: true };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        memberships: { include: { workspace: true } }
      }
    });
  }

  private async issueTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_TTL", "30d") as never
    });
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: await bcrypt.hash(refreshToken, 12),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });
    return { accessToken, refreshToken };
  }

  private verifyRefresh(refreshToken: string) {
    return this.jwt.verifyAsync<{ sub: string; email: string; role: UserRole }>(refreshToken, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET")
    });
  }

  private async findMatchingToken<T extends { tokenHash: string }>(tokens: T[], token: string) {
    for (const candidate of tokens) {
      if (await bcrypt.compare(token, candidate.tokenHash)) return candidate;
    }
    return null;
  }
}
