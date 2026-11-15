import { presignS3Url } from '../src/services/presign';

describe('SigV4 presigned URLs', () => {
  // The worked example in the AWS S3 documentation, "Authenticating Requests: Using Query Parameters".
  it('reproduces the AWS documentation example signature', () => {
    const url = presignS3Url({
      method: 'GET',
      host: 'examplebucket.s3.amazonaws.com',
      path: '/test.txt',
      region: 'us-east-1',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      expiresSeconds: 86400,
      now: new Date('2013-05-24T00:00:00Z'),
    });
    expect(url).toBe(
      'https://examplebucket.s3.amazonaws.com/test.txt' +
        '?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
        '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request' +
        '&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host' +
        '&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
    );
  });

  it('binds the upload to its content type', () => {
    const base = {
      method: 'PUT' as const,
      host: 'acct.r2.cloudflarestorage.com',
      path: '/bucket/uploads/u1/photo.jpg',
      region: 'auto',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      expiresSeconds: 600,
      now: new Date('2026-11-14T00:00:00Z'),
    };
    const jpeg = presignS3Url({ ...base, signedHeaders: { 'content-type': 'image/jpeg' } });
    const png = presignS3Url({ ...base, signedHeaders: { 'content-type': 'image/png' } });
    expect(jpeg).toContain('X-Amz-SignedHeaders=content-type%3Bhost');
    expect(jpeg.split('X-Amz-Signature=')[1]).not.toBe(png.split('X-Amz-Signature=')[1]);
  });
});
