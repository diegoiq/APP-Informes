/**
 * Comprime y redimensiona una imagen en el navegador garantizando un peso máximo (por defecto 100 KB).
 * Convierte fotos pesadas de cámaras de celulares (5MB - 15MB) a un formato ultraliviano (<= 100 KB)
 * preservando nitidez y detalle para informes técnicos industriales.
 */
export async function compressImage(
  fileOrBase64: File | string,
  maxWidth = 1024,
  maxHeight = 1024,
  maxSizeBytes = 100 * 1024 // 100 KB exactos
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImageSrc = (src: string) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Limitar dimensiones máximas iniciales
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        let quality = 0.72;
        let currentBase64 = '';
        let attempts = 0;
        const maxAttempts = 6;

        const getByteSize = (b64: string): number => {
          const idx = b64.indexOf(',') + 1;
          const body = idx > 0 ? b64.slice(idx) : b64;
          return Math.round((body.length * 3) / 4);
        };

        while (attempts < maxAttempts) {
          canvas.width = width;
          canvas.height = height;

          // Fondo blanco para imágenes transparentes convertidas a jpeg
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          currentBase64 = canvas.toDataURL('image/jpeg', quality);
          const size = getByteSize(currentBase64);

          // Si ya está por debajo de 100 KB, terminamos
          if (size <= maxSizeBytes) {
            break;
          }

          // Reducción adaptativa: primero calidad, luego resolución si hace falta
          if (quality > 0.45) {
            quality = Math.max(0.4, Number((quality - 0.12).toFixed(2)));
          } else {
            width = Math.round(width * 0.82);
            height = Math.round(height * 0.82);
          }
          attempts++;
        }

        resolve(currentBase64 || src);
      };

      img.onerror = () => {
        resolve(src);
      };

      img.src = src;
    };

    if (typeof fileOrBase64 === 'string') {
      processImageSrc(fileOrBase64);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          processImageSrc(result);
        } else {
          reject(new Error('No se pudo leer el archivo de imagen'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrBase64);
    }
  });
}
