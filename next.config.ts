import type { NextConfig } from 'next';
const config: NextConfig = {
 poweredByHeader:false,
 experimental:{cpus:2},
 // Prisma's JS query compiler loads a WASM asset at runtime. Ensure Vercel's
 // Next.js serverless file tracing includes the generated client assets.
 // Without them, requests can fail with Prisma code ENOENT after a successful build.
 outputFileTracingIncludes: {
  '/*': [
   './public/fonts/OpenSans-Regular.ttf',
   './node_modules/.prisma/client/**/*',
   './node_modules/@prisma/client/runtime/*.wasm',
  ],
 },
 async headers(){return [
  {source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}]},
  {source:'/api/:path*',headers:[{key:'Cache-Control',value:'private, no-store'}]}
 ]}
};
export default config;
