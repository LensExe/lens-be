import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  ArrayMaxSize,
  MaxLength,
  MinLength,
  Max,
  Min,
} from 'class-validator';

export class PhotographerAiAssistantSettingsDto {
  @ApiProperty({ example: false })
  enabled!: boolean;

  @ApiProperty({ example: false })
  autoReplyEnabled!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Thân thiện, ngắn gọn',
  })
  toneInstructions!: string | null;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.62 })
  minSimilarity!: number;
}

export class PhotographerAiAssistantSettingsPatchDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  toneInstructions?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, example: 0.62 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number;
}

export class PhotographerAiFaqDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ maxLength: 500 })
  question!: string;

  @ApiProperty({ maxLength: 4000 })
  answer!: string;

  @ApiProperty({ type: [String], maxItems: 10 })
  alternatives!: string[];

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PhotographerAiFaqCreateDto {
  @ApiProperty({ minLength: 1, maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question!: string;

  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  answer!: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(300, { each: true })
  alternatives?: string[];
}

export class PhotographerAiFaqPatchDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  answer?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(300, { each: true })
  alternatives?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PhotographerAiReplySuggestionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  message_id!: string;

  @ApiProperty()
  channel_id!: string;

  @ApiProperty({ enum: ['answer', 'ask_clarification', 'handoff'] })
  action!: string;

  @ApiProperty()
  intent!: string;

  @ApiProperty({ type: String, nullable: true })
  suggested_reply!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  retrieval_similarity!: number | null;

  @ApiProperty({ type: [String] })
  knowledge_item_ids!: string[];

  @ApiProperty({ type: [String] })
  risk_flags!: string[];

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: String, nullable: true })
  failure_reason!: string | null;

  @ApiProperty({ format: 'date-time' })
  created_at!: string;
}
