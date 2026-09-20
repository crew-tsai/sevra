/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as crisisCommunication } from './crisis-communication.tsx'
import { template as crisisAlert } from './crisis-alert.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'crisis-communication': crisisCommunication,
  // Sent by a workflow rule when a crisis is detected; see _shared/workflow-engine.ts.
  'crisis-alert': crisisAlert,
}
