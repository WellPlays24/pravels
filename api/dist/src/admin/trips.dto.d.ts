export declare class CreateTripDto {
    title: string;
    description: string;
    startsAt: string;
    endsAt: string;
    provinceId: number;
    cantonId: number;
    priceCents?: number;
    capacity?: number;
    bankName?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankAccountType?: string;
    paymentInstructions?: string;
}
export declare class UpdateTripDto {
    title?: string;
    description?: string;
    startsAt?: string;
    endsAt?: string;
    provinceId?: number;
    cantonId?: number;
    priceCents?: number | null;
    capacity?: number | null;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountType?: string | null;
    paymentInstructions?: string | null;
}
export declare class AddTripMediaDto {
    kind: 'FLYER' | 'PHOTO';
    url: string;
    sortOrder?: number;
}
export declare class UploadTripMediaDto {
    kind: 'FLYER' | 'PHOTO';
    sortOrder?: number;
}
