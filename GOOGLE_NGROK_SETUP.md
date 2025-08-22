# Google OAuth & Ngrok Configuration Guide

## Google OAuth Setup

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API and Google OAuth2 API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-ngrok-domain.ngrok.io/api/auth/callback/google`

### 2. Environment Variables
Update your `.env` file with your Google credentials:
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_API_KEY=your-google-api-key-here
```

## Ngrok Setup

### 1. Install Ngrok
1. Download ngrok from [https://ngrok.com/download](https://ngrok.com/download)
2. Extract and add to your PATH
3. Sign up for ngrok account at [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)

### 2. Get Auth Token
1. Go to [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
2. Copy your auth token

### 3. Configure Ngrok
Update your `.env` file:
```env
NGROK_AUTH_TOKEN=your-ngrok-auth-token-here
NGROK_DOMAIN=your-custom-domain.ngrok.io  # Optional: for paid plans
NEXT_PUBLIC_NGROK_URL=https://your-custom-domain.ngrok.io
```

Update `ngrok.yml` file:
```yaml
authtoken: your-ngrok-auth-token-here
```

### 4. Start Ngrok Tunnel

#### Option 1: Using PowerShell Script
```powershell
.\start-ngrok.ps1
```

#### Option 2: Manual Command
```bash
ngrok start --config ngrok.yml afms-app
```

#### Option 3: Simple HTTP Tunnel
```bash
ngrok http 3000
```

## Usage

1. Start your Next.js application:
   ```bash
   npm run dev
   # or
   docker run -p 3000:3000 afms-nextjs
   ```

2. Start ngrok tunnel:
   ```powershell
   .\start-ngrok.ps1
   ```

3. Access your application:
   - Local: `http://localhost:3000`
   - Public: `https://your-ngrok-url.ngrok.io`

## Security Notes

- Never commit your actual tokens to version control
- Use environment variables for sensitive data
- Regularly rotate your API keys and tokens
- For production, use proper SSL certificates instead of ngrok

## Troubleshooting

### Common Issues
1. **Ngrok not found**: Make sure ngrok is installed and in your PATH
2. **Auth token invalid**: Check your ngrok auth token in dashboard
3. **Google OAuth error**: Verify redirect URIs in Google Cloud Console
4. **Port already in use**: Make sure port 3000 is available

### Useful Commands
```bash
# Check ngrok status
ngrok status

# List active tunnels
ngrok tunnels list

# Stop all tunnels
ngrok tunnels stop-all
```