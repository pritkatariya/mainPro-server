export interface IOverviewConfig {
    heroImages: string[];
    campusImage: string;
    campusGalleryImages: string[];
    logoImage: string;
    dailyDarshanImages: string[];
}

export interface IOverviewUpdateBody {
    existingHeroImages?: string | string[];
    existingCampusGalleryImages?: string | string[];
    existingDailyDarshanImages?: string | string[];
    logoImage?: string;
    campusImage?: string;
}