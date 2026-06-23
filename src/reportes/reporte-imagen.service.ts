import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const LOGO_FILE = 'spring-logo-vertical.png';

@Injectable()
export class ReporteImagenService {
  private logoDataUri: string | null = null;

  getLogoDataUri(): string {
    if (this.logoDataUri) {
      return this.logoDataUri;
    }
    const logoPath = this.resolveLogoPath();
    const buffer = fs.readFileSync(logoPath);
    this.logoDataUri = `data:image/png;base64,${buffer.toString('base64')}`;
    return this.logoDataUri;
  }

  private resolveLogoPath(): string {
    const candidates = [
      path.join(__dirname, 'assets', LOGO_FILE),
      path.join(process.cwd(), 'dist', 'src', 'reportes', 'assets', LOGO_FILE),
      path.join(process.cwd(), 'dist', 'reportes', 'assets', LOGO_FILE),
      path.join(process.cwd(), 'src', 'reportes', 'assets', LOGO_FILE),
    ];
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) {
      throw new Error(`Logo no encontrado: ${LOGO_FILE}`);
    }
    return found;
  }

  normalizeImageUrl(raw: unknown): string | null {
    if (raw == null) {
      return null;
    }
    const s = String(raw).trim();
    if (!s || s === 'null' || s === 'undefined') {
      return null;
    }
    if (/^https?:\/\//i.test(s)) {
      return s;
    }
    return null;
  }

  async comprimirUrls(urls: string[]): Promise<Map<string, string>> {
    const unicas = [...new Set(urls)];
    if (unicas.length === 0) {
      return new Map();
    }

    const maxWidth = this.resolveMaxWidth();
    const quality = this.resolveQuality();
    const entries = await Promise.all(
      unicas.map(async (url) => {
        const src = await this.comprimirUrl(url, maxWidth, quality);
        return src ? ([url, src] as const) : null;
      }),
    );

    return new Map(entries.filter((entry): entry is [string, string] => entry != null));
  }

  private resolveMaxWidth(): number {
    const n = Number(process.env.PDF_IMAGE_MAX_WIDTH);
    return Number.isFinite(n) && n > 0 ? n : 800;
  }

  private resolveQuality(): number {
    const n = Number(process.env.PDF_IMAGE_QUALITY);
    return Number.isFinite(n) && n >= 1 && n <= 100 ? n : 75;
  }

  private async comprimirUrl(
    url: string,
    maxWidth: number,
    quality: number,
  ): Promise<string | null> {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 30_000,
        maxContentLength: 25 * 1024 * 1024,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const compressed = await sharp(Buffer.from(response.data))
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

      return `data:image/jpeg;base64,${compressed.toString('base64')}`;
    } catch {
      return url;
    }
  }
}
