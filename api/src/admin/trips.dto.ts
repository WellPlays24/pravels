import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';

@ValidatorConstraint({ name: 'endsAfterStarts', async: false })
class EndsAfterStarts implements ValidatorConstraintInterface {
  validate(_: unknown, args: any) {
    const obj = args.object as { startsAt?: string; endsAt?: string };
    if (!obj.startsAt || !obj.endsAt) return true;
    return new Date(obj.endsAt).getTime() >= new Date(obj.startsAt).getTime();
  }
  defaultMessage() {
    return 'endsAt must be >= startsAt';
  }
}

export class CreateTripDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  @Validate(EndsAfterStarts)
  endsAt!: string;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value))
  provinceId!: number;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value))
  cantonId!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  priceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  capacity?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankAccountType?: string;

  @IsOptional()
  @IsString()
  paymentInstructions?: string;
}

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  provinceId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  cantonId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' || value === null ? null : value === undefined ? undefined : Number(value)))
  priceCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === '' || value === null ? null : value === undefined ? undefined : Number(value)))
  capacity?: number | null;

  @IsOptional()
  @IsString()
  bankName?: string | null;

  @IsOptional()
  @IsString()
  bankAccountName?: string | null;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string | null;

  @IsOptional()
  @IsString()
  bankAccountType?: string | null;

  @IsOptional()
  @IsString()
  paymentInstructions?: string | null;
}

export class AddTripMediaDto {
  @IsString()
  kind!: 'FLYER' | 'PHOTO';

  @IsString()
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  sortOrder?: number;
}

export class UploadTripMediaDto {
  @IsString()
  kind!: 'FLYER' | 'PHOTO';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  sortOrder?: number;
}
