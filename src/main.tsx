import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { SettingsProvider } from '@/app/providers/SettingsProvider'
import { ToastProvider } from '@/app/providers/ToastProvider'
import { UiProvider } from '@/app/providers/UiProvider'
import { WorkspaceProvider } from '@/app/providers/WorkspaceProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ToastProvider>
        <WorkspaceProvider>
          <UiProvider>
            <RouterProvider router={router} />
          </UiProvider>
        </WorkspaceProvider>
      </ToastProvider>
    </SettingsProvider>
  </StrictMode>,
)
