import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateWhatsappGroupDto {
  @IsString()
  name!: string;

  @IsUrl()
  url!: string;

  @IsIn(['MAIN', 'PROVINCE', 'CUSTOM'])
  kind!: 'MAIN' | 'PROVINCE' | 'CUSTOM';

  @IsOptional()
  @IsInt()
  @Min(1)
  provinceId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWhatsappGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsIn(['MAIN', 'PROVINCE', 'CUSTOM'])
  kind?: 'MAIN' | 'PROVINCE' | 'CUSTOM';

  @IsOptional()
  @IsInt()
  @Min(1)
  provinceId?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
