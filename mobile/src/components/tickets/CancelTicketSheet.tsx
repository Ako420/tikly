import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import type { IssuedTicket } from '@/features/orders/types';
import { useTicketFormatter } from '@/features/tickets/formatTicket';
import { refundCutoff, refundFor, REFUND_CUTOFF_HOURS, REFUND_PERCENT, type TicketBundle } from '@/features/tickets/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatDayMonthTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { toLocalCameroonNumber } from '@/lib/validation';
import { ThemeScope, useTheme } from '@/theme';

type CancelTicketSheetProps = {
  bundle: TicketBundle;
  tickets: IssuedTicket[];
  visible: boolean;
  cancelling: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (ticket: IssuedTicket) => void;
};

const shortCode = (code: string) => `${code.slice(0, 3)}…${code.slice(-3)}`;
const formatPhone = (phone: string) =>
  `+237 ${toLocalCameroonNumber(phone).replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5')}`;

export function CancelTicketSheet({ bundle, tickets, visible, cancelling, error, onClose, onConfirm }: CancelTicketSheetProps) {
  const { t, language } = useTranslation();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useTicketFormatter();
  const [selectedId, setSelectedId] = useState(tickets[0]?.id);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];
  const price = bundle.unitPrice ?? 0;
  const refund = refundFor(price);
  const method = bundle.payment ? t(`payments.methods.${bundle.payment.method}`) : t('myTickets.cancel.yourMomo');
  const tierLabel = format.tier(bundle);
  const indexOf = (ticket: IssuedTicket) => bundle.tickets.findIndex((item) => item.id === ticket.id) + 1;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ThemeScope scheme={scheme} className="flex-1 justify-end">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} className="absolute inset-0 bg-black/60" />
        <View className="max-h-[90%] rounded-t-[28px] border-t border-border bg-surface pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-border" />
          <ScrollView contentContainerClassName="gap-4 px-6" bounces={false}>
            <View className="gap-2">
              <Text variant="sectionTitle" accessibilityRole="header">
                {t('myTickets.cancel.title')}
              </Text>
              <Text variant="bodySm" tone="secondary">
                {t('myTickets.cancel.body', { percent: REFUND_PERCENT, method })}
              </Text>
            </View>

            <View className="gap-2.5" accessibilityRole="radiogroup">
              {tickets.map((ticket) => {
                const active = ticket.id === selected?.id;
                return (
                  <Pressable
                    key={ticket.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelectedId(ticket.id)}
                    className={cn(
                      'h-14 flex-row items-center gap-3 rounded-2xl px-4',
                      active ? 'border-2 border-accent bg-background' : 'border border-border bg-background',
                    )}
                  >
                    <View className={cn('h-5 w-5 items-center justify-center rounded-full border-2', active ? 'border-accent' : 'border-foreground-muted')}>
                      {active ? <View className="h-2.5 w-2.5 rounded-full bg-accent" /> : null}
                    </View>
                    <Text variant="subheading" className="flex-1">
                      {t('myTickets.cancel.ticketLabel', { tier: tierLabel, index: indexOf(ticket) })}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {shortCode(ticket.code)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="gap-2.5 rounded-2xl bg-background p-4">
              <View className="flex-row justify-between">
                <Text variant="bodySm" tone="secondary">
                  {t('myTickets.cancel.price')}
                </Text>
                <Text variant="bodySmStrong">{formatMoney(price)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text variant="bodySm" tone="secondary">
                  {t('myTickets.cancel.fee', { percent: 100 - REFUND_PERCENT })}
                </Text>
                <Text variant="bodySmStrong" tone="invalid">
                  {`−${formatMoney(price - refund)}`}
                </Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row items-center justify-between">
                <View className="gap-0.5">
                  <Text variant="subheading">{t('myTickets.cancel.youGet')}</Text>
                  {bundle.payment ? (
                    <Text variant="captionSm" tone="muted">
                      {t('myTickets.cancel.to', { phone: formatPhone(bundle.payment.phone) })}
                    </Text>
                  ) : null}
                </View>
                <Text variant="amountLg" tone="accent">
                  {formatMoney(refund)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2">
              <Ionicons name="time" size={16} color={colors.warning} />
              <Text variant="caption" tone="secondary" className="flex-1">
                {t('myTickets.cancel.cutoff', {
                  when: formatDayMonthTime(new Date(refundCutoff(bundle)).toISOString(), language),
                  hours: REFUND_CUTOFF_HOURS,
                })}
              </Text>
            </View>

            {error ? (
              <Text variant="bodySm" tone="invalid" accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <View className="gap-3">
              <Button
                variant="danger"
                label={t('myTickets.cancel.confirm', { amount: formatMoney(refund) })}
                loading={cancelling}
                disabled={!selected}
                onPress={() => selected && onConfirm(selected)}
              />
              <Button variant="outline" label={t('myTickets.cancel.keep')} onPress={onClose} disabled={cancelling} />
            </View>
          </ScrollView>
        </View>
      </ThemeScope>
    </Modal>
  );
}
