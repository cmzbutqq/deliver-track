import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { username },
    });

    if (!merchant) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, merchant.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, ...result } = merchant;
    return result;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    };
  }

  async register(username: string, password: string, name?: string) {
    const existingMerchant = await this.prisma.merchant.findUnique({
      where: { username },
    });

    if (existingMerchant) {
      throw new UnauthorizedException('用户名已存在');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const merchant = await this.prisma.merchant.create({
      data: {
        username,
        passwordHash,
        name,
      },
    });

    const { passwordHash: _, ...result } = merchant;
    return result;
  }
}

