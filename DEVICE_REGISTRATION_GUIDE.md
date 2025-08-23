# Device Registration and Cloud Configuration Guide

This guide explains how to register fingerprint devices and configure cloud server settings in the AFMS system.

## Overview

The AFMS system now supports:
- Manual device registration through admin interface
- Automatic device registration via API
- Cloud server configuration for device synchronization
- Real-time device monitoring and status tracking

## Device Registration

### Manual Registration (Admin Interface)

1. **Access Device Management**
   - Login as admin
   - Navigate to "Device Management" in the sidebar
   - Click "Add Device" button

2. **Fill Device Information**
   - Device ID: Unique identifier for the device
   - Name: Human-readable device name
   - Type: fingerprint, face, or card
   - Branch: Select the branch where device is located
   - IP Address: Device network IP (optional)
   - Port: Device network port (optional)
   - Location: Physical location description
   - Notes: Additional information
   - Firmware Version: Current device firmware

### Automatic Registration (API)

**Endpoint:** `POST /api/devices/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "device_id": "FP001",
  "nama": "Fingerprint Scanner - Main Entrance",
  "tipe": "fingerprint",
  "cabang_id": 1,
  "ip_address": "192.168.1.100",
  "port": "4370",
  "lokasi": "Main Entrance",
  "keterangan": "Primary entrance scanner",
  "firmware_version": "1.2.3",
  "registration_key": "your-registration-key"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "device": {
      "id": 1,
      "device_id": "FP001",
      "nama": "Fingerprint Scanner - Main Entrance",
      "tipe": "fingerprint",
      "status": "aktif",
      "cabang": {
        "id": 1,
        "nama_cabang": "Head Office",
        "alamat_cabang": "Jakarta"
      }
    },
    "cloud_config": {
      "server_url": "https://your-cloud-server.com/api",
      "api_key": "your-api-key",
      "sync_interval": 300,
      "retry_attempts": 3,
      "timeout": 30000
    }
  }
}
```

## Cloud Server Configuration

### Access Cloud Configuration

1. Login as admin
2. Navigate to "Cloud Config" in the sidebar
3. Configure the following settings:

### Server Settings

- **Server URL**: The cloud server endpoint URL
- **API Key**: Authentication key for cloud server access

### Synchronization Settings

- **Sync Interval**: How often devices sync with cloud (60-3600 seconds)
- **Retry Attempts**: Number of retry attempts on failure (1-10)
- **Timeout**: Request timeout in milliseconds (5000-120000)

### Advanced Settings

- **Enable Auto Sync**: Automatic synchronization at specified intervals
- **Enable Offline Mode**: Store data locally when server is unavailable
- **Max Offline Records**: Maximum records to store offline (100-10000)

### API Endpoints

#### Get Cloud Configuration
**GET** `/api/devices/cloud-config`

#### Save Cloud Configuration
**POST** `/api/devices/cloud-config`

#### Update Cloud Configuration
**PUT** `/api/devices/cloud-config?id={config_id}`

#### Delete Cloud Configuration
**DELETE** `/api/devices/cloud-config?id={config_id}`

## Device Monitoring

### Real-time Monitoring

1. Navigate to "Device Monitoring" in the admin sidebar
2. View real-time device status:
   - Online/Offline status
   - Last sync time
   - Firmware version
   - Error messages
   - Network information

### Device Status Tracking

The system automatically tracks:
- Device registration events
- Sync status and history
- Error logs and troubleshooting information
- Network connectivity status
- Firmware version updates

## Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Device Registration
DEVICE_REGISTRATION_KEY=your-secure-registration-key

# Cloud Server Configuration
CLOUD_SERVER_URL=https://your-cloud-server.com/api
CLOUD_API_KEY=your-cloud-api-key
SYNC_INTERVAL=300
RETRY_ATTEMPTS=3
TIMEOUT=30000
```

## Security Considerations

1. **Registration Key**: Use a strong, unique registration key
2. **API Key**: Rotate cloud API keys regularly
3. **Network Security**: Ensure devices are on secure networks
4. **Access Control**: Only admin users can manage devices and cloud config
5. **Data Encryption**: Use HTTPS for all cloud communications

## Troubleshooting

### Common Issues

1. **Device Registration Failed**
   - Check registration key
   - Verify branch ID exists
   - Ensure device ID is unique

2. **Cloud Sync Issues**
   - Verify server URL and API key
   - Check network connectivity
   - Review timeout settings

3. **Device Offline**
   - Check device network connection
   - Verify IP address and port
   - Review device logs

### Monitoring Tools

- Device status dashboard
- Sync history logs
- Error message tracking
- Network connectivity tests

## Integration Examples

### Device SDK Integration

```javascript
// Example device registration
const registerDevice = async () => {
  const response = await fetch('/api/devices/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      device_id: 'FP001',
      nama: 'Main Entrance Scanner',
      tipe: 'fingerprint',
      cabang_id: 1,
      registration_key: process.env.DEVICE_REGISTRATION_KEY
    })
  });
  
  const result = await response.json();
  if (result.success) {
    // Store cloud configuration
    const cloudConfig = result.data.cloud_config;
    // Initialize device with cloud settings
  }
};
```

### Cloud Sync Implementation

```javascript
// Example sync implementation
const syncWithCloud = async (attendanceData) => {
  const config = await getCloudConfig();
  
  try {
    const response = await fetch(`${config.server_url}/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(attendanceData),
      timeout: config.timeout
    });
    
    return await response.json();
  } catch (error) {
    // Handle offline mode
    if (config.enable_offline_mode) {
      storeOfflineData(attendanceData);
    }
    throw error;
  }
};
```

## Support

For technical support or questions about device registration and cloud configuration, please contact the system administrator or refer to the API documentation.