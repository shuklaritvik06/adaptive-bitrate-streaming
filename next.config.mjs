/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
};

async function loadSecrets() {
  try {
    const secretData = JSON.parse(process.env.SECRETS ?? {})
    if ('SecretString' in secretData) {
      const secret = JSON.parse(secretData.SecretString);
      process.env.APP_AWS_REGION = secret.APP_AWS_REGION;
      process.env.APP_AWS_ACCESS_KEY_ID = secret.APP_AWS_ACCESS_KEY_ID;
      process.env.APP_AWS_SECRET_ACCESS_KEY = secret.APP_AWS_SECRET_ACCESS_KEY;
      process.env.VIDEOS_BUCKET = secret.VIDEOS_BUCKET;
      process.env.NEXT_PUBLIC_STREAM_URL = secret.NEXT_PUBLIC_STREAM_URL;
    }
  } catch (error) {
    console.error("Failed to retrieve secret:", error);
  }
}

loadSecrets();

export default nextConfig;
