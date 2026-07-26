import { base64UrlDecode } from './base64url';

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerSegment: string; // raw, untouched
  payloadSegment: string; // raw, untouched
  signature: string; // raw, untouched
}

export class JwtFormatError extends Error {}

/** Split + decode a JWT string into header/payload/signature. Throws JwtFormatError on malformed input. */
export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new JwtFormatError('Token must have 3 parts separated by "."');
  }
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = parseJsonPart(headerPart, 'header');
  const payload = parseJsonPart(payloadPart, 'payload');

  // don't re-derive segments from JSON.stringify — that'd reformat tokens from other libs and break their signatures
  return { header, payload, headerSegment: headerPart, payloadSegment: payloadPart, signature: signaturePart };
}

function parseJsonPart(part: string, label: string): Record<string, unknown> {
  if (!part) throw new JwtFormatError(`Missing ${label} segment`);
  let decoded: string;
  try {
    decoded = base64UrlDecode(part);
  } catch {
    throw new JwtFormatError(`${label} is not valid base64url`);
  }
  try {
    return JSON.parse(decoded);
  } catch {
    throw new JwtFormatError(`${label} is not valid JSON`);
  }
}


/** Build signing input directly from encoded segments — preserves exact original bytes. */
export function signingInputFromSegments(headerSegment: string, payloadSegment: string): string {
  return `${headerSegment}.${payloadSegment}`;
}

/** Combine a signing input with a signature segment (base64url, no padding) into a full token. */
export function assembleToken(signingInput: string, signatureB64Url: string): string {
  return `${signingInput}.${signatureB64Url}`;
}
