import aws from 'aws-sdk';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// ✅ AWS S3 Configuration
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

const s3 = new aws.S3();

// ✅ Multer Storage (Temporary Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error(
        'Invalid file type! Only JPG and PNG images are allowed.',
      );
      error.statusCode = 400;
      cb(error, false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB File Size Limit
});

// ✅ Function to Upload File to S3
const uploadToS3 = async (buffer, fileName, contentType) => {
  const fileKey = `uploads/${uuidv4()}-${fileName.replace(/\s+/g, '-')}`;
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) reject(err);
      else resolve(data.Location);
    });
  });
};

// ✅ Middleware to Resize, Compress & Upload Image
const processAndUploadImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const optimizedBuffer = await sharp(req.file.buffer)
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload Processed Image to S3
    const fileUrl = await uploadToS3(
      optimizedBuffer,
      req.file.originalname,
      'image/jpeg',
    );

    // Attach Uploaded Image URL to req.file
    req.file.location = fileUrl;

    next();
  } catch (error) {
    console.error('Image Processing Error:', error);
    res.status(400).json({ error: 'Error processing image' });
  }
};

export { upload, processAndUploadImage, uploadToS3 };
