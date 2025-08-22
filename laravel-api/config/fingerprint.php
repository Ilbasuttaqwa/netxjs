<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Fingerprint Device Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for fingerprint device integration
    |
    */

    'default_device' => [
        'ip' => env('FINGERPRINT_DEVICE_IP', '192.168.1.100'),
        'port' => env('FINGERPRINT_DEVICE_PORT', 4370),
        'username' => env('FINGERPRINT_DEVICE_USERNAME', 'admin'),
        'password' => env('FINGERPRINT_DEVICE_PASSWORD', '123456'),
        'timeout' => env('FINGERPRINT_DEVICE_TIMEOUT', 30),
    ],

    'nextjs_integration' => [
        'api_url' => env('NEXTJS_API_URL', 'http://localhost:3002/api'),
        'api_token' => env('NEXTJS_API_TOKEN', ''),
        'endpoints' => [
            'attendance' => '/fingerprint/realtime',
            'monitoring' => '/monitoring/devices',
        ],
    ],

    'api' => [
        'rate_limit' => env('API_RATE_LIMIT', 100),
        'throttle_minutes' => env('API_THROTTLE_MINUTES', 1),
        'token' => env('API_TOKEN', 'your-secure-api-token'),
    ],

    'webhook' => [
        'enabled' => env('WEBHOOK_ENABLED', true),
        'url' => env('WEBHOOK_URL', ''),
        'secret' => env('WEBHOOK_SECRET', ''),
    ],

    'sync' => [
        'auto_sync_enabled' => env('AUTO_SYNC_ENABLED', true),
        'sync_interval_minutes' => env('SYNC_INTERVAL_MINUTES', 5),
        'batch_size' => env('SYNC_BATCH_SIZE', 100),
    ],

    'logging' => [
        'enabled' => env('FINGERPRINT_LOGGING_ENABLED', true),
        'level' => env('FINGERPRINT_LOG_LEVEL', 'info'),
        'channel' => env('FINGERPRINT_LOG_CHANNEL', 'daily'),
    ],
];