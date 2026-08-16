import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import type { GoogleOAuthProfile } from './auth.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type GoogleAuthenticatedRequest = Request & {
  user: GoogleOAuthProfile;
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an account and return an access token' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Return the authenticated JWT payload' })
  me(@Req() req: Request) {
    return req.user;
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Start Google OAuth 2.0 sign-in' })
  @ApiFoundResponse({ description: 'Redirects to Google authorization' })
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Handle the Google OAuth 2.0 callback' })
  @ApiFoundResponse({ description: 'Redirects to the frontend OAuth callback' })
  async googleCallback(
    @Req() req: GoogleAuthenticatedRequest,
    @Res() response: Response,
  ) {
    const authResponse = await this.authService.loginWithGoogle(req.user);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const redirectUrl = new URL('/oauth/callback', frontendUrl);

    redirectUrl.hash = `accessToken=${encodeURIComponent(
      authResponse.accessToken,
    )}`;
    response.redirect(redirectUrl.toString());
  }
}
