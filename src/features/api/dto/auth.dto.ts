import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, MinLength, IsEmail, IsEnum, Matches } from 'class-validator';

export enum AuthOtpEvent {
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
}

export class AuthRegisterCommandBodyDto {
  @ApiProperty({
    description: 'Họ và tên người dùng',
    example: 'Nguyễn Văn A',
    minLength: 1,
    type: 'string',
  })
  @IsString()
  @MinLength(1)
  fullname!: string;

  @ApiProperty({
    description: 'Địa chỉ email đăng ký',
    example: 'user@example.com',
    format: 'email',
    type: 'string',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Mật khẩu tài khoản (tối thiểu 6 ký tự)',
    example: 'P@ssword123',
    minLength: 6,
    format: 'password',
    type: 'string',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class AuthLoginQueryDto {
  @ApiProperty({
    description: 'Địa chỉ email đăng nhập',
    example: 'user@example.com',
    format: 'email',
    type: 'string',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Mật khẩu tài khoản',
    example: 'P@ssword123',
    minLength: 6,
    format: 'password',
    type: 'string',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class AuthRefreshDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'refresh-token',
    type: 'string',
  })
  @IsString()
  refresh_token!: string;
}

export class AuthLogoutDto extends PartialType(AuthRefreshDto) {}

export class AuthChangePasswordDto {
  @ApiProperty({
    description: 'Mật khẩu tài khoản (tối thiểu 6 ký tự)',
    example: 'P@ssword123',
    minLength: 6,
    format: 'password',
    type: 'string',
  })
  @IsString()
  @MinLength(6)
  current_password: string;

  @ApiProperty({
    description: 'Mật khẩu tài khoản (tối thiểu 6 ký tự)',
    example: 'P@ssword123',
    minLength: 6,
    format: 'password',
    type: 'string',
  })
  @IsString()
  @MinLength(6)
  new_password: string;

  @ApiProperty({
    description: 'Mật khẩu tài khoản (tối thiểu 6 ký tự)',
    example: 'P@ssword123',
    minLength: 6,
    format: 'password',
    type: 'string',
  })
  @IsString()
  @MinLength(6)
  confirm_password: string;
}

export class AuthSendOtpDto {
  @ApiProperty({
    description: 'Địa chỉ email nhận OTP',
    example: 'user@example.com',
    format: 'email',
    type: 'string',
  })
  @IsEmail()
  email!: string;
}

export class AuthSendOTP extends AuthSendOtpDto {
  @ApiProperty({
    description: 'Loại sự kiện cần gửi OTP',
    enum: AuthOtpEvent,
    example: AuthOtpEvent.FORGOT_PASSWORD, // Trên Swagger sẽ hiện Dropdown chọn luôn
  })
  @IsEnum(AuthOtpEvent, {
    message: 'Event phải là FORGOT_PASSWORD hoặc VERIFY_EMAIL',
  })
  event!: AuthOtpEvent;
}

export class AuthVerifyForgotPasswordOtpDto {
  @ApiProperty({
    description: 'Địa chỉ email tài khoản',
    example: 'user@example.com',
    format: 'email',
    type: 'string',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Mã OTP 6 chữ số nhận từ email',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    type: 'string',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Mã OTP phải gồm đúng 6 chữ số' })
  otp!: string;
}

export class AuthResetPasswordDto {
  @ApiProperty({
    description:
      'Mã token đặt lại mật khẩu nhận được sau khi xác minh OTP thành công',
    minLength: 1,
    type: 'string',
  })
  @IsString()
  @MinLength(1)
  reset_token!: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
    example: 'NewP@ssword123',
    minLength: 6,
    format: 'password',
    type: 'string',
  })
  @IsString()
  @MinLength(6)
  new_password!: string;

  @ApiProperty({
    description: 'Xác nhận lại mật khẩu mới',
    example: 'NewP@ssword123',
    minLength: 6,
    format: 'password',
    type: 'string',
  })
  @IsString()
  @MinLength(6)
  confirm_password!: string;
}

export class AuthVerifyEmailDto {
  @ApiProperty({
    description: 'Địa chỉ email cần xác minh',
    example: 'user@example.com',
    format: 'email',
    type: 'string',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Mã OTP 6 chữ số nhận từ email',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    type: 'string',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Mã OTP phải gồm đúng 6 chữ số' })
  otp!: string;
}

/** Alias for backward compatibility with Identity domain */
export { AuthRegisterCommandBodyDto as IdentityRegisterCommandBodyDto };
