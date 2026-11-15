export function decodeNativeAudio(body) {
  if (!['audio/mp4', 'audio/aac', 'audio/webm'].includes(body.mimeType) || typeof body.audioBase64 !== 'string' || body.audioBase64.length < 16 || body.audioBase64.length > 10 * 1024 * 1024 || body.audioBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.audioBase64)) {
    throw Error('녹음 파일 형식이나 길이를 확인해 주세요.');
  }
  return Buffer.from(body.audioBase64, 'base64');
}
