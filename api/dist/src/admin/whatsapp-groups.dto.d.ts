export declare class CreateWhatsappGroupDto {
    name: string;
    url: string;
    kind: 'MAIN' | 'PROVINCE' | 'CUSTOM';
    provinceId?: number;
    isActive?: boolean;
}
export declare class UpdateWhatsappGroupDto {
    name?: string;
    url?: string;
    kind?: 'MAIN' | 'PROVINCE' | 'CUSTOM';
    provinceId?: number | null;
    isActive?: boolean;
}
