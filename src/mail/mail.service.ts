import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private mailUser: string;

  constructor() {
    const host = process.env.HOST;
    const smtpPort = Number(process.env.SMTP);
    const mailUser = process.env.E_MAIL;
    const mailPassword = process.env.MAIL_PASSWORD;

    if (!host || !Number.isFinite(smtpPort) || !mailUser || !mailPassword) {
      throw new Error(
        'Faltan variables de entorno SMTP requeridas: HOST, SMTP, E_MAIL, MAIL_PASSWORD',
      );
    }

    this.mailUser = mailUser;
    this.transporter = nodemailer.createTransport({
      host,
      port: smtpPort,
      secure: true,
      auth: {
        user: mailUser,
        pass: mailPassword,
      },
    });
  }

  /**
   * Envía un correo con un archivo PDF adjunto.
   */
  async sendReportEmail(
    to: string,
    subject: string,
    bodyHtml: string,
    pdfBuffer: Buffer,
    pdfFilename: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"ShiftControl" <${this.mailUser}>`,
        to,
        subject,
        html: bodyHtml,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error al enviar el correo con el reporte.' + error.message,
      });
    }
  }
}
