// Health check endpoint for Docker health check
export default function handler(req, res) {
  if (req.method === 'GET') {
    // Simple health check response
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'nextjs',
      version: process.env.npm_package_version || '1.0.0'
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}