export interface IRolePermissions {
    [key: string]: {
        view?: boolean;
        create?: boolean;
        edit?: boolean;
        delete?: boolean;
        [key: string]: boolean | undefined;
    } | boolean;
}

export interface IRoleRequestBody {
    roleName: string;
    roleCode: string;
    permissions?: IRolePermissions;
}