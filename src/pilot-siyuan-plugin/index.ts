import { SiyuanPlugin } from "~/libs/siyuanPlugin"
import.meta.hot

/** Vite dev server 地址，与 pilot bridge.js 中的保持一致 */
const DEV_SERVER = "http://localhost:5173"

export default class PilotPlugin extends SiyuanPlugin {
  async onload() {
    const bridgeUrl = `${DEV_SERVER}/.pilot/bridge.js`
    const response = await fetch(bridgeUrl)
    if (!response.ok) {
      console.warn("[Pilot] bridge.js not found — run `pnpm dev` first")
      return
    }
    const code = await response.text()
    const script = document.createElement("script")
    script.textContent = code
    document.head.appendChild(script)
    console.log("[Pilot] bridge.js injected from dev server")
  }
}
