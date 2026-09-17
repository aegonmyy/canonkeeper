/** Free pre-flight: pricing for the cheap models + current spend cap. No renders. */
import { callTool } from "../server/livepeer.js";

const pricing = await callTool("get_pricing", { name: "flux-schnell" });
console.log("flux-schnell pricing:", JSON.stringify(pricing).slice(0, 400));

const cap = await callTool("spend_cap", { action: "read" });
console.log("spend cap state:", JSON.stringify(cap).slice(0, 400));
