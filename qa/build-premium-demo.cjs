// Generate the isolated demo from the real entrypoint, without a real API client.
const fs=require('node:fs');
let html=fs.readFileSync('index.html','utf8');
html=html.replace('<head>','<head>\n<base href="../">\n<meta http-equiv="Content-Security-Policy" content="connect-src \'none\'; form-action \'none\'; object-src \'none\'">');
html=html.replace(/<script src="https:\/\/unpkg.com\/@supabase\/supabase-js@2"><\/script>/,'<script src="./qa/premium-demo-backend.js"></script>');
html=html.replace(/<link[^>]*rel="manifest"[^>]*>/g,'');
html=html.replace('</body>','<script src="./qa/premium-demo-ui.js"></script>\n</body>');
if(html.includes('supabase-js@2'))throw new Error('Real Supabase client must never be loaded in the demo');
fs.writeFileSync('qa/premium-preview.html',html);
