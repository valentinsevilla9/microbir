/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Evita que Turbopack tome como raíz otra carpeta con un lockfile
    // (p. ej. un pnpm-lock.yaml suelto en el directorio de usuario)
    root: import.meta.dirname,
  },
};

export default nextConfig;
