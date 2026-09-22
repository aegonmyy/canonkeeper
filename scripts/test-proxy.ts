import { SocksProxyAgent } from "socks-proxy-agent";
import nodeFetch from "node-fetch";
const agent = new SocksProxyAgent("socks5://127.0.0.1:9050");
const res = await nodeFetch("https://api.ipify.org", { agent });
const ip = await res.text();
console.log("IP through proxy:", ip);
