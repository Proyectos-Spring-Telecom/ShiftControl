import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import sharp from 'sharp';

@Injectable()
export class ReporteImagenService {
  private readonly logger = new Logger(ReporteImagenService.name);

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
    const map = new Map<string, string>();
    if (unicas.length === 0) {
      return map;
    }

    const maxWidth = this.resolveMaxWidth();
    const quality = this.resolveQuality();
    this.logger.log(
      `Comprimiendo ${unicas.length} imagen(es) para PDF (maxWidth=${maxWidth}, quality=${quality})`,
    );

    await Promise.all(
      unicas.map(async (url) => {
        const src = await this.comprimirUrl(url, maxWidth, quality);
        if (src) {
          map.set(url, src);
        }
      }),
    );

    return map;
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
      const input = Buffer.from(response.data);
      const compressed = await sharp(input)
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

      this.logger.debug(
        `Imagen comprimida ${url}: ${input.length} → ${compressed.length} bytes`,
      );
      return `data:image/jpeg;base64,${compressed.toString('base64')}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudo comprimir imagen ${url}: ${msg}; se usará URL original`);
      return url;
    }
  }
}
