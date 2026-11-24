type ObjectIdLike = { toString(): string };

type ProviderLike = {
  _id: ObjectIdLike;
  businessName: string;
  description?: string | null;
  city: string;
  country: string;
  phone: string;
  whatsapp?: string | null;
  ratingAvg: number;
  ratingCount: number;
};

type ServiceLike = {
  _id: ObjectIdLike;
  providerId?: ObjectIdLike | null;
  category: string;
  title?: { en?: string | null; fr?: string | null } | null;
  description?: string | null;
  photos?: string[] | null;
  city: string;
  price: number;
  unit: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export const toProviderSummary = (provider: ProviderLike) => ({
  id: String(provider._id),
  businessName: provider.businessName,
  city: provider.city,
  ratingAvg: provider.ratingAvg,
  ratingCount: provider.ratingCount,
});

export const toProviderContact = (provider: ProviderLike) => ({
  ...toProviderSummary(provider),
  description: provider.description ?? undefined,
  country: provider.country,
  phone: provider.phone,
  whatsapp: provider.whatsapp ?? undefined,
});

export const toServiceView = (service: ServiceLike) => ({
  id: String(service._id),
  providerId: String(service.providerId),
  category: service.category,
  title: { en: service.title?.en ?? undefined, fr: service.title?.fr ?? undefined },
  description: service.description ?? undefined,
  photos: service.photos ?? [],
  city: service.city,
  price: service.price,
  unit: service.unit,
  active: service.active,
  createdAt: service.createdAt,
  updatedAt: service.updatedAt,
});
