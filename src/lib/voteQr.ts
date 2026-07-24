import QRCode from "qrcode";

/**
 * Generates a QR code pointing at this artwork's public voting page, as a
 * data URL (same pattern as the toilet-issue QR route) - no filesystem
 * write, so it works the same in local dev and on Vercel's read-only
 * serverless filesystem. Returns the data URL to store in
 * Artwork.votingQrUrl.
 */
export async function generateVotingQrCode(artworkId: string): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const votingUrl = `${baseUrl}/vote/${artworkId}`;

  return QRCode.toDataURL(votingUrl, { width: 400, margin: 2 });
}
