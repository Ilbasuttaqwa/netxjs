"use strict";(()=>{var e={};e.id=3587,e.ids=[3587],e.modules={3524:e=>{e.exports=require("@prisma/client")},9344:e=>{e.exports=require("jsonwebtoken")},145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},6249:(e,s)=>{Object.defineProperty(s,"l",{enumerable:!0,get:function(){return function e(s,t){return t in s?s[t]:"then"in s&&"function"==typeof s.then?s.then(s=>e(s,t)):"function"==typeof s&&"default"===t?s:void 0}}})},5484:(e,s,t)=>{t.r(s),t.d(s,{config:()=>E,default:()=>f,routeModule:()=>T});var r={};t.r(r),t.d(r,{default:()=>l});var n=t(1802),a=t(7153),u=t(6249),i=t(3524),o=t(3382);let c=new i.PrismaClient;async function d(e,s){try{if("GET"===e.method){let e=await c.$queryRaw`
        SELECT * FROM cloud_config ORDER BY created_at DESC LIMIT 1
      `;if(0===e.length){let e={server_url:process.env.CLOUD_SERVER_URL||"https://your-cloud-server.com/api",api_key:process.env.CLOUD_API_KEY||"your-api-key",sync_interval:parseInt(process.env.SYNC_INTERVAL||"300"),retry_attempts:parseInt(process.env.RETRY_ATTEMPTS||"3"),timeout:parseInt(process.env.TIMEOUT||"30000"),enable_auto_sync:!0,enable_offline_mode:!0,max_offline_records:1e3};return s.status(200).json({success:!0,data:e})}return s.status(200).json({success:!0,data:e[0]})}if("POST"===e.method){let{server_url:t,api_key:r,sync_interval:n,retry_attempts:a,timeout:u,enable_auto_sync:i,enable_offline_mode:o,max_offline_records:d}=e.body;if(!t||!r)return s.status(400).json({success:!1,message:"Server URL and API key are required"});if(n<60||n>3600)return s.status(400).json({success:!1,message:"Sync interval must be between 60 and 3600 seconds"});if(a<1||a>10)return s.status(400).json({success:!1,message:"Retry attempts must be between 1 and 10"});if(u<5e3||u>12e4)return s.status(400).json({success:!1,message:"Timeout must be between 5000 and 120000 milliseconds"});if(d<100||d>1e4)return s.status(400).json({success:!1,message:"Max offline records must be between 100 and 10000"});await c.$executeRaw`
        CREATE TABLE IF NOT EXISTS cloud_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          server_url VARCHAR(255) NOT NULL,
          api_key VARCHAR(255) NOT NULL,
          sync_interval INT NOT NULL DEFAULT 300,
          retry_attempts INT NOT NULL DEFAULT 3,
          timeout INT NOT NULL DEFAULT 30000,
          enable_auto_sync BOOLEAN NOT NULL DEFAULT TRUE,
          enable_offline_mode BOOLEAN NOT NULL DEFAULT TRUE,
          max_offline_records INT NOT NULL DEFAULT 1000,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `,await c.$executeRaw`
        INSERT INTO cloud_config (
          server_url, api_key, sync_interval, retry_attempts, timeout,
          enable_auto_sync, enable_offline_mode, max_offline_records
        ) VALUES (
          ${t}, ${r}, ${n}, ${a}, ${u},
          ${i}, ${o}, ${d}
        )
      `;let l=await c.$queryRaw`
        SELECT * FROM cloud_config ORDER BY created_at DESC LIMIT 1
      `;return s.status(201).json({success:!0,message:"Cloud configuration saved successfully",data:l[0]})}if("PUT"===e.method){let{id:t}=e.query,{server_url:r,api_key:n,sync_interval:a,retry_attempts:u,timeout:i,enable_auto_sync:o,enable_offline_mode:d,max_offline_records:l}=e.body;if(!t)return s.status(400).json({success:!1,message:"Configuration ID is required"});if(!r||!n)return s.status(400).json({success:!1,message:"Server URL and API key are required"});await c.$executeRaw`
        UPDATE cloud_config SET
          server_url = ${r},
          api_key = ${n},
          sync_interval = ${a},
          retry_attempts = ${u},
          timeout = ${i},
          enable_auto_sync = ${o},
          enable_offline_mode = ${d},
          max_offline_records = ${l},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${parseInt(t)}
      `;let f=await c.$queryRaw`
        SELECT * FROM cloud_config WHERE id = ${parseInt(t)}
      `;if(0===f.length)return s.status(404).json({success:!1,message:"Configuration not found"});return s.status(200).json({success:!0,message:"Cloud configuration updated successfully",data:f[0]})}if("DELETE"===e.method){let{id:t}=e.query;if(!t)return s.status(400).json({success:!1,message:"Configuration ID is required"});return await c.$executeRaw`
        DELETE FROM cloud_config WHERE id = ${parseInt(t)}
      `,s.status(200).json({success:!0,message:"Cloud configuration deleted successfully"})}return s.status(405).json({success:!1,message:"Method not allowed"})}catch(e){return s.status(500).json({success:!1,message:"Internal server error"})}finally{await c.$disconnect()}}let l=(0,o.c)(d),f=(0,u.l)(r,"default"),E=(0,u.l)(r,"config"),T=new n.PagesAPIRouteModule({definition:{kind:a.x.PAGES_API,page:"/api/devices/cloud-config",pathname:"/api/devices/cloud-config",bundlePath:"",filename:""},userland:r})},3382:(e,s,t)=>{t.d(s,{Q:()=>a,c:()=>u});var r=t(9344),n=t.n(r);function a(e,s){return async(t,r)=>{try{let a=t.headers.authorization;if(!a||!a.startsWith("Bearer "))return r.status(401).json({message:"No token provided"});let u=a.substring(7),i=n().verify(u,"afms-production-jwt-secret-key-2024-ultra-secure-random-string-xyz789");if(!i||!i.id)return r.status(401).json({message:"Token tidak valid"});if(t.user={id:i.id,userId:parseInt(i.id)||1,email:i.email||"",name:i.name||"",role:i.role||"admin"},s&&!(Array.isArray(s)?s:[s]).includes(t.user.role))return r.status(403).json({message:"Insufficient permissions"});return await e(t,r)}catch(e){return r.status(401).json({message:"Token tidak valid"})}}}function u(e){return a(e,"admin")}},7153:(e,s)=>{var t;Object.defineProperty(s,"x",{enumerable:!0,get:function(){return t}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(t||(t={}))},1802:(e,s,t)=>{e.exports=t(145)}};var s=require("../../../webpack-api-runtime.js");s.C(e);var t=s(s.s=5484);module.exports=t})();