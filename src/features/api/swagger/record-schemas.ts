import type { SchemaObject } from '@nestjs/swagger';

export const recordSchemas: Record<string, SchemaObject> = {
  users: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      keycloak_id: {
        type: 'string',
        description: 'keycloak id',
      },
      fullname: {
        type: 'string',
        description: 'fullname',
      },
      email: {
        type: 'string',
        description: 'email',
      },
      phone_number: {
        type: 'string',
        description: 'phone number',
        nullable: true,
      },
      avatar_url: {
        type: 'string',
        description: 'avatar url',
        nullable: true,
      },
      gender: {
        type: 'string',
        description: 'gender',
        nullable: true,
      },
      dob: {
        type: 'string',
        description: 'dob',
        format: 'date',
        nullable: true,
      },
      status: {
        type: 'string',
        description: 'status',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'keycloak_id',
      'fullname',
      'email',
      'status',
      'created_at',
      'updated_at',
    ],
  },
  customers: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      user_id: {
        type: 'string',
        description: 'user id',
        format: 'uuid',
      },
      location: {
        type: 'string',
        description: 'location',
        nullable: true,
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: ['id', 'user_id', 'created_at', 'updated_at'],
  },
  admins: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      user_id: {
        type: 'string',
        description: 'user id',
        format: 'uuid',
      },
      is_active: {
        type: 'boolean',
        description: 'is active',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: ['id', 'user_id', 'is_active', 'created_at', 'updated_at'],
  },
  photographers: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      user_id: {
        type: 'string',
        description: 'user id',
        format: 'uuid',
      },
      tax_code: {
        type: 'string',
        description: 'tax code',
        nullable: true,
      },
      styles: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      started_career_at: {
        type: 'number',
        description: 'Year the photographer started their career',
        nullable: true,
      },
      description: {
        type: 'string',
        description: 'description',
      },
      is_verified: {
        type: 'boolean',
        description: 'is verified',
      },
      verification_status: {
        type: 'string',
        description: 'verification status',
        enum: ['unverified', 'pending', 'verified', 'rejected'],
      },
      approved_by: {
        type: 'string',
        description: 'approved by',
        format: 'uuid',
        nullable: true,
      },
      location: {
        type: 'string',
        description: 'location',
      },
      is_available: {
        type: 'boolean',
        description: 'is available',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'user_id',
      'styles',
      'description',
      'is_verified',
      'location',
      'is_available',
      'created_at',
      'updated_at',
    ],
  },
  ratings: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      photographer_id: {
        type: 'string',
        description: 'photographer id',
        format: 'uuid',
      },
      average_rating: {
        type: 'number',
        description: 'average rating',
      },
      total_feedbacks: {
        type: 'number',
        description: 'total feedbacks',
      },
      total_bookings: {
        type: 'number',
        description: 'total bookings',
      },
      return_customers: {
        type: 'number',
        description: 'return customers',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'photographer_id',
      'average_rating',
      'total_feedbacks',
      'total_bookings',
      'return_customers',
      'created_at',
      'updated_at',
    ],
  },
  booking_plans: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'id', format: 'uuid' },
      photographer_id: {
        type: 'string',
        description: 'photographer id',
        format: 'uuid',
      },
      name: { type: 'string', description: 'name' },
      description: {
        type: 'string',
        description: 'description',
        nullable: true,
      },
      price: { type: 'number', description: 'price (VND)' },
      duration_minutes: { type: 'number', description: 'duration minutes' },
      photo_count: { type: 'number', description: 'photo count' },
      retouched_photo_count: {
        type: 'number',
        description: 'retouched photo count',
      },
      features: {
        type: 'array',
        description: 'features',
        items: { type: 'string' },
      },
      is_active: { type: 'boolean', description: 'is active' },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'photographer_id',
      'name',
      'price',
      'duration_minutes',
      'photo_count',
      'retouched_photo_count',
      'features',
      'is_active',
      'created_at',
      'updated_at',
    ],
  },
  photographer_plans: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      code: {
        type: 'string',
        description: 'code',
      },
      name: {
        type: 'string',
        description: 'name',
      },
      description: {
        type: 'string',
        description: 'description',
        nullable: true,
      },
      price: {
        type: 'number',
        description: 'price',
      },
      is_active: {
        type: 'boolean',
        description: 'is active',
      },
      billing_cycle: {
        type: 'number',
        description: 'billing cycle',
      },
      features: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            name: { type: 'string' },
            value: { type: 'string' },
          },
          required: ['code', 'name', 'value'],
        },
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'code',
      'name',
      'price',
      'is_active',
      'billing_cycle',
      'features',
      'created_at',
      'updated_at',
    ],
  },
  subscriptions: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      photographer_id: {
        type: 'string',
        description: 'photographer id',
        format: 'uuid',
      },
      plan_id: {
        type: 'string',
        description: 'plan id',
        format: 'uuid',
      },
      start_at: {
        type: 'string',
        description: 'start at',
        format: 'date-time',
      },
      end_at: {
        type: 'string',
        description: 'end at',
        format: 'date-time',
      },
      status: {
        type: 'string',
        description: 'status',
      },
      auto_renew: {
        type: 'boolean',
        description: 'auto renew',
      },
      price: {
        type: 'number',
        description: 'price',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'photographer_id',
      'plan_id',
      'start_at',
      'end_at',
      'status',
      'auto_renew',
      'price',
      'created_at',
      'updated_at',
    ],
  },
  offline_slots: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      photographer_id: {
        type: 'string',
        description: 'photographer id',
        format: 'uuid',
      },
      from: {
        type: 'string',
        description: 'from',
        format: 'date-time',
      },
      to: {
        type: 'string',
        description: 'to',
        format: 'date-time',
      },
      reason: {
        type: 'string',
        description: 'reason',
        nullable: true,
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'photographer_id',
      'from',
      'to',
      'created_at',
      'updated_at',
    ],
  },
  bookings: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      customer_id: {
        type: 'string',
        description: 'customer id',
        format: 'uuid',
      },
      photographer_id: {
        type: 'string',
        description: 'photographer id',
        format: 'uuid',
      },
      booking_plan_id: {
        type: 'string',
        description: 'booking plan id',
        format: 'uuid',
      },
      location: {
        type: 'string',
        description: 'location',
      },
      from: {
        type: 'string',
        description: 'from',
        format: 'date-time',
      },
      to: {
        type: 'string',
        description: 'to',
        format: 'date-time',
      },
      deposit_amount: {
        type: 'number',
        description: 'deposit amount',
      },
      total_amount: {
        type: 'number',
        description: 'total amount',
      },
      status: {
        type: 'string',
        description: 'status',
      },
      accepted_at: {
        type: 'string',
        description:
          'when the photographer accepted; the deposit is due 24 hours later or at the shoot start',
        format: 'date-time',
        nullable: true,
      },
      gallery_published_at: {
        type: 'string',
        description: 'gallery published at',
        format: 'date-time',
        nullable: true,
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'customer_id',
      'photographer_id',
      'booking_plan_id',
      'location',
      'from',
      'to',
      'deposit_amount',
      'total_amount',
      'status',
      'created_at',
      'updated_at',
    ],
  },
  booking_status_history: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      booking_id: {
        type: 'string',
        description: 'booking id',
        format: 'uuid',
      },
      from_status: {
        type: 'string',
        description: 'status before the change; null on the creation row',
        nullable: true,
        enum: [
          'pending',
          'accepted',
          'rejected',
          'cancelled',
          'expired',
          'in_progress',
          'shot',
          'completed',
        ],
      },
      to_status: {
        type: 'string',
        description: 'status after the change',
        enum: [
          'pending',
          'accepted',
          'rejected',
          'cancelled',
          'expired',
          'in_progress',
          'shot',
          'completed',
        ],
      },
      actor_role: {
        type: 'string',
        description: 'who made the change',
        enum: ['customer', 'photographer', 'admin', 'system'],
      },
      actor_user_id: {
        type: 'string',
        description: 'user who made the change; null for background jobs',
        format: 'uuid',
        nullable: true,
      },
      reason: {
        type: 'string',
        description: 'reason (reject / cancel)',
        nullable: true,
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'booking_id',
      'to_status',
      'actor_role',
      'created_at',
      'updated_at',
    ],
  },
  booking_collaborators: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'id', format: 'uuid' },
      booking_id: { type: 'string', description: 'booking id', format: 'uuid' },
      photographer_id: {
        type: 'string',
        description: 'invited photographer id',
        format: 'uuid',
      },
      share_percent: {
        type: 'integer',
        description: 'share of the photographers payout, 1-100',
        minimum: 1,
        maximum: 100,
      },
      status: {
        type: 'string',
        description: 'invitation status',
        enum: ['invited', 'accepted', 'declined', 'revoked'],
      },
      responded_at: {
        type: 'string',
        description: 'when the invited photographer accepted or declined',
        format: 'date-time',
        nullable: true,
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'booking_id',
      'photographer_id',
      'share_percent',
      'status',
      'created_at',
      'updated_at',
    ],
  },
  wallets: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      user_id: {
        type: 'string',
        description: 'user id',
        format: 'uuid',
      },
      balance: {
        type: 'number',
        description: 'balance',
      },
      frozen_balance: {
        type: 'number',
        description: 'frozen balance',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'user_id',
      'balance',
      'frozen_balance',
      'created_at',
      'updated_at',
    ],
  },
  transactions: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      user_id: {
        type: 'string',
        description: 'user id',
        format: 'uuid',
      },
      transaction_code: {
        type: 'string',
        description: 'transaction code',
      },
      type: {
        type: 'string',
        description: 'type',
      },
      reference_id: {
        type: 'string',
        description: 'reference id',
        format: 'uuid',
      },
      direction: {
        type: 'string',
        description: 'direction',
      },
      amount: {
        type: 'number',
        description: 'amount',
      },
      currency: {
        type: 'string',
        description: 'currency',
      },
      description: {
        type: 'string',
        description: 'description',
      },
      status: {
        type: 'string',
        description: 'status',
      },
      payment_gateway: {
        type: 'string',
        description: 'payment gateway',
      },
      provider_order_code: {
        type: 'number',
        description: 'provider order code',
      },
      checkout_url: {
        type: 'string',
        description: 'checkout url',
        nullable: true,
      },
      qr_code: {
        type: 'string',
        description: 'qr code',
        nullable: true,
      },
      idempotency_key: {
        type: 'string',
        description: 'idempotency key',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'user_id',
      'transaction_code',
      'type',
      'reference_id',
      'direction',
      'amount',
      'currency',
      'description',
      'status',
      'payment_gateway',
      'provider_order_code',
      'idempotency_key',
      'created_at',
      'updated_at',
    ],
  },
  payment_webhooks: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      provider: {
        type: 'string',
        description: 'provider',
      },
      reference: {
        type: 'string',
        description: 'reference',
      },
      transaction_id: {
        type: 'string',
        description: 'transaction id',
        format: 'uuid',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'provider',
      'reference',
      'transaction_id',
      'created_at',
      'updated_at',
    ],
  },
  refund_requests: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      transaction_id: {
        type: 'string',
        description: 'transaction id',
        format: 'uuid',
      },
      user_id: {
        type: 'string',
        description: 'user id',
        format: 'uuid',
      },
      amount: {
        type: 'number',
        description: 'amount',
      },
      reason: {
        type: 'string',
        description: 'reason',
      },
      status: {
        type: 'string',
        description: 'status',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'transaction_id',
      'user_id',
      'amount',
      'reason',
      'status',
      'created_at',
      'updated_at',
    ],
  },
  media: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      user_id: {
        type: 'string',
        description: 'user id',
        format: 'uuid',
      },
      file_key: {
        type: 'string',
        description: 'file key',
      },
      file_size: {
        type: 'number',
        description: 'file size',
      },
      content_type: {
        type: 'string',
        description: 'content type',
      },
      status: {
        type: 'string',
        description: 'status',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'user_id',
      'file_key',
      'file_size',
      'content_type',
      'status',
      'created_at',
      'updated_at',
    ],
  },
  portfolios: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      photographer_id: {
        type: 'string',
        description: 'photographer id',
        format: 'uuid',
      },
      name: {
        type: 'string',
        description: 'name',
      },
      category: {
        type: 'string',
        description: 'category',
        nullable: true,
      },
      description: {
        type: 'string',
        description: 'description',
      },
      cover_media_id: {
        type: 'string',
        description: 'cover media id',
        format: 'uuid',
        nullable: true,
      },
      items: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'photographer_id',
      'name',
      'description',
      'items',
      'created_at',
      'updated_at',
    ],
  },
  booking_deliveries: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      booking_id: {
        type: 'string',
        description: 'booking id',
        format: 'uuid',
      },
      title: {
        type: 'string',
        description: 'title',
      },
      media_ids: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'booking_id',
      'title',
      'media_ids',
      'created_at',
      'updated_at',
    ],
  },
  feedbacks: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      photographer_id: {
        type: 'string',
        description: 'reviewed photographer id',
        format: 'uuid',
      },
      booking_id: {
        type: 'string',
        description: 'booking id',
        format: 'uuid',
      },
      customer_id: {
        type: 'string',
        description: 'customer id',
        format: 'uuid',
      },
      rating: {
        type: 'number',
        description: 'rating',
      },
      punctuality_rating: {
        type: 'number',
        description: 'punctuality rating',
      },
      attitude_rating: {
        type: 'number',
        description: 'attitude rating',
      },
      comment: {
        type: 'string',
        description: 'comment',
      },
      is_edited: {
        type: 'boolean',
        description: 'is edited',
      },
      is_visible: {
        type: 'boolean',
        description: 'is visible',
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'booking_id',
      'customer_id',
      'rating',
      'punctuality_rating',
      'attitude_rating',
      'comment',
      'is_edited',
      'is_visible',
      'created_at',
      'updated_at',
    ],
  },
  reports: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      user_id: {
        type: 'string',
        description: 'user id',
        format: 'uuid',
      },
      target_type: {
        type: 'string',
        description: 'target type',
      },
      target_id: {
        type: 'string',
        description: 'target id',
        format: 'uuid',
      },
      reason: {
        type: 'string',
        description: 'reason',
      },
      evidence_media_ids: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
      },
      status: {
        type: 'string',
        description: 'status',
      },
      resolution: {
        type: 'string',
        description: 'resolution',
        nullable: true,
      },
      resolved_by: {
        type: 'string',
        description: 'resolved by',
        format: 'uuid',
        nullable: true,
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'user_id',
      'target_type',
      'target_id',
      'reason',
      'evidence_media_ids',
      'status',
      'created_at',
      'updated_at',
    ],
  },
  outbox_events: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'id',
        format: 'uuid',
      },
      topic: {
        type: 'string',
        description: 'topic',
      },
      recipient_ids: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      payload: {
        type: 'object',
        description: 'payload',
      },
      processed_at: {
        type: 'string',
        description: 'processed at',
        format: 'date-time',
        nullable: true,
      },
      created_at: {
        type: 'string',
        description: 'created at',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        description: 'updated at',
        format: 'date-time',
      },
    },
    required: [
      'id',
      'topic',
      'recipient_ids',
      'payload',
      'created_at',
      'updated_at',
    ],
  },
};
