import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'**/*.spec.js',timeout:60000,workers:2,
 use:{baseURL:'http://127.0.0.1:4173',headless:true,reducedMotion:'reduce',launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}},
 webServer:{command:'npm run build && npm start',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:30000},
 reporter:[['list']],outputDir:'test-results'
});
