export interface IUserCreateBody {
    fullName: string;
    username: string;
    password: string;
    std: string;
    rollNumber: string | number;
    suid?: string;
    userRole: string;
    department?: string | number;
    existingImageUrl?: string;
}

export interface IUserUpdateBody extends Partial<IUserCreateBody> {}