module.exports = {
    apps: [
      {
        name: "nextjs-app",
        script: "node",
        args: ".next/standalone/server.js",
        cwd: "C:\\inetpub\\wwwroot\\PLM_webApplication_app",
        env: {
          NODE_ENV: "production",
          PORT: 3000
        }
      }
    ]
  };