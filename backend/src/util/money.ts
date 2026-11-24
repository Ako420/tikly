export function splitAmount(amount: number, ratePercent: number) {
  const commission = Math.round((amount * ratePercent) / 100);
  return { commission, payeeShare: amount - commission };
}
