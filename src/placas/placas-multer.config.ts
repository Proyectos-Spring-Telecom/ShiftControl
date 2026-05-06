import * as multer from 'multer';

/** Imagen de placa: memoria, PNG/JPEG, hasta 12 MB. */
export const PLACAS_IMAGE_MULTER: multer.Options = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Solo se permiten imágenes PNG o JPEG'), false);
      return;
    }
    cb(null, true);
  },
};
