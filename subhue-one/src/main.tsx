import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo/standard.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './styles.css'
import App from './App'

const params = new URLSearchParams(location.search)
const root = createRoot(document.getElementById('root')!)

if (params.has('capture')) {
  // Poster capture mode: renders one fixed shot for scripts/capture.mjs.
  import('./Capture').then(({ default: Capture }) => root.render(<Capture params={params} />))
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
