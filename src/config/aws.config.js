import aws from 'aws-sdk';

aws.config.update({
  credentials: new aws.Credentials({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  }),
  region: process.env.AWS_REGION,
  sslEnabled: true,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

export const s3Client = new aws.S3();

export const lambdaClient = new aws.Lambda();