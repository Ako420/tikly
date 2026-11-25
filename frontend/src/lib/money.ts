export const formatAmount = (amount: number) =>
  Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const formatMoney = (amount: number) => `${formatAmount(amount)} XAF`;
