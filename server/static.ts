import express, { type Express, type Response } from "express";
import fs from "fs";
import path from "path";

const HASHED_ASSET_PATTERN = /-[A-Za-z0-9_-]{8,}\./;

function setNoStoreHeaders(res: Response) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      const relativePath = path.relative(distPath, filePath).replace(/\\/g, "/");

      if (relativePath === "index.html") {
        setNoStoreHeaders(res);
        return;
      }

      const isHashedAsset = relativePath.startsWith("assets/") && HASHED_ASSET_PATTERN.test(path.basename(relativePath));
      if (isHashedAsset) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return;
      }

      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    },
  }));

  app.use("/{*path}", (_req, res) => {
    setNoStoreHeaders(res);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
