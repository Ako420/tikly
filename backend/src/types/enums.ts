export const ROLES = ['attendee', 'organizer', 'provider', 'exhibitor', 'staff', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const SELF_SIGNUP_ROLES = ['attendee', 'organizer', 'provider', 'exhibitor'] as const;
export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];

export const LANGUAGES = ['en', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];

export const USER_STATUSES = ['active', 'suspended', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const EVENT_STATUSES = ['draft', 'pending', 'published', 'rejected', 'cancelled', 'completed', 'suspended'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const TIER_NAMES = ['standard', 'vip', 'vvip'] as const;
export type TierName = (typeof TIER_NAMES)[number];

export const ORDER_TYPES = ['ticket', 'service', 'slot'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'expired', 'refunded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ITEM_MODELS = ['TicketTier', 'Booking', 'Slot'] as const;
export type OrderItemModel = (typeof ORDER_ITEM_MODELS)[number];

export const TICKET_STATUSES = ['valid', 'checked_in', 'cancelled', 'refunded'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const CHECK_IN_TYPES = ['entry', 'reentry'] as const;
export type CheckInType = (typeof CHECK_IN_TYPES)[number];

export const PAYMENT_PROVIDERS = ['fapshi', 'campay'] as const;
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

export const TRANSACTION_KINDS = ['payment', 'refund'] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const TRANSACTION_STATUSES = ['pending', 'successful', 'failed'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const BUDGET_SOURCES = ['manual', 'tickets', 'slots', 'service'] as const;
export type BudgetSource = (typeof BUDGET_SOURCES)[number];

export const GUEST_SOURCES = ['manual', 'ticket'] as const;
export type GuestSource = (typeof GUEST_SOURCES)[number];

export const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const SERVICE_CATEGORIES = ['hall', 'chairs', 'canopy', 'sound', 'catering', 'decoration', 'other'] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_UNITS = ['per_day', 'per_item', 'per_event'] as const;
export type ServiceUnit = (typeof SERVICE_UNITS)[number];

export const BOOKING_STATUSES = ['requested', 'accepted', 'declined', 'paid', 'completed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const SLOT_BOOKING_STATUSES = ['pending', 'paid', 'expired', 'cancelled'] as const;
export type SlotBookingStatus = (typeof SLOT_BOOKING_STATUSES)[number];

export const REVIEW_TARGETS = ['event', 'provider'] as const;
export type ReviewTarget = (typeof REVIEW_TARGETS)[number];

export const NOTIFICATION_CHANNELS = ['push', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  'account_welcome',
  'password_reset',
  'event_pending',
  'event_approved',
  'event_rejected',
  'event_cancelled',
  'ticket_purchased',
  'ticket_refunded',
  'reminder_24h',
  'provider_pending',
  'provider_verified',
  'provider_rejected',
  'booking_requested',
  'booking_accepted',
  'booking_declined',
  'booking_cancelled',
  'booking_paid',
  'slot_booked',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
