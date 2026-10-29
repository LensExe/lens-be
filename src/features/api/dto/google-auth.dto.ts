import { IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleCallbackQuery {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  state!: string;

  @IsOptional()
  @IsString()
  session_state?: string;

  @IsOptional()
  @IsString()
  iss?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_description?: string;

  @IsOptional()
  @IsString()
  error_uri?: string;
}

export class GoogleExchangeQuery {
  @IsString()
  @MinLength(1)
  code!: string;
}
