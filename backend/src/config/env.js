const requiredEnv = [
  "JWT_SECRET"
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
});

console.log('✅ Environment variables validated');