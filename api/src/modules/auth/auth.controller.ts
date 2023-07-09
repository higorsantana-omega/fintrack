import { Body, Controller, Post, SetMetadata } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticateDto } from './dto/authenticate.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @SetMetadata('IS_PUBLIC', true)
  signin(@Body() authenticateDto: AuthenticateDto) {
    return this.authService.authenticate(authenticateDto);
  }

  @Post('signup')
  @SetMetadata('IS_PUBLIC', true)
  create(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }
}
