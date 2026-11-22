// Local preview: runs dist/worker.js under Node on http://localhost:8787 with fake edge data.
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const { default: worker } = await import(pathToFileURL(resolve("dist/worker.js")).href);
createServer(async (req, res) => {
  const request = new Request(`http://localhost:8787${req.url}`, { method: req.method, headers: req.headers });
  Object.defineProperty(request, "cf", { value: { city: "Pasadena", region: "California", country: "US", latitude: "34.15", longitude: "-118.14", colo: "LAX", httpProtocol: "HTTP/3", tlsVersion: "TLSv1.3" } });
  const r = await worker.fetch(request);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(r.body ? Buffer.from(await r.arrayBuffer()) : undefined);
}).listen(8787, () => console.log("preview on http://localhost:8787"));
