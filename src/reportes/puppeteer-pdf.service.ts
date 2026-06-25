import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
export class PuppeteerPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerPdfService.name);
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    return this.browser;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }

  async convertir(html: string): Promise<Buffer> {
    let page: Awaited<ReturnType<Browser['newPage']>> | undefined;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
      });
      return Buffer.from(pdf);
    } catch (err) {
      this.logger.error('Error al generar PDF con Puppeteer', err);
      throw new InternalServerErrorException({
        message: 'No se pudo generar el PDF',
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (page) {
        await page.close().catch(() => undefined);
      }
    }
  }
}
