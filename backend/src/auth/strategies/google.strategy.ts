import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

import type { GoogleOAuthProfile } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3000/auth/google/callback',
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') ?? 'missing',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ?? 'missing',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      done(new Error('Google account did not return an email address'));
      return;
    }

    const user: GoogleOAuthProfile = {
      email,
      name: profile.displayName || email,
    };

    done(null, user);
  }
}
