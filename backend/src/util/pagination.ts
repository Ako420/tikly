export type Page = { page: number; limit: number };

export const skipFor = ({ page, limit }: Page) => (page - 1) * limit;

export const pageMeta = ({ page, limit }: Page, total: number) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});
